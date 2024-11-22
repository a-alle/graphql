/*
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { ASTVisitor, ObjectTypeDefinitionNode, TypeNode } from "graphql";
import { Kind } from "graphql";
import type { SDLValidationContext } from "graphql/validation/ValidationContext";
import {
    cypherDirective,
    nodeDirective,
    relationshipDirective,
    relationshipPropertiesDirective,
} from "../../../../graphql/directives";

import { assertValid, createGraphQLError, DocumentValidationError } from "../utils/document-validation-error";
import { getInnerTypeName } from "../utils/utils";

/**
 * Validates that list types used in type annotated with the node directive are supported by Neo4j
 **/
export function ValidListInNodeType(context: SDLValidationContext): ASTVisitor {
    return {
        ObjectTypeDefinition(objectTypeDefinitionNode: ObjectTypeDefinitionNode, _key, _parent) {
            const { directives } = objectTypeDefinitionNode;

            const nodeUsage = directives?.find((directive) => directive.name.value === nodeDirective.name);
            const relationshipPropertiesUsage = directives?.find(
                (directive) => directive.name.value === relationshipPropertiesDirective.name
            );
            if (!directives || (!nodeUsage && !relationshipPropertiesUsage)) {
                return; // Skip non-node types or relationshipProperties types
            }

            objectTypeDefinitionNode.fields?.forEach((fieldDefinitionNode) => {
                const { type, directives } = fieldDefinitionNode;
                if (
                    directives &&
                    directives.some(
                        (directive) =>
                            directive.name.value === cypherDirective.name ||
                            directive.name.value === relationshipDirective.name
                    )
                ) {
                    return; // Skip cypher fields and relationship fields, relationship fields have their own validation
                }
                const { isValid, errorMsg, errorPath } = assertValid(() => {
                    const typePath = getTypePath(type);
                    if (typePath.includes(Kind.LIST_TYPE)) {
                        const wrappedType = getInnerTypeName(type);
                        const validTypePaths: TypePath[] = [
                            [Kind.LIST_TYPE, Kind.NON_NULL_TYPE, wrappedType],
                            [Kind.NON_NULL_TYPE, Kind.LIST_TYPE, Kind.NON_NULL_TYPE, wrappedType],
                        ];
                        if (!findTypePathInTypePaths(typePath, validTypePaths)) {
                            const typeStr = typeNodeToString(type);

                            const directiveName = (nodeUsage ?? relationshipPropertiesUsage)?.name?.value;
                            throw new DocumentValidationError(
                                `List of nullable elements are not supported in "@${directiveName}" types. Found: ${typeStr}`,
                                []
                            );
                        }
                    }
                });

                if (!isValid) {
                    context.reportError(
                        createGraphQLError({
                            nodes: [fieldDefinitionNode],
                            path: [objectTypeDefinitionNode.name.value, fieldDefinitionNode.name.value, ...errorPath],
                            errorMsg,
                        })
                    );
                }
            });
        },
    };
}

type TypePath = (string | Kind.LIST_TYPE | Kind.NON_NULL_TYPE)[];

function typeNodeToString(typeNode: TypeNode): string {
    if (typeNode.kind === Kind.NON_NULL_TYPE) {
        return `${typeNodeToString(typeNode.type)}!`;
    } else if (typeNode.kind === Kind.LIST_TYPE) {
        return `[${typeNodeToString(typeNode.type)}]`;
    }
    return typeNode.name.value;
}

function getTypePath(typeNode: TypeNode, currentPath: TypePath = []): TypePath {
    if (typeNode.kind === Kind.NON_NULL_TYPE || typeNode.kind === Kind.LIST_TYPE) {
        return getTypePath(typeNode.type, [...currentPath, typeNode.kind]);
    }
    return [...currentPath, typeNode.name.value];
}

function findTypePathInTypePaths(typePathToFind: TypePath, typePaths: TypePath[]): boolean {
    const typePathString = typePathToFind.join();
    return typePaths.some((typePath) => typePathString === typePath.join());
}

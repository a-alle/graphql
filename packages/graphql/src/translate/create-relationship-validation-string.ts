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

import type { RelationField } from "../../dist";
import type { Node } from "../classes";
import { RELATIONSHIP_REQUIREMENT_PREFIX } from "../constants";
import type { Context } from "../types";

function createRelationshipValidationString({
    node,
    context,
    varName,
    relationshipFieldNotOverwritable,
}: {
    node: Node;
    context: Context;
    varName: string;
    relationshipFieldNotOverwritable?: string;
}): string {
    const strs: string[] = [];

    node.relationFields.forEach((field) => {
        const isArray = field.typeMeta.array;
        const isUnionOrInterface = Boolean(field.union) || Boolean(field.interface);
        if (isUnionOrInterface) {
            return;
        }

        const toNode = context.nodes.find((n) => n.name === field.typeMeta.name) as Node;
        const toField = toNode.relationFields.find((r) => r.type === field.type);

        const isFieldNotOverwritable = relationshipFieldNotOverwritable === field.fieldName;
        const isToFieldNotOverwritable = Boolean(
            toField && toField.typeMeta.array && relationshipFieldNotOverwritable === toField.fieldName
        );

        const shouldCheckForDuplicates = isFieldNotOverwritable || isToFieldNotOverwritable;
        if (isArray && !shouldCheckForDuplicates) {
            return;
        }

        const { predicate, errorMsg } = makeValidation({
            sourceNodeName: node.name,
            sourceRelationshipField: field,
            destinationNodeName: toNode.name,
            destinationRelationshipFieldName: toField?.fieldName,
            shouldReverseNodesInErrorMessage: isToFieldNotOverwritable,
        });

        strs.push(
            makeSubquery({
                varName,
                sourceRelationshipField: field,
                destinationNodeName: toNode.name,
                destinationNodeLabels: toNode.getLabelString(context),
                validateStatement: `CALL apoc.util.validate(NOT (${predicate}), '${errorMsg}', [0])`,
                alias: isArray ? "other" : undefined,
            })
        );
    });

    return strs.join("\n");
}

function makeValidation({
    sourceNodeName,
    sourceRelationshipField,
    destinationNodeName,
    destinationRelationshipFieldName,
    shouldReverseNodesInErrorMessage,
}: {
    sourceNodeName: string;
    destinationNodeName: string;
    sourceRelationshipField: RelationField;
    destinationRelationshipFieldName: string | undefined;
    shouldReverseNodesInErrorMessage: boolean;
}): { predicate: string; errorMsg: string } {
    // destination node for operation (the one the operation is applied to) is validated first
    // validation of destination node happens right after the operation, while validation of source node happens at the end of the cypher query
    // for ease of understanding and readability, return error message with format: source -> destination as defined in the operation
    if (shouldReverseNodesInErrorMessage) {
        return {
            predicate: `c = 1`,
            errorMsg: `${RELATIONSHIP_REQUIREMENT_PREFIX}${destinationNodeName}.${destinationRelationshipFieldName} required exactly once for a specific ${sourceNodeName}`,
        };
    }

    // for array will only end up here if target for duplicate relationships validation
    if (sourceRelationshipField.typeMeta.array) {
        return {
            predicate: `c = 1`,
            errorMsg: `${RELATIONSHIP_REQUIREMENT_PREFIX}${sourceNodeName}.${sourceRelationshipField.fieldName} required exactly once for a specific ${destinationNodeName}`,
        };
    }

    if (!sourceRelationshipField.typeMeta.required) {
        return {
            predicate: `c <= 1`,
            errorMsg: `${RELATIONSHIP_REQUIREMENT_PREFIX}${sourceNodeName}.${sourceRelationshipField.fieldName} must be less than or equal to one`,
        };
    }

    return {
        predicate: `c = 1`,
        errorMsg: `${RELATIONSHIP_REQUIREMENT_PREFIX}${sourceNodeName}.${sourceRelationshipField.fieldName} required exactly once`,
    };
}

function makeSubquery({
    varName,
    sourceRelationshipField,
    destinationNodeName,
    destinationNodeLabels,
    validateStatement,
    alias,
}: {
    varName: string;
    sourceRelationshipField: RelationField;
    destinationNodeName: string;
    destinationNodeLabels: string;
    validateStatement: string;
    alias: string | undefined;
}): string {
    const inStr = sourceRelationshipField.direction === "IN" ? "<-" : "-";
    const outStr = sourceRelationshipField.direction === "OUT" ? "->" : "-";
    const relVarname = `${varName}_${sourceRelationshipField.fieldName}_${destinationNodeName}_unique`;
    return [
        `CALL {`,
        `\tWITH ${varName}`,
        `\tMATCH (${varName})${inStr}[${relVarname}:${sourceRelationshipField.type}]${outStr}(${
            alias ? alias : ""
        }${destinationNodeLabels})`,
        `\tWITH count(${relVarname}) as c${alias ? `, ${alias}` : ""}`,
        `\t${validateStatement}`,
        `\tRETURN c AS ${relVarname}_ignored`,
        `}`,
    ].join("\n");
}

export default createRelationshipValidationString;

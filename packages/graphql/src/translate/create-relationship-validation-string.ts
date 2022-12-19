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
    overwrite,
}: {
    node: Node;
    context: Context;
    varName: string;
    overwrite?: string;
}): string {
    const strs: string[] = [];

    node.relationFields.forEach((field) => {
        const isArray = field.typeMeta.array;
        const isUnionOrInterface = Boolean(field.union) || Boolean(field.interface);

        if (isUnionOrInterface) {
            const concreteTypes: string[] = [];
            if (field.union) {
                concreteTypes.push(...(field.union?.nodes || []));
            }
            if (field.interface) {
                concreteTypes.push(...(field.interface?.implementations || []));
            }
            const toNodes = context.nodes.filter((n) => concreteTypes.includes(n.name));
            const matchClause =
                `\tMATCH ` +
                toNodes
                    .map(
                        (toNode, i) =>
                            `(${varName})${inStr}[${relVarname}_${i}:${field.type}]${outStr}(${toNode.getLabelString(
                                context
                            )})`
                    )
                    .join(",");
            const withClause = `\tWITH ` + toNodes.map((_, i) => `count(${relVarname}_${i})`).join("+") + `as c`;
            // use match and with clauses to make the subquery
            return;
        }

        const toNode = context.nodes.find((n) => n.name === field.typeMeta.name) as Node;
        const inStr = field.direction === "IN" ? "<-" : "-";
        const outStr = field.direction === "OUT" ? "->" : "-";
        const relVarname = `${varName}_${field.fieldName}_${toNode.name}_unique`;

        let predicate: string;
        let errorMsg: string;
        let subQuery: string | undefined;
        if (isArray) {
            if (overwrite === field.fieldName) {
                predicate = `c = 1`;
                errorMsg = `${RELATIONSHIP_REQUIREMENT_PREFIX}${node.name}.${field.fieldName} required exactly once for a specific ${toNode.name}`;
                subQuery = [
                    `CALL {`,
                    `\tWITH ${varName}`,
                    `\tMATCH (${varName})${inStr}[${relVarname}:${field.type}]${outStr}(other${toNode.getLabelString(
                        context
                    )})`,
                    `\tWITH count(${relVarname}) as c, other`,
                    `\tCALL apoc.util.validate(NOT (${predicate}), '${errorMsg}', [0])`,
                    `\tRETURN collect(c) AS ${relVarname}_ignored`,
                    `}`,
                ].join("\n");
            }
        } else {
            predicate = `c = 1`;
            errorMsg = `${RELATIONSHIP_REQUIREMENT_PREFIX}${node.name}.${field.fieldName} required exactly once`;
            if (!field.typeMeta.required) {
                predicate = `c <= 1`;
                errorMsg = `${RELATIONSHIP_REQUIREMENT_PREFIX}${node.name}.${field.fieldName} must be less than or equal to one`;
            }

            subQuery = [
                `CALL {`,
                `\tWITH ${varName}`,
                `\tMATCH (${varName})${inStr}[${relVarname}:${field.type}]${outStr}(${toNode.getLabelString(context)})`,
                `\tWITH count(${relVarname}) as c`,
                `\tCALL apoc.util.validate(NOT (${predicate}), '${errorMsg}', [0])`,
                `\tRETURN c AS ${relVarname}_ignored`,
                `}`,
            ].join("\n");
        }

        if (subQuery) {
            strs.push(subQuery);
        }
    });

    return strs.join("\n");
}

// WIP
function makeValidationString({
    field,
    toNodeLabel,
    toNodeName,
    varName,
    predicate,
    errorMsg,
}: {
    field: RelationField;
    toNodeLabel: string;
    toNodeName: string;
    varName: string;
    predicate: string;
    errorMsg: string;
}): string {
    const inStr = field.direction === "IN" ? "<-" : "-";
    const outStr = field.direction === "OUT" ? "->" : "-";
    const relVarname = `${varName}_${field.fieldName}_${toNodeName}_unique`;

    return [
        `CALL {`,
        `\tWITH ${varName}`,
        `\tMATCH (${varName})${inStr}[${relVarname}:${field.type}]${outStr}(other${toNodeLabel})`,
        `\tWITH count(${relVarname}) as c, other`,
        `\tCALL apoc.util.validate(NOT (${predicate}), '${errorMsg}', [0])`,
        `\tRETURN collect(c) AS ${relVarname}_ignored`,
        `}`,
    ].join("\n");
}

export default createRelationshipValidationString;

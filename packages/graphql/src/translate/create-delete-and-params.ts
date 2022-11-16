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

import type { Node, Relationship } from "../classes";
import type { Context } from "../types";
import { createAuthAndParams } from "./create-auth-and-params";
import createConnectionWhereAndParams from "./where/create-connection-where-and-params";
import { AUTH_FORBIDDEN_ERROR, META_CYPHER_VARIABLE } from "../constants";
import { createEventMetaObject } from "./subscriptions/create-event-meta";
import { filterMetaVariable } from "./subscriptions/filter-meta-variable";

interface Res {
    strs: string[];
    params: any;
}

function createDeleteAndParams({
    deleteInput,
    varName,
    node,
    parentVar,
    chainStr,
    withVars,
    context,
    insideDoWhen,
    parameterPrefix,
    recursing,
}: {
    parentVar: string;
    deleteInput: any;
    varName: string;
    chainStr?: string;
    node: Node;
    withVars: string[];
    context: Context;
    insideDoWhen?: boolean;
    parameterPrefix: string;
    recursing?: boolean;
}): [string, any] {
    function reducer(res: Res, [key, value]: [string, any]) {
        const relationField = node.relationFields.find((x) => key === x.fieldName);

        if (relationField) {
            const refNodes: Node[] = [];

            const relationship = context.relationships.find(
                (x) => x.properties === relationField.properties
            ) as unknown as Relationship;

            if (relationField.union) {
                Object.keys(value).forEach((unionTypeName) => {
                    refNodes.push(context.nodes.find((x) => x.name === unionTypeName) as Node);
                });
            } else if (relationField.interface) {
                relationField.interface.implementations?.forEach((implementationName) => {
                    refNodes.push(context.nodes.find((x) => x.name === implementationName) as Node);
                });
            } else {
                refNodes.push(context.nodes.find((x) => x.name === relationField.typeMeta.name) as Node);
            }

            const inStr = relationField.direction === "IN" ? "<-" : "-";
            const outStr = relationField.direction === "OUT" ? "->" : "-";

            refNodes.forEach((refNode) => {
                const v = relationField.union ? value[refNode.name] : value;
                const deletes = relationField.typeMeta.array ? v : [v];
                deletes.forEach((d, index) => {
                    const variableName = chainStr
                        ? `${varName}${index}`
                        : `${varName}_${key}${
                              relationField.union || relationField.interface ? `_${refNode.name}` : ""
                          }${index}`;
                    const relationshipVariable = `${variableName}_relationship`;
                    const relTypeStr = `[${relationshipVariable}:${relationField.type}]`;

                    const whereStrs: string[] = [];
                    if (d.where) {
                        try {
                            const whereAndParams = createConnectionWhereAndParams({
                                nodeVariable: variableName,
                                whereInput: d.where,
                                node: refNode,
                                context,
                                relationshipVariable,
                                relationship,
                                parameterPrefix: `${parameterPrefix}${!recursing ? `.${key}` : ""}${
                                    relationField.union ? `.${refNode.name}` : ""
                                }${relationField.typeMeta.array ? `[${index}]` : ""}.where`,
                            });
                            if (whereAndParams[0]) {
                                whereStrs.push(whereAndParams[0]);
                                res.params = { ...res.params, ...whereAndParams[1] };
                            }
                        } catch {
                            return;
                        }
                    }

                    const varsWithoutMeta = filterMetaVariable(withVars).join(", ");
                    res.strs.push("WITH *");
                    res.strs.push("CALL {");

                    if (withVars) {
                        if (context.subscriptionsEnabled) {
                            res.strs.push(`WITH ${varsWithoutMeta}`);
                            res.strs.push(`WITH ${varsWithoutMeta}, []  AS meta`);
                        } else {
                            res.strs.push(`WITH ${withVars.join(", ")}`);
                        }
                    }
                    if (!withVars && context.subscriptionsEnabled) {
                        res.strs.push(`WITH *`);
                        res.strs.push(`WITH *, []  AS meta`);
                    }

                    const labels = refNode.getLabelString(context);
                    res.strs.push(
                        `OPTIONAL MATCH (${parentVar})${inStr}${relTypeStr}${outStr}(${variableName}${labels})`
                    );

                    const whereAuth = createAuthAndParams({
                        operations: "DELETE",
                        entity: refNode,
                        context,
                        where: { varName: variableName, node: refNode },
                    });
                    if (whereAuth[0]) {
                        whereStrs.push(whereAuth[0]);
                        res.params = { ...res.params, ...whereAuth[1] };
                    }
                    if (whereStrs.length) {
                        res.strs.push(`WHERE ${whereStrs.join(" AND ")}`);
                    }

                    const allowAuth = createAuthAndParams({
                        entity: refNode,
                        operations: "DELETE",
                        context,
                        escapeQuotes: Boolean(insideDoWhen),
                        allow: { parentNode: refNode, varName: variableName },
                    });
                    if (allowAuth[0]) {
                        const quote = insideDoWhen ? `\\"` : `"`;
                        res.strs.push(
                            `WITH ${varsWithoutMeta}, ${variableName}, ${relationshipVariable}${
                                context.subscriptionsEnabled ? ", meta" : ""
                            }`
                        );
                        res.strs.push(
                            `CALL apoc.util.validate(NOT (${allowAuth[0]}), ${quote}${AUTH_FORBIDDEN_ERROR}${quote}, [0])`
                        );
                        res.params = { ...res.params, ...allowAuth[1] };
                    }

                    if (d.delete) {
                        const nestedDeleteInput = Object.entries(d.delete)
                            .filter(([k]) => {
                                if (k === "_on") {
                                    return false;
                                }

                                if (relationField.interface && d.delete?._on?.[refNode.name]) {
                                    const onArray = Array.isArray(d.delete._on[refNode.name])
                                        ? d.delete._on[refNode.name]
                                        : [d.delete._on[refNode.name]];
                                    if (onArray.some((onKey) => Object.prototype.hasOwnProperty.call(onKey, k))) {
                                        return false;
                                    }
                                }

                                return true;
                            })
                            .reduce((d1, [k1, v1]) => ({ ...d1, [k1]: v1 }), {});

                        const deleteAndParams = createDeleteAndParams({
                            context,
                            node: refNode,
                            deleteInput: nestedDeleteInput,
                            varName: variableName,
                            withVars: [...filterMetaVariable(withVars), variableName, relationshipVariable],
                            parentVar: variableName,
                            parameterPrefix: `${parameterPrefix}${!recursing ? `.${key}` : ""}${
                                relationField.union ? `.${refNode.name}` : ""
                            }${relationField.typeMeta.array ? `[${index}]` : ""}.delete`,
                            recursing: false,
                        });
                        res.strs.push(deleteAndParams[0]);
                        res.params = { ...res.params, ...deleteAndParams[1] };

                        if (relationField.interface && d.delete?._on?.[refNode.name]) {
                            const onDeletes = Array.isArray(d.delete._on[refNode.name])
                                ? d.delete._on[refNode.name]
                                : [d.delete._on[refNode.name]];

                            onDeletes.forEach((onDelete, onDeleteIndex) => {
                                const onDeleteAndParams = createDeleteAndParams({
                                    context,
                                    node: refNode,
                                    deleteInput: onDelete,
                                    varName: variableName,
                                    withVars: [...filterMetaVariable(withVars), variableName, relationshipVariable],
                                    parentVar: variableName,
                                    parameterPrefix: `${parameterPrefix}${!recursing ? `.${key}` : ""}${
                                        relationField.union ? `.${refNode.name}` : ""
                                    }${relationField.typeMeta.array ? `[${index}]` : ""}.delete._on.${
                                        refNode.name
                                    }[${onDeleteIndex}]`,
                                    recursing: false,
                                });
                                res.strs.push(onDeleteAndParams[0]);
                                res.params = { ...res.params, ...onDeleteAndParams[1] };
                            });
                        }
                    }

                    const nodeToDelete = `${variableName}_to_delete`;
                    if (context.subscriptionsEnabled) {
                        const metaObjectStr = createEventMetaObject({
                            event: "delete",
                            nodeVariable: "x",
                            typename: refNode.name,
                        });

                        //  need relationshipVariable for disconnect meta
                        const statements = [
                            `WITH ${varsWithoutMeta}, meta, ${relationshipVariable}, collect(DISTINCT ${variableName}) AS ${nodeToDelete}`,
                            "CALL {",
                            `\tWITH ${relationshipVariable}, ${nodeToDelete}, ${varsWithoutMeta}`,
                            `\tUNWIND ${nodeToDelete} AS x`,
                            `\tWITH ${metaObjectStr} AS node_meta, x, ${relationshipVariable}, ${varsWithoutMeta}`,
                            `\tDETACH DELETE x`,
                            `\tRETURN collect(node_meta) AS delete_meta`,
                            `}`,
                            `WITH collect(delete_meta) AS delete_meta, meta`,
                            `RETURN REDUCE(m=meta, n IN delete_meta | m + n) AS delete_meta`,
                            `}`,
                            `WITH ${varsWithoutMeta}, meta, collect(delete_meta) AS delete_meta`,
                            `WITH ${varsWithoutMeta}, REDUCE(m=meta, n IN delete_meta | m + n) AS meta`,
                        ];

                        res.strs.push(...statements);
                    } else {
                        const statements = [
                            `WITH ${relationshipVariable}, collect(DISTINCT ${variableName}) AS ${nodeToDelete}`,
                            "CALL {",
                            `\tWITH ${nodeToDelete}`,
                            `\tUNWIND ${nodeToDelete} AS x`,
                            `\tDETACH DELETE x`,
                            `\tRETURN count(*) AS _`,
                            `}`,
                            `RETURN count(*) AS _${relationshipVariable}`,
                            `}`,
                        ];
                        res.strs.push(...statements);
                    }
                });
            });

            return res;
        }

        return res;
    }

    const { strs, params } = Object.entries(deleteInput).reduce(reducer, { strs: [], params: {} });

    return [strs.join("\n"), params];
}

export default createDeleteAndParams;

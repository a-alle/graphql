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

import type { ResolveTree } from "graphql-parse-resolve-info";
import { AUTH_FORBIDDEN_ERROR } from "../../constants";
import { createAuthAndParams, createAuthPredicates } from "../create-auth-and-params";
import type { Context } from "../../types";
import type { Node } from "../../classes";
import Cypher from "@neo4j/cypher-builder";

export type AggregationAuth = {
    params: Record<string, string>;
    whereQuery: string;
};

type PartialAuthQueries = {
    queries: string[];
    params: Record<string, string>;
};

export function createFieldAggregationAuth({
    node,
    context,
    subqueryNodeAlias,
    nodeFields,
}: {
    node: Node;
    context: Context;
    subqueryNodeAlias: Cypher.Node;
    nodeFields: Record<string, ResolveTree> | undefined;
}): Cypher.Predicate | undefined {
    const allowAuth = getAllowAuth({ node, context, varName: subqueryNodeAlias });
    const whereAuth = getWhereAuth({ node, context, varName: subqueryNodeAlias });
    const nodeAuth = getFieldAuth({ fields: nodeFields, node, context, varName: subqueryNodeAlias });

    const authPredicates: Cypher.Predicate[] = [];

    if (allowAuth) authPredicates.push(allowAuth);
    if (whereAuth) authPredicates.push(whereAuth);
    if (nodeAuth) authPredicates.push(nodeAuth);

    return Cypher.and(...authPredicates);

    // const cypherStrs = [...nodeAuth.queries, ...allowAuth.queries, ...whereAuth.queries];
    // const cypherParams = { ...nodeAuth.params, ...allowAuth.params, ...whereAuth.params };

    // return { params: cypherParams, whereQuery: cypherStrs.join(" AND\n") };
}

function getAllowAuth({
    node,
    context,
    varName,
}: {
    node: Node;
    context: Context;
    varName: Cypher.Node;
}): Cypher.Predicate | undefined {
    // const allowAuth = createAuthAndParams({
    //     operations: "READ",
    //     entity: node,
    //     context,
    //     allow: {
    //         parentNode: node,
    //         varName,
    //     },
    //     escapeQuotes: false,
    // });

    // if (allowAuth[0]) {
    //     return {
    //         queries: [`apoc.util.validatePredicate(NOT (${allowAuth[0]}), "${AUTH_FORBIDDEN_ERROR}", [0])`],
    //         params: allowAuth[1],
    //     };
    // }

    const allowAuth = createAuthPredicates({
        entity: node,
        operations: "READ",
        context,
        allow: { parentNode: node, varName },
        escapeQuotes: false,
    });

    if (allowAuth) return new Cypher.apoc.ValidatePredicate(Cypher.not(allowAuth), AUTH_FORBIDDEN_ERROR);

    return undefined;
}

function getWhereAuth({
    node,
    context,
    varName,
}: {
    node: Node;
    context: Context;
    varName: Cypher.Node;
}): Cypher.Predicate | undefined {
    // const whereAuth = createAuthAndParams({
    //     operations: "READ",
    //     entity: node,
    //     context,
    //     where: { varName, node },
    // });

    // if (whereAuth[0]) {
    //     return {
    //         queries: [whereAuth[0]],
    //         params: whereAuth[1],
    //     };
    // }

    // return {
    //     queries: [],
    //     params: {},
    // };

    const allowAuth = createAuthPredicates({
        entity: node,
        operations: "READ",
        context,
        where: { varName, node },
    });

    if (allowAuth) {
        return allowAuth;
    }

    return undefined;
}

function getFieldAuth({
    fields = {},
    node,
    context,
    varName,
}: {
    fields: Record<string, ResolveTree> | undefined;
    node: Node;
    context: Context;
    varName: Cypher.Node;
}): Cypher.Predicate | undefined {
    const authPredicates: Cypher.Predicate[] = [];
    Object.entries(fields).forEach((selection) => {
        const authField = node.authableFields.find((x) => x.fieldName === selection[0]);
        if (authField && authField.auth) {
            // const allowAndParams = createAuthAndParams({
            //     entity: authField,
            //     operations: "READ",
            //     context,
            //     allow: { parentNode: node, varName, chainStr: authField.fieldName },
            //     escapeQuotes: false,
            // });
            // if (allowAndParams[0]) {
            //     // authPredicates.push(allowAndParams[0]);
            // }
            const allowAuth = createAuthPredicates({
                entity: authField,
                operations: "READ",
                context,
                allow: { parentNode: node, varName, chainStr: authField.fieldName },
                escapeQuotes: false,
            });

            if (allowAuth) authPredicates.push(allowAuth);
        }
    });

    if (authPredicates.length > 0) {
        return new Cypher.apoc.ValidatePredicate(Cypher.not(Cypher.and(...authPredicates)), AUTH_FORBIDDEN_ERROR);
        // return {
        //     queries: [
        //         `apoc.util.validatePredicate(NOT (${authPredicates.join(" AND ")}), "${AUTH_FORBIDDEN_ERROR}", [0])`,
        //     ],
        //     params: authParams,
        // };
    }
    return undefined;
}

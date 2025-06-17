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

import { Neo4jGraphQLError } from "../../../../classes";
import { AUTHORIZATION_UNAUTHENTICATED } from "../../../../constants";
import type {
    AuthenticationAnnotation,
    AuthenticationOperation,
} from "../../../../schema-model/annotation/AuthenticationAnnotation";
import type { Attribute } from "../../../../schema-model/attribute/Attribute";
import type { AttributeAdapter } from "../../../../schema-model/attribute/model-adapters/AttributeAdapter";
import type { ConcreteEntity } from "../../../../schema-model/entity/ConcreteEntity";
import type { ConcreteEntityAdapter } from "../../../../schema-model/entity/model-adapters/ConcreteEntityAdapter";
import { filterByValues } from "../../../../translate/authorization/utils/filter-by-values";
import { Neo4jFeaturesSettings } from "../../../../types";
import type { Neo4jGraphQLComposedSubscriptionsContext } from "../../composition/wrap-subscription";

export async function checkAuthentication({
    authenticated,
    operation,
    context,
    features,
}: {
    authenticated: ConcreteEntity | Attribute | ConcreteEntityAdapter | AttributeAdapter;
    operation: AuthenticationOperation;
    context: Neo4jGraphQLComposedSubscriptionsContext;
    features: Neo4jFeaturesSettings | undefined;
}) {
    const schemaLevelAnnotation = context.schemaModel.annotations.authentication;
    if (schemaLevelAnnotation && schemaLevelAnnotation.operations.has(operation)) {
        await applyAuthentication(schemaLevelAnnotation, context, features);
    }
    const annotation = authenticated.annotations.authentication;
    if (annotation && annotation.operations.has(operation)) {
        await applyAuthentication(annotation, context, features);
    }
}

async function applyAuthentication(
    annotation: AuthenticationAnnotation,
    context: Neo4jGraphQLComposedSubscriptionsContext,
    features: Neo4jFeaturesSettings | undefined
) {
    if (annotation.callback) {
        if (!features || !features.authentication || !features.authentication.callbacks) {
            throw new Neo4jGraphQLError(`Authentication callbacks not provided.`);
        }
        const callbackFn = features.authentication.callbacks[annotation.callback];
        if (!callbackFn) {
            throw new Neo4jGraphQLError(`Authentication callback "${annotation.callback}" not found.`);
        }
        const callbackResult = await callbackFn();
        if (!callbackResult) {
            throw new Neo4jGraphQLError(AUTHORIZATION_UNAUTHENTICATED);
        }
    } else {
        if (!context.authorization.jwt) {
            throw new Neo4jGraphQLError(AUTHORIZATION_UNAUTHENTICATED);
        }
        if (annotation.jwt) {
            const { jwt, claims } = context.authorization;
            const result = filterByValues(annotation.jwt, jwt, claims);
            if (!result) {
                throw new Neo4jGraphQLError(AUTHORIZATION_UNAUTHENTICATED);
            }
        }
    }
}

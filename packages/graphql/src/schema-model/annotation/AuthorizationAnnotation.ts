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

import type { Attribute } from "../attribute/Attribute";
import type { ConcreteEntity } from "../entity/ConcreteEntity";
import type { Entity } from "../entity/Entity";

/* 
   input UserAuthorizationWhere {
    OR: [UserAuthorizationWhere!]
    AND: [UserAuthorizationWhere!]
    NOT: UserAuthorizationWhere
    jwtPayload: JWTPayloadWhere
    node: UserWhere
  }

  input UserWhere {
    OR: [UserWhere!]
    AND: [UserWhere!]
    NOT: UserWhere
    id: StringWhere
    name: StringWhere
  } 
  
  input StringWhere {
    OR: [StringWhere!]
    AND: [StringWhere!]
    NOT: StringWhere
    equals: String
    in: [String!]
    matches: String
    contains: String
    startsWith: String
    endsWith: String
}
*/

const AUTHORIZATION_OPERATION = ["READ", "UPDATE", "DELETE", "CREATE_RELATIONSHIP", "DELETE_RELATIONSHIP"] as const;

abstract class AuthorizationAnnotation<T extends ConcreteEntity> {
    private filter?: Filter<T>;
    private subscriptionFilter?: SubscriptionFilter;
    private validate?: Validate;
    private parent: Entity | Attribute;

    constructor({
        parent,
        filter,
        subscriptionFilter,
        validate,
    }: {
        parent: Entity | Attribute;
        filter?: Filter<T>;
        subscriptionFilter?: SubscriptionFilter;
        validate?: Validate;
    }) {
        this.parent = parent;
        this.filter = filter;
        this.subscriptionFilter = subscriptionFilter;
        this.validate = validate;
    }
    // ...
}

export class EntityAuthorizationAnnotation<T extends ConcreteEntity> extends AuthorizationAnnotation<T> {
    constructor({
        parent,
        filter,
        subscriptionFilter,
        validate,
    }: {
        parent: Entity | Attribute;
        filter?: Filter<T>;
        subscriptionFilter?: SubscriptionFilter;
        validate?: Validate;
    }) {
        super({ parent, filter, subscriptionFilter, validate });
    }
}

export class AttributeAuthorizationAnnotation<T extends ConcreteEntity> extends AuthorizationAnnotation<T> {
    constructor({
        parent,
        filter,
        subscriptionFilter,
        validate,
    }: {
        parent: Entity | Attribute;
        filter?: Filter<T>;
        subscriptionFilter?: SubscriptionFilter;
        validate?: Validate;
    }) {
        super({ parent, filter, subscriptionFilter, validate });
    }
}

interface IAuthorizationFilter<T> {
    operations: AuthorizationFilterOperation[];
    requireAuthentication: boolean;
    where: AuthorizationWhere<T>;
}

class AuthorizationFilter<T extends ConcreteEntity> implements IAuthorizationFilter<T> {
    operations: AuthorizationFilterOperation[];
    requireAuthentication: boolean;
    where: AuthorizationWhere<T>;

    constructor({
        operations,
        requireAuthentication,
        where,
    }: {
        operations: AuthorizationFilterOperation[];
        requireAuthentication: boolean;
        where: AuthorizationWhere<T>;
    }) {
        this.operations = operations;
        this.requireAuthentication = requireAuthentication;
        this.where = where;
    }
}

interface AuthorizationWhere<T> extends LogicalPredicate<AuthorizationWhere<T>> {
    jwtPayload: JWTPayloadPredicate; // TODO could be this undefined?
    node: UserWhere; // TODO still need to be defined, could be this undefined?
}

class AuthorizationFilterWhere<T extends ConcreteEntity> implements AuthorizationWhere<T> {
    jwtPayload: JWTPayloadPredicate;
    node: UserWhere;

    constructor({ jwtPayload, node }: { jwtPayload: JWTPayloadPredicate; node: UserWhere }) {
        this.jwtPayload = jwtPayload;
        this.node = node;
    }
}

class Filter<T> {
    node: UserWhere;

    constructor({ node }: { node: UserWhere }) {
        this.node = node;
    }
}

type ParsedJWTSchema = Record<string, any>;

interface JWTPayloadPredicate extends LogicalPredicate<JWTPayloadPredicate>, ParsedJWTSchema {}

interface UserWhere extends LogicalPredicate<UserWhere> {
    id: StringPredicate;
    name: StringPredicate;
}

type AuthorizationFilterOperation = keyof typeof AUTHORIZATION_OPERATION;

interface SubscriptionFilter {}

interface Validate {}

interface StringPredicate extends LogicalPredicate<StringPredicate> {
    equals?: string;
    in?: string;
    matches?: string;
    contains?: string;
    startsWith?: string;
    endsWith?: string;
}

interface StringListPredicate extends LogicalPredicate<StringListPredicate> {
    all?: string[];
    some?: string[];
    single?: string[];
}

type LogicalPredicate<T> = {
    OR?: [T];
    AND?: [T];
    NOT?: T;
};

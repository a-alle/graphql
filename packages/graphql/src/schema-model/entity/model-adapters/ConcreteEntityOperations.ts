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

import type { ConcreteEntityAdapter } from "./ConcreteEntityAdapter";
import type { RootTypeFieldNames as ImplementingTypeRootTypeFieldNames } from "./ImplementingEntityOperations";
import { ImplementingEntityOperations } from "./ImplementingEntityOperations";

type RootTypeFieldNames = ImplementingTypeRootTypeFieldNames & {
    connection: string;
    subscribe: {
        created: string;
        updated: string;
        deleted: string;
    };
};

type IndexTypeNames = {
    connection: string;
    edge: string;
    where: string;
    sort: string;
};

export class ConcreteEntityOperations extends ImplementingEntityOperations<ConcreteEntityAdapter> {
    constructor(concreteEntityAdapter: ConcreteEntityAdapter) {
        super(concreteEntityAdapter);
    }

    public get relationshipsSubscriptionWhereInputTypeName(): string {
        return `${this.entityAdapter.name}RelationshipsSubscriptionWhere`;
    }

    // top-level connection type name
    public get connectionFieldTypename(): string {
        return `${this.pascalCasePlural}Connection`;
    }
    // top-level connection edge type name, TODO: find a better name (this is coming from the RelationshipOperations)
    public get relationshipFieldTypename(): string {
        return `${this.entityAdapter.name}Edge`;
    }

    public get rootTypeFieldNames(): RootTypeFieldNames {
        return {
            ...super.rootTypeFieldNames,
            subscribe: {
                created: `${this.entityAdapter.singular}Created`,
                updated: `${this.entityAdapter.singular}Updated`,
                deleted: `${this.entityAdapter.singular}Deleted`,
            },
        };
    }

    public get fulltextTypeNames(): IndexTypeNames {
        return {
            connection: `${this.pascalCasePlural}IndexConnection`,
            edge: `${this.pascalCaseSingular}IndexEdge`,
            where: `${this.pascalCaseSingular}IndexWhere`,
            sort: `${this.pascalCaseSingular}IndexSort`,
        };
    }

    public get vectorTypeNames(): IndexTypeNames {
        return {
            connection: `${this.pascalCasePlural}IndexConnection`,
            edge: `${this.pascalCaseSingular}IndexEdge`,
            where: `${this.pascalCaseSingular}IndexWhere`,
            sort: `${this.pascalCaseSingular}IndexSort`,
        };
    }
}

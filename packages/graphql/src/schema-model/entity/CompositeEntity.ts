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

import { Neo4jGraphQLSchemaValidationError } from "../../classes";
import type { Attribute } from "../attribute/Attribute";
import type { ConcreteEntity } from "./ConcreteEntity";
import type { Entity } from "./Entity";

export type CompositeEntityType = "INTERFACE" | "UNION";

/** Entity for abstract GraphQL types, Interface and Union */
export class CompositeEntity implements Entity {
    public readonly name: string;
    public concreteEntities: ConcreteEntity[];
    public type: CompositeEntityType;
    public readonly attributes: Map<string, Attribute> = new Map();
    // TODO: add type interface or union, and for interface add fields
    // TODO: add annotations

    constructor({
        name,
        concreteEntities,
        type,
        attributes = [],
    }: {
        name: string;
        concreteEntities: ConcreteEntity[];
        type: CompositeEntityType;
        attributes: Attribute[];
    }) {
        this.name = name;
        this.concreteEntities = concreteEntities;
        this.type = type;
        for (const attribute of attributes) {
            this.addAttribute(attribute);
        }
    }

    private addAttribute(attribute: Attribute): void {
        if (this.attributes.has(attribute.name)) {
            throw new Neo4jGraphQLSchemaValidationError(`Attribute ${attribute.name} already exists in ${this.name}`);
        }
        this.attributes.set(attribute.name, attribute);
    }
}

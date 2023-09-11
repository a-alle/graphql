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

type InputTypeNames = Record<"where" | "create" | "update", { type: string; pretty: string }>;

const makeNames = (S) =>
    class extends S {
        constructor(attribute: Attribute) {
            super(attribute);
        }

        getTypePrettyName(): string {
            if (this.isList()) {
                return `[${this.getTypeName()}${this.isListElementRequired() ? "!" : ""}]${
                    this.isRequired() ? "!" : ""
                }`;
            }
            return `${this.getTypeName()}${this.isRequired() ? "!" : ""}`;
        }

        getTypeName(): string {
            return this.isList() ? this.type.ofType.name : this.type.name;
        }

        getFieldTypeName(): string {
            return this.isList() ? `[${this.getTypeName()}]` : this.getTypeName();
        }

        getInputTypeName(): string {
            if (this.isSpatial()) {
                if (this.getTypeName() === "Point") {
                    return "PointInput";
                } else {
                    return "CartesianPointInput";
                }
            }
            return this.getTypeName();
        }

        getFilterableInputTypeName(): string {
            return `[${this.getInputTypeName()}${this.isRequired() ? "!" : ""}]`;
        }

        getInputTypeNames(): InputTypeNames {
            const pretty = this.isList()
                ? `[${this.getInputTypeName()}${this.isListElementRequired() ? "!" : ""}]`
                : this.getInputTypeName();

            return {
                where: { type: this.getInputTypeName(), pretty },
                create: {
                    type: this.getTypeName(),
                    pretty: `${pretty}${this.isRequired() ? "!" : ""}`,
                },
                update: {
                    type: this.getTypeName(),
                    pretty,
                },
            };
        }
    };

export const TypeNames = makeNames;

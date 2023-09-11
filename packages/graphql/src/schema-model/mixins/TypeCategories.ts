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
import type { Annotations } from "../annotation/Annotation";
import type { Attribute } from "../attribute/Attribute";
import type { AttributeType } from "../attribute/AttributeType";

const makeCategories = (S) =>
    class extends S {
        public readonly type: AttributeType;
        public readonly annotations: Partial<Annotations>;
        public readonly assertionOptions: {
            includeLists: boolean;
        } = {
            includeLists: true,
        };
        constructor(attribute: Attribute) {
            super(attribute);
            this.type = attribute.type;
            this.annotations = attribute.annotations;
        }

        /**
     * Previously defined as:
     * [
            ...this.temporalFields,
            ...this.enumFields,
            ...this.objectFields,
            ...this.scalarFields, 
            ...this.primitiveFields, 
            ...this.interfaceFields,
            ...this.objectFields,
            ...this.unionFields,
            ...this.pointFields,
        ];
     */
        isMutable(): boolean {
            return (
                (this.isTemporal() ||
                    this.isEnum() ||
                    this.isInterface() ||
                    this.isUnion() ||
                    this.isSpatial() ||
                    this.isScalar() ||
                    this.isObject()) &&
                !this.isCypher()
            );
        }

        /**
     *  Previously defined as:
     * [...this.primitiveFields,
       ...this.scalarFields,
       ...this.enumFields,
       ...this.temporalFields,
       ...this.pointFields,]
     */
        isConstrainable(): boolean {
            return (
                this.isGraphQLBuiltInScalar() ||
                this.isUserScalar() ||
                this.isEnum() ||
                this.isTemporal() ||
                this.isPoint() ||
                this.isCartesianPoint()
            );
        }

        /**
     * 
        if (
            [
                "Float",
                "Int",
                "BigInt",
                "DateTime",
                "Date",
                "LocalDateTime",
                "Time",
                "LocalTime",
                "Duration",
            ].includes(f.typeMeta.name)
        ),
    */
        isNumericalOrTemporal(): boolean {
            return (
                this.isFloat() ||
                this.isInt() ||
                this.isBigInt() ||
                this.isDateTime() ||
                this.isDate() ||
                this.isLocalDateTime() ||
                this.isTime() ||
                this.isLocalTime() ||
                this.isDuration()
            );
        }

        isTemporalField(): boolean {
            // TODO: why is .isTemporal() not enough??
            return (
                this.isTemporal() ||
                this.isDateTime() ||
                this.isDate() ||
                this.isLocalDateTime() ||
                this.isTime() ||
                this.isLocalTime() ||
                this.isDuration()
            );
        }

        isNonGeneratedField(): boolean {
            return (
                this.isCypher() === false &&
                this.isCustomResolvable() === false &&
                (this.isPrimitiveField() || this.isScalar() || this.isSpatial()) &&
                !this.annotations.id &&
                !this.annotations.populatedBy &&
                !this.annotations.timestamp
            );
        }

        isUnique(): boolean {
            return !!this.annotations.unique || this.isGlobalIDAttribute() === true;
        }

        isCypher(): boolean {
            return !!this.annotations.cypher;
        }

        isGlobalIDAttribute(): boolean {
            return !!this.annotations.relayId;
        }

        isFilterable(): boolean {
            return this.annotations.filterable?.byValue !== false;
        }

        isCustomResolvable(): boolean {
            return !!this.annotations.customResolver;
        }

        // TODO: Check if this is the right place for this
        isFulltext(): boolean {
            return !!this.annotations.fulltext;
        }
    };

export const TypeCategories = makeCategories;

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

import type { Annotations } from "../../annotation/Annotation";
import type { FullTextField } from "../../annotation/FullTextAnnotation";
import type { Argument } from "../../argument/Argument";
import { mix } from "../../mixins/MixinBuilder";
import { TypeCategories } from "../../mixins/TypeCategories";
import { TypeHelper } from "../../mixins/TypeHelper";
import { TypeNames } from "../../mixins/TypeNames";
import type { Attribute } from "../Attribute";
import type { AttributeType } from "../AttributeType";

import { AggregationAdapter } from "./AggregationAdapter";
import { ListAdapter } from "./ListAdapter";
import { MathAdapter } from "./MathAdapter";

export class AttributeAdapter extends mix(TypeHelper).with(TypeCategories, TypeNames) {
    private _listModel: ListAdapter | undefined;
    private _mathModel: MathAdapter | undefined;
    private _aggregationModel: AggregationAdapter | undefined;
    public readonly name: string;
    public readonly annotations: Partial<Annotations>;
    public readonly type: AttributeType;
    public readonly args: Argument[];
    public readonly databaseName: string;
    public readonly description: string;

    constructor(attribute: Attribute) {
        super(attribute);
        this.name = attribute.name;
        this.type = attribute.type;
        this.args = attribute.args;
        this.annotations = attribute.annotations;
        this.databaseName = attribute.databaseName;
        this.description = attribute.description;
    }

    /**
    * Previously defined as:
    * const nodeFields = objectFieldsToComposeFields([
        ...node.primitiveFields,
        ...node.cypherFields,
        ...node.enumFields,
        ...node.scalarFields,
        ...node.interfaceFields,
        ...node.objectFields,
        ...node.unionFields,
        ...node.temporalFields,
        ...node.pointFields,
        ...node.customResolverFields,
    ]);
    */
    isObjectField(): boolean {
        return (
            this.isGraphQLBuiltInScalar() ||
            this.isCypher() ||
            this.isEnum() ||
            this.isUserScalar() ||
            this.isInterface() ||
            this.isObject() ||
            this.isUnion() ||
            this.isTemporal() ||
            this.isPoint() ||
            this.isCartesianPoint() ||
            this.isBigInt()
            // this.isCustomResolver()
        );
    }

    /*
    return [
        ...obj.primitiveFields,
        ...obj.scalarFields,
        ...obj.enumFields,
        ...obj.temporalFields,
        ...obj.pointFields,
        ...obj.cypherFields.filter((field) =>
            [
                "Boolean",
                "ID",
                "Int",
                "BigInt",
                "Float",
                "String",
                "DateTime",
                "LocalDateTime",
                "Time",
                "LocalTime",
                "Date",
                "Duration",
            ].includes(field.typeMeta.name)
        ),
    ].filter((field) => !field.typeMeta.array);
    */
    isSortableField(): boolean {
        return (
            !this.isList() &&
            !this.isCustomResolvable() &&
            (this.isGraphQLBuiltInScalar() ||
                this.isUserScalar() ||
                this.isEnum() ||
                this.isTemporal() ||
                this.isPoint() ||
                this.isCartesianPoint() ||
                this.isBigInt() ||
                this.isCypher())
        );
    }

    /**
    * 
        fields: {
            temporalFields: node.temporalFields,
            enumFields: node.enumFields,
            pointFields: node.pointFields,
            primitiveFields: node.primitiveFields,
            scalarFields: node.scalarFields,
        },
    */
    isWhereField(): boolean {
        return (
            this.isGraphQLBuiltInScalar() ||
            this.isTemporal() ||
            this.isEnum() ||
            this.isPoint() ||
            this.isCartesianPoint() ||
            this.isUserScalar() ||
            this.isBigInt()
        );
    }

    /**
     * [
     * ...node.primitiveFields,
        ...node.scalarFields,
        ...node.enumFields,
        ...node.pointFields,
        ...node.temporalFields
     ]
     */
    isOnCreateField(): boolean {
        return (
            this.isNonGeneratedField() &&
            (this.isGraphQLBuiltInScalar() ||
                this.isTemporal() ||
                this.isEnum() ||
                this.isPoint() ||
                this.isCartesianPoint() ||
                this.isUserScalar() ||
                this.isBigInt())
        );
    }

    isAggregableField(): boolean {
        return !this.isList() && (this.isPrimitiveField() || this.isTemporalField()) && this.isAggregable();
    }

    isAggregationWhereField(): boolean {
        const isGraphQLBuiltInScalarWithoutBoolean = this.isGraphQLBuiltInScalar() && !this.isBoolean();
        const isTemporalWithoutDate = this.isTemporalField() && !this.isDate();
        return (
            !this.isList() &&
            (isGraphQLBuiltInScalarWithoutBoolean || isTemporalWithoutDate || this.isBigInt()) &&
            this.isAggregationFilterable()
        );
    }

    isCreateInputField(): boolean {
        return this.isNonGeneratedField() && this.annotations.settable?.onCreate !== false;
    }

    isUpdateInputField(): boolean {
        return this.isNonGeneratedField() && this.annotations.settable?.onUpdate !== false;
    }

    isArrayMethodField(): boolean {
        return this.isList() && !this.isUserScalar() && (this.isScalar() || this.isSpatial());
    }

    /**
     * @throws {Error} if the attribute is not a list
     */
    get listModel(): ListAdapter {
        if (!this._listModel) {
            this._listModel = new ListAdapter(this);
        }
        return this._listModel;
    }

    /**
     * @throws {Error} if the attribute is not a scalar
     */
    get mathModel(): MathAdapter {
        if (!this._mathModel) {
            this._mathModel = new MathAdapter(this);
        }
        return this._mathModel;
    }

    get aggregationModel(): AggregationAdapter {
        if (!this._aggregationModel) {
            this._aggregationModel = new AggregationAdapter(this);
        }
        return this._aggregationModel;
    }

    /**
     *
     * Schema Generator Stuff
     *
     */

    // TODO: We should probably have this live in a different, more specific adapter

    getDefaultValue() {
        return this.annotations.default?.value;
    }

    isReadable(): boolean {
        return this.annotations.selectable?.onRead !== false;
    }

    isAggregable(): boolean {
        return (
            this.annotations.selectable?.onAggregate !== false &&
            this.isCustomResolvable() === false &&
            this.isCypher() === false
        );
    }
    isAggregationFilterable(): boolean {
        console.log("isAggregationFilterable", this.annotations.filterable?.byAggregate);
        return (
            this.annotations.filterable?.byAggregate !== false &&
            this.isCustomResolvable() === false &&
            this.isCypher() === false
        );
    }

    // TODO: Check if this is the right place for this
    getFulltextIndexes(): FullTextField[] | undefined {
        return this.annotations.fulltext?.indexes;
    }

    getPropagatedAnnotations(): Partial<Annotations> {
        // TODO: use constants
        return Object.fromEntries(
            Object.entries(this.annotations).filter(
                ([name]) =>
                    ![
                        "relationship",
                        "cypher",
                        "id",
                        "authorization",
                        "authentication",
                        "readonly",
                        "writeonly",
                        "customResolver",
                        "default",
                        "coalesce",
                        "timestamp",
                        "alias",
                        "unique",
                        "callback",
                        "populatedBy",
                        "jwtClaim",
                        "selectable",
                        "settable",
                        "subscriptionsAuthorization",
                        "filterable",
                    ].includes(name)
            )
        );
    }

    isPartOfUpdateInputType(): boolean {
        if (this.isScalar() || this.isEnum() || this.isSpatial()) {
            return true;
        }
        if (this.isGraphQLBuiltInScalar()) {
            const isAutogenerated = !!this.annotations.id;
            const isCallback = !!this.annotations.populatedBy;
            return !isAutogenerated && !isCallback; // && !readonly
        }
        if (this.isTemporal()) {
            return !this.annotations.timestamp;
        }
        return false;
    }

    isPartOfCreateInputType(): boolean {
        if (this.isScalar() || this.isEnum() || this.isSpatial() || this.isTemporal()) {
            return true;
        }
        if (this.isGraphQLBuiltInScalar()) {
            const isAutogenerated = !!this.annotations.id;
            const isCallback = !!this.annotations.populatedBy;
            return !isAutogenerated && !isCallback;
        }
        return false;
    }

    isPartOfWhereInputType(): boolean {
        return (
            this.isScalar() || this.isEnum() || this.isTemporal() || this.isSpatial() || this.isGraphQLBuiltInScalar()
        );
    }
}

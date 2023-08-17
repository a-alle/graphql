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

import { MathAdapter } from "./MathAdapter";
import { AggregationAdapter } from "./AggregationAdapter";
import { ListAdapter } from "./ListAdapter";
import type { Attribute, InputValue } from "../Attribute";
import type { Annotations } from "../../annotation/Annotation";
import type { AttributeType } from "../AttributeType";
import {
    EnumType,
    UserScalarType,
    GraphQLBuiltInScalarType,
    InterfaceType,
    ListType,
    Neo4jCartesianPointType,
    Neo4jGraphQLNumberType,
    Neo4jGraphQLSpatialType,
    Neo4jGraphQLTemporalType,
    Neo4jPointType,
    ScalarType,
    UnionType,
    ObjectType,
} from "../AttributeType";

export class AttributeAdapter {
    private _listModel: ListAdapter | undefined;
    private _mathModel: MathAdapter | undefined;
    private _aggregationModel: AggregationAdapter | undefined;
    public name: string;
    public annotations: Partial<Annotations>;
    public type: AttributeType;
    public databaseName: string;
    public description: string;
    public attributeArguments: InputValue[];
    private assertionOptions: {
        includeLists: boolean;
    };
    constructor(attribute: Attribute) {
        this.name = attribute.name;
        this.type = attribute.type;
        this.annotations = attribute.annotations;
        this.databaseName = attribute.databaseName;
        this.description = attribute.description;
        this.attributeArguments = attribute.attributeArguments;
        this.assertionOptions = {
            includeLists: true,
        };
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

    isUnique(): boolean {
        return this.annotations.unique ? true : false;
    }

    isCypher(): boolean {
        return this.annotations.cypher ? true : false;
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
     * Just an helper to get the wrapped type in case of a list, useful for the assertions
     */
    private getTypeForAssertion(includeLists: boolean) {
        if (includeLists) {
            return this.isList() ? this.type.ofType : this.type;
        }
        return this.type;
    }

    isBoolean(options = this.assertionOptions): boolean {
        const type = this.getTypeForAssertion(options.includeLists);
        return type instanceof ScalarType && type.name === GraphQLBuiltInScalarType.Boolean;
    }

    isID(options = this.assertionOptions): boolean {
        const type = this.getTypeForAssertion(options.includeLists);
        return type instanceof ScalarType && type.name === GraphQLBuiltInScalarType.ID;
    }

    isInt(options = this.assertionOptions): boolean {
        const type = this.getTypeForAssertion(options.includeLists);
        return type instanceof ScalarType && type.name === GraphQLBuiltInScalarType.Int;
    }

    isFloat(options = this.assertionOptions): boolean {
        const type = this.getTypeForAssertion(options.includeLists);
        return type instanceof ScalarType && type.name === GraphQLBuiltInScalarType.Float;
    }

    isString(options = this.assertionOptions): boolean {
        const type = this.getTypeForAssertion(options.includeLists);
        return type instanceof ScalarType && type.name === GraphQLBuiltInScalarType.String;
    }

    isCartesianPoint(options = this.assertionOptions): boolean {
        const type = this.getTypeForAssertion(options.includeLists);
        return type instanceof Neo4jCartesianPointType;
    }

    isPoint(options = this.assertionOptions): boolean {
        const type = this.getTypeForAssertion(options.includeLists);
        return type instanceof Neo4jPointType;
    }

    isBigInt(options = this.assertionOptions): boolean {
        const type = this.getTypeForAssertion(options.includeLists);
        return type instanceof ScalarType && type.name === Neo4jGraphQLNumberType.BigInt;
    }

    isDate(options = this.assertionOptions): boolean {
        const type = this.getTypeForAssertion(options.includeLists);
        return type instanceof ScalarType && type.name === Neo4jGraphQLTemporalType.Date;
    }

    isDateTime(options = this.assertionOptions): boolean {
        const type = this.getTypeForAssertion(options.includeLists);
        return type instanceof ScalarType && type.name === Neo4jGraphQLTemporalType.DateTime;
    }

    isLocalDateTime(options = this.assertionOptions): boolean {
        const type = this.getTypeForAssertion(options.includeLists);
        return type instanceof ScalarType && type.name === Neo4jGraphQLTemporalType.LocalDateTime;
    }

    isTime(options = this.assertionOptions): boolean {
        const type = this.getTypeForAssertion(options.includeLists);
        return type instanceof ScalarType && type.name === Neo4jGraphQLTemporalType.Time;
    }

    isLocalTime(options = this.assertionOptions): boolean {
        const type = this.getTypeForAssertion(options.includeLists);
        return (type.name as Neo4jGraphQLTemporalType) === Neo4jGraphQLTemporalType.LocalTime;
    }

    isDuration(options = this.assertionOptions): boolean {
        const type = this.getTypeForAssertion(options.includeLists);
        return (type.name as Neo4jGraphQLTemporalType) === Neo4jGraphQLTemporalType.Duration;
    }

    isObject(options = this.assertionOptions): boolean {
        const type = this.getTypeForAssertion(options.includeLists);
        return type instanceof ObjectType;
    }

    isEnum(options = this.assertionOptions): boolean {
        const type = this.getTypeForAssertion(options.includeLists);
        return type instanceof EnumType;
    }

    isInterface(options = this.assertionOptions): boolean {
        const type = this.getTypeForAssertion(options.includeLists);
        return type instanceof InterfaceType;
    }

    isUnion(options = this.assertionOptions): boolean {
        const type = this.getTypeForAssertion(options.includeLists);
        return type instanceof UnionType;
    }

    isList(): this is this & { type: ListType } {
        return this.type instanceof ListType;
    }

    isUserScalar(options = this.assertionOptions): boolean {
        const type = this.getTypeForAssertion(options.includeLists);
        return type instanceof UserScalarType;
    }

    isTemporal(options = this.assertionOptions): boolean {
        const type = this.getTypeForAssertion(options.includeLists);
        return type.name in Neo4jGraphQLTemporalType;
    }

    isListElementRequired(): boolean {
        if (!(this.type instanceof ListType)) {
            return false;
        }
        return this.type.ofType.isRequired;
    }

    isRequired(): boolean {
        return this.type.isRequired;
    }

    /**
     *
     * Schema Generator Stuff
     *
     */
    isGraphQLBuiltInScalar(options = this.assertionOptions): boolean {
        const type = this.getTypeForAssertion(options.includeLists);
        return type.name in GraphQLBuiltInScalarType;
    }

    isSpatial(options = this.assertionOptions): boolean {
        const type = this.getTypeForAssertion(options.includeLists);
        return type.name in Neo4jGraphQLSpatialType;
    }

    isAbstract(options = this.assertionOptions): boolean {
        return this.isInterface(options) || this.isUnion(options);
    }
    /**
     * Returns true for both built-in and user-defined scalars
     **/
    isScalar(options = this.assertionOptions): boolean {
        return (
            this.isGraphQLBuiltInScalar(options) ||
            this.isTemporal(options) ||
            this.isBigInt(options) ||
            this.isUserScalar(options)
        );
    }

    isNumeric(options = this.assertionOptions): boolean {
        return this.isBigInt(options) || this.isFloat(options) || this.isInt(options);
    }

    /**
     *  END of category assertions
     */

    isGlobalIDAttribute(): boolean {
        return !!this.annotations.id?.global;
    }

    /**
     *
     * Schema Generator Stuff
     *
     */

    getTypePrettyName(): string {
        if (this.isList()) {
            return `[${this.name}${this.isListElementRequired() ? "!" : ""}]${this.isRequired() ? "!" : ""}`;
        }
        return `${this.name}${this.isRequired() ? "!" : ""}`;
    }

    getTypeName(): string {
        return this.isList() ? this.type.ofType.name : this.type.name;
    }

    getInputTypenames(): InputTypeNames {
        let typeName = this.getTypeName();
        let pretty = this.getTypePrettyName();
        if (this.isSpatial()) {
            if (this.getTypeName() === "Point") {
                typeName = "PointInput";
                pretty = pretty.replace("Point", "PointInput");
            } else {
                typeName = "CartesianPointInput";
                pretty = pretty.replace("CartesianPoint", "CartesianPointInput");
            }
        }
        return {
            where: { type: typeName, pretty },
            create: {
                type: this.getTypeName(),
                pretty,
            },
            update: {
                type: this.getTypeName(),
                pretty,
            },
        };
    }

    isReadable(): boolean {
        return this.annotations.selectable?.onRead !== false;
    }

    getPropagatedAnnotations(): Partial<Annotations> {
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

type InputTypeNames = Record<"where" | "create" | "update", { type: string; pretty: string }>;

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
import type { AttributeType } from "../attribute/AttributeType";
import {
    Neo4jGraphQLSpatialType,
    EnumType,
    GraphQLBuiltInScalarType,
    InterfaceType,
    ListType,
    Neo4jCartesianPointType,
    Neo4jGraphQLNumberType,
    Neo4jGraphQLTemporalType,
    Neo4jPointType,
    ObjectType,
    ScalarType,
    UnionType,
    UserScalarType,
} from "../attribute/AttributeType";

export class TypeHelper {
    public readonly type: AttributeType;
    public readonly assertionOptions: {
        includeLists: boolean;
    };
    constructor(attribute: Attribute) {
        this.type = attribute.type;
        this.assertionOptions = { includeLists: true };
    }

    /**
     * Just an helper to get the wrapped type in case of a list, useful for the assertions
     */
    private getTypeForAssertion(includeLists: boolean): AttributeType {
        if (includeLists) {
            return this.isList() ? this.type.ofType : (this as TypeHelper).type;
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

    isPrimitiveField(): boolean {
        return this.isGraphQLBuiltInScalar() || this.isUserScalar() || this.isEnum() || this.isBigInt();
    }
}

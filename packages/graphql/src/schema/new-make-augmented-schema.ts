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

import type { IResolvers } from "@graphql-tools/utils";
import type {
    DefinitionNode,
    DirectiveNode,
    DocumentNode,
    GraphQLEnumType,
    GraphQLInputObjectType,
    GraphQLInterfaceType,
    GraphQLObjectType,
    GraphQLScalarType,
    InterfaceTypeDefinitionNode,
    NameNode,
    ObjectTypeDefinitionNode,
    SchemaExtensionNode,
} from "graphql";
import { GraphQLID, GraphQLNonNull, Kind, parse, print } from "graphql";
import type { InputTypeComposer, InputTypeComposerFieldConfigMapDefinition, ObjectTypeComposer } from "graphql-compose";
import { SchemaComposer } from "graphql-compose";
import pluralize from "pluralize";
import { AggregationTypesMapper } from "./aggregations/aggregation-types-mapper";
import { augmentFulltextSchema } from "./augment/fulltext";
import { cypherResolver } from "./resolvers/field/cypher";
import { numericalResolver } from "./resolvers/field/numerical";
import { createResolver } from "./resolvers/mutation/create";
import { deleteResolver } from "./resolvers/mutation/delete";
import { updateResolver } from "./resolvers/mutation/update";
import { aggregateResolver } from "./resolvers/query/aggregate";
import { findResolver } from "./resolvers/query/read";
import { rootConnectionResolver } from "./resolvers/query/root-connection";
// import * as constants from "../constants";
import type { Node } from "../classes";
import type Relationship from "../classes/Relationship";
import * as Scalars from "../graphql/scalars";
import { isRootType } from "../utils/is-root-type";
import { upperFirst } from "../utils/upper-first";
import createConnectionFields from "./create-connection-fields";
import { ensureNonEmptyInput } from "./ensure-non-empty-input";
import getCustomResolvers from "./get-custom-resolvers";
import type { DefinitionNodes } from "./get-definition-nodes";
import { getDefinitionNodes } from "./get-definition-nodes";
import type { ObjectFields } from "./get-obj-field-meta";
import getObjFieldMeta from "./get-obj-field-meta";
import getSortableFields from "./get-sortable-fields";
import getWhereFields, { getWhereFieldsFromConcreteEntity } from "./get-where-fields";
import {
    concreteEntityToComposeFields,
    graphqlDirectivesToCompose,
    objectFieldsToComposeFields,
    objectFieldsToCreateInputFields,
    objectFieldsToUpdateInputFields,
} from "./to-compose";

// GraphQL type imports
import type { Subgraph } from "../classes/Subgraph";
import { FIELD_DIRECTIVES, OBJECT_DIRECTIVES, PROPAGATED_DIRECTIVES } from "../constants";
import { SortDirection } from "../graphql/enums/SortDirection";
import { CartesianPointDistance } from "../graphql/input-objects/CartesianPointDistance";
import { CartesianPointInput } from "../graphql/input-objects/CartesianPointInput";
import { FloatWhere } from "../graphql/input-objects/FloatWhere";
import { PointDistance } from "../graphql/input-objects/PointDistance";
import { PointInput } from "../graphql/input-objects/PointInput";
import { QueryOptions } from "../graphql/input-objects/QueryOptions";
import { CartesianPoint } from "../graphql/objects/CartesianPoint";
import { CreateInfo } from "../graphql/objects/CreateInfo";
import { DeleteInfo } from "../graphql/objects/DeleteInfo";
import { PageInfo } from "../graphql/objects/PageInfo";
import { Point } from "../graphql/objects/Point";
import { UpdateInfo } from "../graphql/objects/UpdateInfo";
import type { Neo4jGraphQLSchemaModel } from "../schema-model/Neo4jGraphQLSchemaModel";
import type { CompositeEntity } from "../schema-model/entity/CompositeEntity";
import { ConcreteEntity } from "../schema-model/entity/ConcreteEntity";
import { CompositeEntityAdapter } from "../schema-model/entity/model-adapters/CompositeEntityAdapter";
import { ConcreteEntityAdapter } from "../schema-model/entity/model-adapters/ConcreteEntityAdapter";
import type { BaseField, Neo4jFeaturesSettings } from "../types";
import { tupleIncludes } from "../utils/utils";
import { addArrayMethodsToITC } from "./array-methods";
import { addGlobalNodeFields } from "./create-global-nodes";
import createRelationshipFields from "./create-relationship-fields/create-relationship-fields";
import getNodes from "./get-nodes";
import { getResolveAndSubscriptionMethods } from "./get-resolve-and-subscription-methods";
import { filterInterfaceTypes } from "./make-augmented-schema/filter-interface-types";
import { addMathOperatorsToITC } from "./math";
import { getSchemaConfigurationFlags, schemaConfigurationFromSchemaExtensions } from "./schema-configuration";
import { generateSubscriptionTypes } from "./subscriptions/generate-subscription-types";

function definitionNodeHasName(x: DefinitionNode): x is DefinitionNode & { name: NameNode } {
    return "name" in x;
}

class SchemaGeneratorModel {
    // contains type names for now
    static createInfoTypeName: string;
    static updateInfoTypeName: string;
    static deleteInfoTypeName: string;
    static pageInfoTypeName: string;
    static {
        this.createInfoTypeName = "CreateInfo";
        this.updateInfoTypeName = "UpdateInfo";
        this.deleteInfoTypeName = "DeleteInfo";
        this.pageInfoTypeName = "PageInfo";
    }
}

class AugmentedSchemaGenerator {
    private composer: SchemaComposer;

    constructor(
        private schemaModel: Neo4jGraphQLSchemaModel,
        private definitionNodes: DefinitionNodes,
        private rootTypesCustomResolvers: ObjectTypeDefinitionNode[]
    ) {
        this.composer = new SchemaComposer();
    }

    generate() {
        let pointInTypeDefs = false;
        let cartesianPointInTypeDefs = false;
        let floatWhereInTypeDefs = false;

        for (const entity of this.schemaModel.entities.values()) {
            // TODO: add an EntityModel to schema model to avoid these checks everywhere?
            const model =
                entity instanceof ConcreteEntity
                    ? new ConcreteEntityAdapter(entity)
                    : new CompositeEntityAdapter(entity as CompositeEntity);

            // TODO: check if these can be created ad-hoc
            for (const attribute of model.attributes.values()) {
                if (attribute.isPoint()) {
                    pointInTypeDefs = true;
                }
                if (attribute.isCartesianPoint()) {
                    cartesianPointInTypeDefs = true;
                }
            }
            if ("annotations" in model && model.annotations.fulltext) {
                floatWhereInTypeDefs = true;
            }
            if (model instanceof ConcreteEntityAdapter) {
                for (const relationship of model.relationships.values()) {
                    for (const attribute of relationship.attributes.values()) {
                        if (attribute.isPoint()) {
                            pointInTypeDefs = true;
                        }
                        if (attribute.isCartesianPoint()) {
                            cartesianPointInTypeDefs = true;
                        }
                    }
                }
            }
        }

        // this.pipeDefs();
        this.addToComposer(this.getStaticTypes());
        this.addToComposer(this.getSpatialTypes(pointInTypeDefs, cartesianPointInTypeDefs));
        this.addToComposer(this.getTemporalTypes(floatWhereInTypeDefs));

        // this.add(this.getEntityTypes());
        // const relationshipPropertiesTypes = this.getRelationshipProperties(
        //     this._definitionCollection.relationshipProperties
        // );
        // this.add(relationshipPropertiesTypes);

        return this.composer;
    }

    private pipeDefs() {
        const pipedDefs = [
            ...this.definitionNodes.enumTypes,
            ...this.definitionNodes.scalarTypes,
            ...this.definitionNodes.inputObjectTypes,
            ...this.definitionNodes.unionTypes,
            ...this.definitionNodes.directives,
            ...this.rootTypesCustomResolvers,
        ].filter(Boolean);
        if (pipedDefs.length) {
            this.composer.addTypeDefs(print({ kind: Kind.DOCUMENT, definitions: pipedDefs }));
        }
    }

    private getStaticTypes() {
        return {
            objects: [CreateInfo, DeleteInfo, UpdateInfo, PageInfo],
            inputs: [QueryOptions],
            enums: [SortDirection],
            scalars: Object.values(Scalars),
        };
    }

    private getSpatialTypes(
        pointInTypeDefs: boolean,
        cartesianPointInTypeDefs: boolean
    ): {
        objects: GraphQLObjectType[];
        inputs: GraphQLInputObjectType[];
    } {
        const objects: GraphQLObjectType[] = [];
        const inputs: GraphQLInputObjectType[] = [];
        if (pointInTypeDefs) {
            objects.push(Point);
            inputs.push(PointInput, PointDistance);
        }
        if (cartesianPointInTypeDefs) {
            objects.push(CartesianPoint);
            inputs.push(CartesianPointInput, CartesianPointDistance);
        }
        return {
            objects,
            inputs,
        };
    }

    private getTemporalTypes(floatWhereInTypeDefs: boolean): {
        inputs: GraphQLInputObjectType[];
    } {
        const inputs: GraphQLInputObjectType[] = [];
        if (floatWhereInTypeDefs) {
            inputs.push(FloatWhere);
        }
        return {
            inputs,
        };
    }

    /*
    private addGlobalNodeFields(concreteEntities: ConcreteEntity[], nodes: Node[]) {
        const globalEntities = concreteEntities.filter((entity) => {
            const model = new ConcreteEntityAdapter(entity);
            return model.isGlobalNode();
        });
        const globalNodes = nodes.filter((n) => globalEntities.find((e) => e.name === n.name));

        const fetchById = (id: string, context: Context, info: GraphQLResolveInfo) => {
            const resolver = globalNodeResolver({ nodes: globalNodes });
            return resolver.resolve(null, { id }, context, info);
        };

        const resolveType = (obj: { [key: string]: unknown; __resolveType: string }) => obj.__resolveType;

        const { nodeInterface, nodeField } = nodeDefinitions(fetchById, resolveType);

        this._composer.createInterfaceTC(nodeInterface);
        this._composer.Query.addFields({
            node: nodeField as ObjectTypeComposerFieldConfigAsObjectDefinition<null, Context, { id: string }>,
        });
    }

    // TODO: alternatively, get these from Entity.Relationship
    private getRelationshipProperties(relationshipPropertiesInterface: CompositeEntity) {
        new ToComposer(relationshipPropertiesInterface)
            .withInterfaceType()
            .withSortInputType()
            .withWhereInputType({ enabledFeatures })
            .withUpdateInputType({ addMathOperators: true, addArrayMethods: true })
            .withCreateInputType()
            .build(this._composer);
    }

        private getEntityTypes() {
        // TODO: consider Factory
        this.schemaModel.concreteEntities.forEach((concreteEntity) => {
            new ToComposer(concreteEntity)
                .withObjectType()
                .withSortInputType()
                .withWhereInputType({ enabledFeatures })
                .withUpdateInputType({ addMathOperators: true, addArrayMethods: true })
                .withCreateInputType()
                .build(this._composer);
        });
    }

*/
    private addToComposer({
        objects = [],
        inputs = [],
        enums = [],
        scalars = [],
        interfaces = [],
    }: {
        objects?: GraphQLObjectType[];
        inputs?: GraphQLInputObjectType[];
        enums?: GraphQLEnumType[];
        scalars?: GraphQLScalarType[];
        interfaces?: GraphQLInterfaceType[];
    }) {
        objects.forEach((x) => this.composer.createObjectTC(x));
        inputs.forEach((x) => this.composer.createInputTC(x));
        enums.forEach((x) => this.composer.createEnumTC(x));
        interfaces.forEach((x) => this.composer.createInterfaceTC(x));
        scalars.forEach((scalar) => this.composer.addTypeDefs(`scalar ${scalar.name}`));
    }
}

// abstract ComposerBuilder
// ConcreteEntityBuilder extends ComposerBuilder
// CompositeEntityBuilder extends ComposerBuilder

/*
class ToComposer {
    _entity: ConcreteEntity | CompositeEntity;
    _entityModel: ConcreteEntityAdapter | CompositeEntityAdapter;
    _ts: TypeStorage;

    constructor(fromEntity: ConcreteEntity | CompositeEntity) {
        this._entity = fromEntity;
        this._entityModel =
            this._entity instanceof ConcreteEntity
                ? new ConcreteEntityAdapter(this._entity)
                : new CompositeEntityAdapter(this._entity);
        this._ts = new TypeStorage();
    }

    public withInterfaceType() {
        // this._tempComposer.add(InterfaceTypeComposer.createTemp(this._currentType));
        this._ts.set(
            this._entity.name,
            InterfaceTypeComposer.createTemp({
                name: this._entity.name,
                fields: ToComposer._attributesToComposeFields(Array.from(this._entityModel.attributes.values())),
            })
        );
        return this;
    }

    public withObjectType() {
        this._ts.set(
            this._entity.name,
            ObjectTypeComposer.createTemp({
                name: this._entity.name,
                fields: ToComposer._attributesToComposeFields(Array.from(this._entityModel.attributes.values())),
                // TODO: add description field
                // description: this._entity.description,
                // TODO: discuss with Simone - create an AnnotationAdapter or logic straight in AttributeAdapter
                // directives: graphqlDirectivesToCompose([...node.otherDirectives, ...node.propagatedDirectives]),
                // TODO: discuss with Simone - add interfaces to ConcreteEntity
                // interfaces: this._entity.interfaces.map((x) => x.name.value)
            })
        );
        return this;
    }

    public withSortInputType() {
        const sortTypeName = `${this._entity.name}Sort`;
        const currentType = this._ts.get(this._entity.name);
        this._ts.set(
            sortTypeName,
            InputTypeComposer.createTemp({
                name: sortTypeName,
                fields: currentType.getFieldNames().reduce((res, f) => {
                    return { ...res, [f]: "SortDirection" };
                }, {}),
            })
        );
        return this;
    }

    public withWhereInputType({ enabledFeatures }) {
        const whereTypeName = `${this._entity.name}Where`;
        this._ts.set(
            whereTypeName,
            InputTypeComposer.createTemp({
                name: whereTypeName,
                fields: ToComposer._attributesToComposeFields(this._entityModel.getCreateInputTypeFields()),
                // TODO: refactor getWhereFields
                // getWhereFields({ typeName: relationship.name.value, fields: adapter.getWhereInputTypeFields(), enabledFeatures: features.filters })
            })
        );
        return this;
    }

    public withUpdateInputType({ addMathOperators = true, addArrayMethods = true }) {
        const updateTypeName = `${this._entity.name}UpdateInput`;
        const updateInput = InputTypeComposer.createTemp({
            name: updateTypeName,
            fields: ToComposer._attributesToComposeFields(this._entityModel.getUpdateInputTypeFields()),
        });
        addMathOperators && addMathOperatorsToITC(updateInput);
        addArrayMethods && addArrayMethodsToITC(updateInput, relFields.primitiveFields);
        addArrayMethods && addArrayMethodsToITC(updateInput, relFields.pointFields);
        this._ts.set(updateTypeName, updateInput);

        return this;

        // TODO: add these
        // addMathOperatorsToITC(relationshipUpdateITC);
        // addArrayMethodsToITC(relationshipUpdateITC, relFields.primitiveFields);
        // addArrayMethodsToITC(relationshipUpdateITC, relFields.pointFields);
    }

    public withCreateInputType() {
        const createTypeName = `${this._entity.name}CreateInput`;
        this._ts.set(
            createTypeName,
            InputTypeComposer.createTemp({
                name: createTypeName,
                fields: ToComposer._attributesToComposeFields(this._entityModel.getCreateInputTypeFields()),
            })
        );

        return this;
    }

    public build(_composer: SchemaComposer) {
        // _composer.createInterfaceTC(x);

        this._ts.forEach((v) => {
            _composer.add(v);
        });

        // _composer.merge(t);
    }

    // ==== to compose

    private static _attributesToComposeFields(attributes: AttributeAdapter[]): {
        [k: string]: ObjectTypeComposerFieldConfigAsObjectDefinition<any, any>;
    } {
        return attributes.reduce((res, model) => {
            if (!model.isReadable()) {
                return res;
            }

            const newField: ObjectTypeComposerFieldConfigAsObjectDefinition<any, any> = {
                type: model.type.getPretty(),
                args: {},
                description: model.description,
            };

            if (Object.keys(model.getPropagatedAnnotations()).length) {
                newField.directives = this._graphqlDirectivesToCompose(model.getPropagatedAnnotations());
            }

            if (["Int", "Float"].includes(model.type.getName())) {
                newField.resolve = numericalResolver;
            }

            if (model.type.getName() === "ID") {
                newField.resolve = idResolver;
            }

            if (model.attributeArguments) {
                newField.args = this._graphqlArgsToCompose(model.attributeArguments);
            }

            return { ...res, [model.name]: newField };
        }, {});
    }

    // TODO: add arguments on annotations
    private static _graphqlDirectivesToCompose(annotations: Partial<Annotation>): Directive[] {
        return Object.entries(annotations).map(([, annotation]) => ({
            args: (annotation.arguments || [])?.reduce(
                (r: DirectiveArgs, d) => ({ ...r, [d.name.value]: parseValueNode(d.value) }),
                {}
            ),
            name: annotation.name,
        }));
    }

    // TODO: check on Arguments class
    private static _graphqlArgsToCompose(args: InputValue[]) {
        return args.reduce((res, arg) => {
            return {
                ...res,
                [arg.name]: {
                    type: arg.type.getPretty(),
                    description: arg.description,
                    ...(arg.defaultValue ? { defaultValue: arg.defaultValue } : {}),
                },
            };
        }, {});
    }
}
*/

function makeAugmentedSchema(
    document: DocumentNode,
    {
        features,
        generateSubscriptions,
        userCustomResolvers,
        subgraph,
    }: {
        features?: Neo4jFeaturesSettings;
        generateSubscriptions?: boolean;
        userCustomResolvers?: IResolvers | Array<IResolvers>;
        subgraph?: Subgraph;
    } = {},
    schemaModel: Neo4jGraphQLSchemaModel
): {
    nodes: Node[];
    relationships: Relationship[];
    typeDefs: DocumentNode;
    resolvers: IResolvers;
} {
    const composer = new SchemaComposer();
    const callbacks = features?.populatedBy?.callbacks;

    let relationships: Relationship[] = [];

    const definitionNodes = getDefinitionNodes(document);
    const customResolvers = getCustomResolvers(document);
    const {
        interfaceTypes,
        scalarTypes,
        objectTypes,
        enumTypes,
        // inputObjectTypes,
        // directives,
        unionTypes,
        schemaExtensions,
    } = definitionNodes;

    // TODO: use schemaModel.definitionCollection instead of definitionNodes? need to add inputObjectTypes and customResolvers
    const schemaGenerator = new AugmentedSchemaGenerator(
        schemaModel,
        definitionNodes,
        [customResolvers.customQuery, customResolvers.customMutation, customResolvers.customSubscription].filter(
            (x): x is ObjectTypeDefinitionNode => Boolean(x)
        )
    );
    const generatorComposer = schemaGenerator.generate();
    composer.merge(generatorComposer);

    // TODO: move these to SchemaGenerator once nodes are moved (in the meantime references to object types are causing errors because they are not present in the generated schema)
    const pipedDefs = [
        ...definitionNodes.enumTypes,
        ...definitionNodes.scalarTypes,
        ...definitionNodes.inputObjectTypes,
        ...definitionNodes.unionTypes,
        ...definitionNodes.directives,
        ...[customResolvers.customQuery, customResolvers.customMutation, customResolvers.customSubscription].filter(
            (x): x is ObjectTypeDefinitionNode => Boolean(x)
        ),
    ].filter(Boolean);
    if (pipedDefs.length) {
        composer.addTypeDefs(print({ kind: Kind.DOCUMENT, definitions: pipedDefs }));
    }

    // """createSomething"""

    // TODO: move deprecationMap out to separate file eventually
    const deprecationMap = new Map<
        string,
        {
            field: string;
            reason: string;
            deprecatedFromVersion: string;
            toBeRemovedInVersion: string;
        }[]
    >([
        [
            SchemaGeneratorModel.createInfoTypeName,
            [
                {
                    field: "bookmark",
                    reason: "This field has been deprecated because bookmarks are now handled by the driver.",
                    deprecatedFromVersion: "",
                    toBeRemovedInVersion: "",
                },
            ],
        ],
        [
            SchemaGeneratorModel.updateInfoTypeName,
            [
                {
                    field: "bookmark",
                    reason: "This field has been deprecated because bookmarks are now handled by the driver.",
                    deprecatedFromVersion: "",
                    toBeRemovedInVersion: "",
                },
            ],
        ],
        [
            SchemaGeneratorModel.deleteInfoTypeName,
            [
                {
                    field: "bookmark",
                    reason: "This field has been deprecated because bookmarks are now handled by the driver.",
                    deprecatedFromVersion: "",
                    toBeRemovedInVersion: "",
                },
            ],
        ],
    ]);

    // Loop over all entries in the deprecation map and add field deprecations to all types in the map.
    for (const [typeName, deprecatedFields] of deprecationMap) {
        const typeComposer = composer.getOTC(typeName);
        typeComposer.deprecateFields(
            deprecatedFields.reduce((acc, { field, reason }) => ({ ...acc, [field]: reason }), {})
        );
    }

    // TODO: ideally move these in getSubgraphSchema()
    if (subgraph) {
        const shareable = subgraph.getFullyQualifiedDirectiveName("shareable");
        [
            SchemaGeneratorModel.createInfoTypeName,
            SchemaGeneratorModel.updateInfoTypeName,
            SchemaGeneratorModel.deleteInfoTypeName,
            SchemaGeneratorModel.pageInfoTypeName,
        ].forEach((typeName) => {
            const typeComposer = composer.getOTC(typeName);
            typeComposer.setDirectiveByName(shareable);
        });
    }

    const aggregationTypesMapper = new AggregationTypesMapper(composer, subgraph);

    const globalSchemaConfiguration = schemaConfigurationFromSchemaExtensions(schemaExtensions);

    const getNodesResult = getNodes(definitionNodes, { callbacks, userCustomResolvers });

    const { nodes, relationshipPropertyInterfaceNames, interfaceRelationshipNames } = getNodesResult;

    // graphql-compose will break if the Point and CartesianPoint types are created but not used,
    // because it will purge the unused types but leave behind orphaned field resolvers
    //
    // These are flags to check whether the types are used and then create them if they are
    // let { pointInTypeDefs, cartesianPointInTypeDefs } = getNodesResult;

    const hasGlobalNodes = addGlobalNodeFields(nodes, composer);

    const { relationshipProperties, interfaceRelationships, filteredInterfaceTypes } = filterInterfaceTypes(
        interfaceTypes,
        relationshipPropertyInterfaceNames,
        interfaceRelationshipNames
    );

    const relationshipFields = new Map<string, ObjectFields>();
    const interfaceCommonFields = new Map<string, ObjectFields>();

    relationshipProperties.forEach((relationship) => {
        // const authDirective = (relationship.directives || []).find((x) =>
        //     ["auth", "authorization", "authentication"].includes(x.name.value)
        // );
        // if (authDirective) {
        //     throw new Error("Cannot have @auth directive on relationship properties interface");
        // }

        // relationship.fields?.forEach((field) => {
        //     constants.RESERVED_INTERFACE_FIELDS.forEach(([fieldName, message]) => {
        //         if (field.name.value === fieldName) {
        //             throw new Error(message);
        //         }
        //     });

        //     const forbiddenDirectives = ["auth", "authorization", "authentication", "relationship", "cypher"];
        //     forbiddenDirectives.forEach((directive) => {
        //         const found = (field.directives || []).find((x) => x.name.value === directive);
        //         if (found) {
        //             throw new Error(`Cannot have @${directive} directive on relationship property`);
        //         }
        //     });
        // });

        const relFields = getObjFieldMeta({
            enums: enumTypes,
            interfaces: filteredInterfaceTypes,
            objects: objectTypes,
            scalars: scalarTypes,
            unions: unionTypes,
            obj: relationship,
            callbacks,
        });

        relationshipFields.set(relationship.name.value, relFields);

        const baseFields: BaseField[][] = Object.values(relFields);

        const objectComposeFields = objectFieldsToComposeFields(baseFields.reduce((acc, x) => [...acc, ...x], []));

        const propertiesInterface = composer.createInterfaceTC({
            name: relationship.name.value,
            fields: objectComposeFields,
        });

        composer.createInputTC({
            name: `${relationship.name.value}Sort`,
            fields: propertiesInterface.getFieldNames().reduce((res, f) => {
                return { ...res, [f]: "SortDirection" };
            }, {}),
        });

        const relationshipUpdateITC = composer.createInputTC({
            name: `${relationship.name.value}UpdateInput`,
            fields: objectFieldsToUpdateInputFields([
                ...relFields.primitiveFields.filter(
                    (field) => !field.autogenerate && !field.readonly && !field.callback
                ),
                ...relFields.scalarFields,
                ...relFields.enumFields,
                ...relFields.temporalFields.filter((field) => !field.timestamps),
                ...relFields.pointFields,
            ]),
        });

        addMathOperatorsToITC(relationshipUpdateITC);

        addArrayMethodsToITC(relationshipUpdateITC, relFields.primitiveFields);
        addArrayMethodsToITC(relationshipUpdateITC, relFields.pointFields);

        const relationshipWhereFields = getWhereFields({
            typeName: relationship.name.value,
            fields: {
                scalarFields: relFields.scalarFields,
                enumFields: relFields.enumFields,
                temporalFields: relFields.temporalFields,
                pointFields: relFields.pointFields,
                primitiveFields: relFields.primitiveFields,
            },
            features,
        });

        composer.createInputTC({
            name: `${relationship.name.value}Where`,
            fields: relationshipWhereFields,
        });

        composer.createInputTC({
            name: `${relationship.name.value}CreateInput`,
            fields: objectFieldsToCreateInputFields([
                ...relFields.primitiveFields.filter((field) => !field.autogenerate && !field.callback),
                ...relFields.scalarFields,
                ...relFields.enumFields,
                ...relFields.temporalFields,
                ...relFields.pointFields,
            ]),
        });
    });

    interfaceRelationships.forEach((interfaceRelationship) => {
        const implementations = objectTypes.filter((n) =>
            n.interfaces?.some((i) => i.name.value === interfaceRelationship.name.value)
        );

        const interfaceFields = getObjFieldMeta({
            enums: enumTypes,
            interfaces: [...filteredInterfaceTypes, ...interfaceRelationships],
            objects: objectTypes,
            scalars: scalarTypes,
            unions: unionTypes,
            obj: interfaceRelationship,
            callbacks,
        });

        const baseFields: BaseField[][] = Object.values(interfaceFields);
        const objectComposeFields = objectFieldsToComposeFields(baseFields.reduce((acc, x) => [...acc, ...x], []));

        const composeInterface = composer.createInterfaceTC({
            name: interfaceRelationship.name.value,
            fields: objectComposeFields,
        });

        interfaceCommonFields.set(interfaceRelationship.name.value, interfaceFields);

        const interfaceOptionsInput = composer.getOrCreateITC(`${interfaceRelationship.name.value}Options`, (tc) => {
            tc.addFields({
                limit: "Int",
                offset: "Int",
            });
        });

        const interfaceSortableFields = getSortableFields(interfaceFields).reduce(
            (res, f) => ({
                ...res,
                [f.fieldName]: {
                    type: "SortDirection",
                    directives: graphqlDirectivesToCompose(
                        f.otherDirectives.filter((directive) => directive.name.value === "deprecated")
                    ),
                },
            }),
            {}
        );

        if (Object.keys(interfaceSortableFields).length) {
            const interfaceSortInput = composer.getOrCreateITC(`${interfaceRelationship.name.value}Sort`, (tc) => {
                tc.addFields(interfaceSortableFields);
                tc.setDescription(
                    `Fields to sort ${pluralize(
                        interfaceRelationship.name.value
                    )} by. The order in which sorts are applied is not guaranteed when specifying many fields in one ${`${interfaceRelationship.name.value}Sort`} object.`
                );
            });

            interfaceOptionsInput.addFields({
                sort: {
                    description: `Specify one or more ${`${interfaceRelationship.name.value}Sort`} objects to sort ${pluralize(
                        interfaceRelationship.name.value
                    )} by. The sorts will be applied in the order in which they are arranged in the array.`,
                    type: interfaceSortInput.List,
                },
            });
        }

        const interfaceWhereFields = getWhereFields({
            typeName: interfaceRelationship.name.value,
            fields: {
                scalarFields: interfaceFields.scalarFields,
                enumFields: interfaceFields.enumFields,
                temporalFields: interfaceFields.temporalFields,
                pointFields: interfaceFields.pointFields,
                primitiveFields: interfaceFields.primitiveFields,
            },
            isInterface: true,
            features,
        });

        const [
            implementationsConnectInput,
            implementationsDeleteInput,
            implementationsDisconnectInput,
            implementationsUpdateInput,
            implementationsWhereInput,
        ] = ["ConnectInput", "DeleteInput", "DisconnectInput", "UpdateInput", "Where"].map((suffix) =>
            composer.createInputTC({
                name: `${interfaceRelationship.name.value}Implementations${suffix}`,
                fields: {},
            })
        ) as [InputTypeComposer, InputTypeComposer, InputTypeComposer, InputTypeComposer, InputTypeComposer];

        composer.createInputTC({
            name: `${interfaceRelationship.name.value}Where`,
            fields: { ...interfaceWhereFields, _on: implementationsWhereInput },
        });

        const interfaceCreateInput = composer.createInputTC(`${interfaceRelationship.name.value}CreateInput`);

        const interfaceRelationshipITC = composer.getOrCreateITC(
            `${interfaceRelationship.name.value}UpdateInput`,
            (tc) => {
                tc.addFields({
                    ...objectFieldsToUpdateInputFields([
                        ...interfaceFields.primitiveFields,
                        ...interfaceFields.scalarFields,
                        ...interfaceFields.enumFields,
                        ...interfaceFields.temporalFields.filter((field) => !field.timestamps),
                        ...interfaceFields.pointFields,
                    ]),
                    _on: implementationsUpdateInput,
                });
            }
        );

        addMathOperatorsToITC(interfaceRelationshipITC);

        createRelationshipFields({
            relationshipFields: interfaceFields.relationFields,
            schemaComposer: composer,
            composeNode: composeInterface,
            sourceName: interfaceRelationship.name.value,
            nodes,
            relationshipPropertyFields: relationshipFields,
            subgraph,
        });

        relationships = [
            ...relationships,
            ...createConnectionFields({
                connectionFields: interfaceFields.connectionFields,
                schemaComposer: composer,
                composeNode: composeInterface,
                sourceName: interfaceRelationship.name.value,
                nodes,
                relationshipPropertyFields: relationshipFields,
            }),
        ];

        implementations.forEach((implementation) => {
            const node = nodes.find((n) => n.name === implementation.name.value) as Node;

            implementationsWhereInput.addFields({
                [implementation.name.value]: {
                    type: `${implementation.name.value}Where`,
                },
            });

            if (node.relationFields.length) {
                implementationsConnectInput.addFields({
                    [implementation.name.value]: {
                        type: `[${implementation.name.value}ConnectInput!]`,
                    },
                });

                implementationsDeleteInput.addFields({
                    [implementation.name.value]: {
                        type: `[${implementation.name.value}DeleteInput!]`,
                    },
                });

                implementationsDisconnectInput.addFields({
                    [implementation.name.value]: {
                        type: `[${implementation.name.value}DisconnectInput!]`,
                    },
                });
            }

            interfaceCreateInput.addFields({
                [implementation.name.value]: {
                    type: `${implementation.name.value}CreateInput`,
                },
            });

            implementationsUpdateInput.addFields({
                [implementation.name.value]: {
                    type: `${implementation.name.value}UpdateInput`,
                },
            });
        });

        if (implementationsConnectInput.getFieldNames().length) {
            const interfaceConnectInput = composer.getOrCreateITC(
                `${interfaceRelationship.name.value}ConnectInput`,
                (tc) => {
                    tc.addFields({ _on: implementationsConnectInput });
                }
            );
            interfaceConnectInput.setField("_on", implementationsConnectInput);
        }

        if (implementationsDeleteInput.getFieldNames().length) {
            const interfaceDeleteInput = composer.getOrCreateITC(
                `${interfaceRelationship.name.value}DeleteInput`,
                (tc) => {
                    tc.addFields({ _on: implementationsDeleteInput });
                }
            );
            interfaceDeleteInput.setField("_on", implementationsDeleteInput);
        }

        if (implementationsDisconnectInput.getFieldNames().length) {
            const interfaceDisconnectInput = composer.getOrCreateITC(
                `${interfaceRelationship.name.value}DisconnectInput`,
                (tc) => {
                    tc.addFields({ _on: implementationsDisconnectInput });
                }
            );
            interfaceDisconnectInput.setField("_on", implementationsDisconnectInput);
        }

        ensureNonEmptyInput(composer, `${interfaceRelationship.name.value}CreateInput`);
        ensureNonEmptyInput(composer, `${interfaceRelationship.name.value}UpdateInput`);
        [
            implementationsConnectInput,
            implementationsDeleteInput,
            implementationsDisconnectInput,
            implementationsUpdateInput,
            implementationsWhereInput,
        ].forEach((c) => ensureNonEmptyInput(composer, c));
    });

    nodes.forEach((node) => {
        const concreteEntity = schemaModel.getEntity(node.name) as ConcreteEntity;
        const concreteEntityAdapter = new ConcreteEntityAdapter(concreteEntity);

        // We wanted to get the userDefinedDirectives
        const definitionNode = definitionNodes.objectTypes.find((type) => type.name.value === node.name);
        if (!definitionNode) {
            console.error(`Definition node not found for ${node.name}`);
            return;
        }

        const userDefinedFieldDirectives = new Map<string, DirectiveNode[]>();
        for (const field of definitionNode.fields || []) {
            if (!field.directives) {
                return;
            }

            const matched = field.directives.filter(
                (directive) => !tupleIncludes(FIELD_DIRECTIVES, directive.name.value)
            );
            if (matched.length) {
                userDefinedFieldDirectives.set(field.name.value, matched);
            }
        }

        const nodeFields = concreteEntityToComposeFields(
            concreteEntityAdapter.objectFields,
            userDefinedFieldDirectives
        );
        // const nodeFields = objectFieldsToComposeFields([
        //     ...node.primitiveFields,
        //     ...node.cypherFields,
        //     ...node.enumFields,
        //     ...node.scalarFields,
        //     ...node.interfaceFields,
        //     ...node.objectFields,
        //     ...node.unionFields,
        //     ...node.temporalFields,
        //     ...node.pointFields,
        //     ...node.customResolverFields,
        // ]);

        const userDefinedObjectDirectives =
            definitionNode.directives?.filter((directive) => !tupleIncludes(OBJECT_DIRECTIVES, directive.name.value)) ||
            [];

        const propagatedDirectives =
            definitionNode.directives?.filter((directive) =>
                tupleIncludes(PROPAGATED_DIRECTIVES, directive.name.value)
            ) || [];

        const composeNode = composer.createObjectTC({
            name: concreteEntity.name,
            fields: nodeFields,
            description: concreteEntityAdapter.description,
            directives: graphqlDirectivesToCompose([...userDefinedObjectDirectives, ...propagatedDirectives]),
            interfaces: definitionNode.interfaces?.map((x) => x.name.value), // TODO: we need to get the interfaces from somewhere else?
        });

        if (concreteEntityAdapter.isGlobalNode()) {
            composeNode.setField("id", {
                type: new GraphQLNonNull(GraphQLID),
                resolve: (src) => {
                    const field = concreteEntityAdapter.globalIdField.name;
                    const value = src[field] as string | number;
                    return concreteEntityAdapter.toGlobalId(value.toString());
                },
            });

            composeNode.addInterface("Node");
        }

        const sortFields = concreteEntityAdapter.sortableFields.reduce(
            (res: InputTypeComposerFieldConfigMapDefinition, attributeAdapter) => {
                // TODO: make a nicer way of getting these user defined field directives
                const userDefinedDirectivesOnField = userDefinedFieldDirectives.get(attributeAdapter.name) || [];
                return {
                    ...res,
                    [attributeAdapter.name]: {
                        type: "SortDirection",
                        directives: graphqlDirectivesToCompose(
                            userDefinedDirectivesOnField.filter((directive) => directive.name.value === "deprecated")
                        ),
                    },
                };
            },
            {}
        );

        const nodeSortTypeName = `${concreteEntityAdapter.name}Sort`;
        if (Object.keys(sortFields).length) {
            const sortInput = composer.createInputTC({
                name: nodeSortTypeName,
                fields: sortFields,
                description: `Fields to sort ${upperFirst(
                    concreteEntityAdapter.plural
                )} by. The order in which sorts are applied is not guaranteed when specifying many fields in one ${nodeSortTypeName} object.`,
            });

            composer.createInputTC({
                name: `${concreteEntityAdapter.name}Options`,
                fields: {
                    sort: {
                        description: `Specify one or more ${nodeSortTypeName} objects to sort ${upperFirst(
                            concreteEntityAdapter.plural
                        )} by. The sorts will be applied in the order in which they are arranged in the array.`,
                        type: sortInput.NonNull.List,
                    },
                    limit: "Int",
                    offset: "Int",
                },
            });
        } else {
            composer.createInputTC({
                name: `${concreteEntityAdapter.name}Options`,
                fields: { limit: "Int", offset: "Int" },
            });
        }

        composer.createObjectTC({
            name: node.aggregateTypeNames.selection,
            fields: {
                count: {
                    type: "Int!",
                    resolve: numericalResolver,
                    args: {},
                },
                ...[...concreteEntityAdapter.primitiveFields, ...concreteEntityAdapter.temporalFields].reduce(
                    (res, field) => {
                        if (field.isList()) {
                            return res;
                        }

                        if (!field.isAggregable()) {
                            return res;
                        }

                        const objectTypeComposer = aggregationTypesMapper.getAggregationType({
                            fieldName: field.getTypeName(),
                            nullable: !field.isRequired(), // Double check
                        });

                        if (objectTypeComposer) {
                            res[field.name] = objectTypeComposer.NonNull;
                        }

                        return res;
                    },
                    {}
                ),
            },
            directives: graphqlDirectivesToCompose(propagatedDirectives),
        });

        // START WHERE FIELD -------------------

        const queryFields = getWhereFieldsFromConcreteEntity({
            concreteEntityAdapter,
            userDefinedFieldDirectives,
            features,
        });

        const nodeWhereTypeName = `${concreteEntityAdapter.name}Where`;
        composer.createInputTC({
            name: nodeWhereTypeName,
            fields: concreteEntityAdapter.isGlobalNode() ? { id: "ID", ...queryFields } : queryFields,
        });

        augmentFulltextSchema(node, composer, nodeWhereTypeName, nodeSortTypeName);

        console.log(node.uniqueFields);
        console.log(concreteEntityAdapter.uniqueFields);

        composer.createInputTC({
            name: `${concreteEntityAdapter.name}UniqueWhere`,
            fields: concreteEntityAdapter.uniqueFields.reduce((res, field) => {
                return {
                    [field.name]: field.getFieldTypeName(),
                    ...res,
                };
            }, {}),
        });

        // END WHERE FIELD -------------------

        composer.createInputTC({
            name: `${node.name}CreateInput`,
            fields: objectFieldsToCreateInputFields([
                ...node.primitiveFields.filter((field) => !field.callback),
                ...node.scalarFields,
                ...node.enumFields,
                ...node.temporalFields,
                ...node.pointFields,
            ]),
        });

        const nodeUpdateITC = composer.createInputTC({
            name: `${node.name}UpdateInput`,
            fields: objectFieldsToUpdateInputFields([
                ...node.primitiveFields.filter((field) => !field.callback),
                ...node.scalarFields,
                ...node.enumFields,
                ...node.temporalFields.filter((field) => !field.timestamps),
                ...node.pointFields,
            ]),
        });

        addMathOperatorsToITC(nodeUpdateITC);

        addArrayMethodsToITC(nodeUpdateITC, node.mutableFields);

        const mutationResponseTypeNames = node.mutationResponseTypeNames;

        composer.createObjectTC({
            name: mutationResponseTypeNames.create,
            fields: {
                info: `CreateInfo!`,
                [node.plural]: `[${node.name}!]!`,
            },
            directives: graphqlDirectivesToCompose(node.propagatedDirectives),
        });

        composer.createObjectTC({
            name: mutationResponseTypeNames.update,
            fields: {
                info: `UpdateInfo!`,
                [node.plural]: `[${node.name}!]!`,
            },
            directives: graphqlDirectivesToCompose(node.propagatedDirectives),
        });

        createRelationshipFields({
            relationshipFields: node.relationFields,
            schemaComposer: composer,
            composeNode,
            sourceName: node.name,
            nodes,
            relationshipPropertyFields: relationshipFields,
            subgraph,
        });

        relationships = [
            ...relationships,
            ...createConnectionFields({
                connectionFields: node.connectionFields,
                schemaComposer: composer,
                composeNode,
                sourceName: node.name,
                nodes,
                relationshipPropertyFields: relationshipFields,
            }),
        ];

        ensureNonEmptyInput(composer, `${node.name}UpdateInput`);
        ensureNonEmptyInput(composer, `${node.name}CreateInput`);

        const rootTypeFieldNames = node.rootTypeFieldNames;

        const schemaConfigurationFlags = getSchemaConfigurationFlags({
            globalSchemaConfiguration,
            nodeSchemaConfiguration: node.schemaConfiguration,
            excludeDirective: node.exclude,
        });

        if (schemaConfigurationFlags.read) {
            composer.Query.addFields({
                [rootTypeFieldNames.read]: findResolver({ node }),
            });
            composer.Query.setFieldDirectives(
                rootTypeFieldNames.read,
                graphqlDirectivesToCompose(node.propagatedDirectives)
            );
            composer.Query.addFields({
                [`${node.plural}Connection`]: rootConnectionResolver({ node, composer }),
            });
            composer.Query.setFieldDirectives(
                `${node.plural}Connection`,
                graphqlDirectivesToCompose(node.propagatedDirectives)
            );
        }
        if (schemaConfigurationFlags.aggregate) {
            composer.Query.addFields({
                [rootTypeFieldNames.aggregate]: aggregateResolver({ node }),
            });
            composer.Query.setFieldDirectives(
                rootTypeFieldNames.aggregate,
                graphqlDirectivesToCompose(node.propagatedDirectives)
            );
        }

        if (schemaConfigurationFlags.create) {
            composer.Mutation.addFields({
                [rootTypeFieldNames.create]: createResolver({ node }),
            });
            composer.Mutation.setFieldDirectives(
                rootTypeFieldNames.create,
                graphqlDirectivesToCompose(node.propagatedDirectives)
            );
        }

        if (schemaConfigurationFlags.delete) {
            composer.Mutation.addFields({
                [rootTypeFieldNames.delete]: deleteResolver({ node, composer }),
            });
            composer.Mutation.setFieldDirectives(
                rootTypeFieldNames.delete,
                graphqlDirectivesToCompose(node.propagatedDirectives)
            );
        }

        if (schemaConfigurationFlags.update) {
            composer.Mutation.addFields({
                [rootTypeFieldNames.update]: updateResolver({
                    node,
                    composer,
                }),
            });
            composer.Mutation.setFieldDirectives(
                rootTypeFieldNames.update,
                graphqlDirectivesToCompose(node.propagatedDirectives)
            );
        }
    });

    unionTypes.forEach((union) => {
        if (!union.types) {
            throw new Error(`Union ${union.name.value} has no types`);
        }

        const fields = union.types.reduce((f: Record<string, string>, type) => {
            return { ...f, [type.name.value]: `${type.name.value}Where` };
        }, {});

        composer.createInputTC({
            name: `${union.name.value}Where`,
            fields,
        });
    });

    if (generateSubscriptions && nodes.length) {
        generateSubscriptionTypes({
            schemaComposer: composer,
            nodes,
            relationshipFields,
            interfaceCommonFields,
            globalSchemaConfiguration,
        });
    }

    ["Mutation", "Query"].forEach((type) => {
        const objectComposer: ObjectTypeComposer = composer[type];
        const cypherType: ObjectTypeDefinitionNode = customResolvers[`customCypher${type}`];

        if (cypherType) {
            const objectFields = getObjFieldMeta({
                obj: cypherType,
                scalars: scalarTypes,
                enums: enumTypes,
                interfaces: filteredInterfaceTypes,
                unions: unionTypes,
                objects: objectTypes,
                callbacks,
            });

            const objectComposeFields = objectFieldsToComposeFields([
                ...objectFields.enumFields,
                ...objectFields.interfaceFields,
                ...objectFields.primitiveFields,
                ...objectFields.relationFields,
                ...objectFields.scalarFields,
                ...objectFields.unionFields,
                ...objectFields.objectFields,
                ...objectFields.temporalFields,
            ]);

            objectComposer.addFields(objectComposeFields);

            objectFields.cypherFields.forEach((field) => {
                const customResolver = cypherResolver({
                    field,
                    statement: field.statement,
                    type: type as "Query" | "Mutation",
                });

                const composedField = objectFieldsToComposeFields([field])[field.fieldName];

                objectComposer.addFields({ [field.fieldName]: { ...composedField, ...customResolver } });
            });
        }
    });

    filteredInterfaceTypes.forEach((inter) => {
        const objectFields = getObjFieldMeta({
            obj: inter,
            scalars: scalarTypes,
            enums: enumTypes,
            interfaces: filteredInterfaceTypes,
            unions: unionTypes,
            objects: objectTypes,
            callbacks,
        });

        const baseFields: BaseField[][] = Object.values(objectFields);
        const objectComposeFields = objectFieldsToComposeFields(baseFields.reduce((acc, x) => [...acc, ...x], []));

        composer.createInterfaceTC({
            name: inter.name.value,
            description: inter.description?.value,
            fields: objectComposeFields,
            directives: graphqlDirectivesToCompose(
                (inter.directives || []).filter(
                    (x) => !["auth", "authorization", "authentication", "exclude"].includes(x.name.value)
                )
            ),
        });
    });

    if (!Object.values(composer.Mutation.getFields()).length) {
        composer.delete("Mutation");
    }
    //  TODO: why is this now needed?
    if (!Object.values(composer.Subscription.getFields()).length) {
        composer.delete("Subscription");
    }

    const generatedTypeDefs = composer.toSDL();

    let parsedDoc = parse(generatedTypeDefs);

    const emptyObjectsInterfaces = parsedDoc.definitions
        .filter(
            (x): x is InterfaceTypeDefinitionNode | ObjectTypeDefinitionNode =>
                (x.kind === Kind.OBJECT_TYPE_DEFINITION && !isRootType(x)) || x.kind === Kind.INTERFACE_TYPE_DEFINITION
        )
        .filter((x) => !x.fields?.length);

    if (emptyObjectsInterfaces.length) {
        throw new Error(
            `Objects and Interfaces must have one or more fields: ${emptyObjectsInterfaces
                .map((x) => x.name.value)
                .join(", ")}`
        );
    }

    const documentNames = new Set(parsedDoc.definitions.filter(definitionNodeHasName).map((x) => x.name.value));
    const resolveMethods = getResolveAndSubscriptionMethods(composer);

    const generatedResolveMethods: Record<string, any> = {};

    for (const [key, value] of Object.entries(resolveMethods)) {
        if (documentNames.has(key)) {
            generatedResolveMethods[key] = value;
        }
    }

    const generatedResolvers = {
        ...generatedResolveMethods,
        ...Object.values(Scalars).reduce((res, scalar: GraphQLScalarType) => {
            if (generatedTypeDefs.includes(`scalar ${scalar.name}\n`)) {
                res[scalar.name] = scalar;
            }
            return res;
        }, {}),
        ...(hasGlobalNodes ? { Node: { __resolveType: (root) => root.__resolveType } } : {}),
    };

    unionTypes.forEach((union) => {
        // It is possible to make union types "writeonly". In this case adding a resolver for them breaks schema generation.
        const unionTypeInSchema = parsedDoc.definitions.find((def) => {
            if (def.kind === Kind.UNION_TYPE_DEFINITION && def.name.value === union.name.value) return true;
            return false;
        });
        if (!generatedResolvers[union.name.value] && unionTypeInSchema) {
            generatedResolvers[union.name.value] = { __resolveType: (root) => root.__resolveType };
        }
    });

    interfaceRelationships.forEach((i) => {
        if (!generatedResolvers[i.name.value]) {
            generatedResolvers[i.name.value] = { __resolveType: (root) => root.__resolveType };
        }
    });

    // do not propagate Neo4jGraphQL directives on schema extensions
    const schemaExtensionsWithoutNeo4jDirectives = schemaExtensions.map((schemaExtension): SchemaExtensionNode => {
        return {
            kind: schemaExtension.kind,
            loc: schemaExtension.loc,
            operationTypes: schemaExtension.operationTypes,
            directives: schemaExtension.directives?.filter(
                (schemaDirective) =>
                    !["query", "mutation", "subscription", "authentication"].includes(schemaDirective.name.value)
            ),
        };
    });
    const seen = {};
    parsedDoc = {
        ...parsedDoc,
        definitions: [
            ...parsedDoc.definitions.filter((definition) => {
                // Filter out default scalars, they are not needed and can cause issues
                if (definition.kind === Kind.SCALAR_TYPE_DEFINITION) {
                    if (["Boolean", "Float", "ID", "Int", "String"].includes(definition.name.value)) {
                        return false;
                    }
                }

                if (!("name" in definition)) {
                    return true;
                }

                const n = definition.name?.value as string;

                if (seen[n]) {
                    return false;
                }

                seen[n] = n;

                return true;
            }),
            ...schemaExtensionsWithoutNeo4jDirectives,
        ],
    };

    return {
        nodes,
        relationships,
        typeDefs: parsedDoc,
        resolvers: generatedResolvers,
    };
}

export default makeAugmentedSchema;

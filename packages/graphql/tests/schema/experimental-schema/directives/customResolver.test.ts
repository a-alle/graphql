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

import { printSchemaWithDirectives } from "@graphql-tools/utils";
import { gql } from "graphql-tag";
import { lexicographicSortSchema } from "graphql/utilities";
import { Neo4jGraphQL } from "../../../../src";

describe("@customResolver directive", () => {
    test("passes fields directly through with no generation", async () => {
        const typeDefs = gql`
            interface UserInterface {
                customResolver: String
            }

            type User implements UserInterface {
                id: ID!
                username: String!
                password: String!
                nickname: String! @customResolver
                customResolver: String @customResolver
            }
        `;

        const resolvers = {
            User: {
                nickname: () => "The user's nickname",
                customResolver: () => "Custom resolver output",
            },
        };

        const neoSchema = new Neo4jGraphQL({ typeDefs, resolvers });
        const printedSchema = printSchemaWithDirectives(lexicographicSortSchema(await neoSchema.getSchema()));

        expect(printedSchema).toMatchInlineSnapshot(`
            "schema {
              query: Query
              mutation: Mutation
            }

            \\"\\"\\"
            Information about the number of nodes and relationships created during a create mutation
            \\"\\"\\"
            type CreateInfo {
              bookmark: String @deprecated(reason: \\"This field has been deprecated because bookmarks are now handled by the driver.\\")
              nodesCreated: Int!
              relationshipsCreated: Int!
            }

            type CreateUsersMutationResponse {
              info: CreateInfo!
              users: [User!]!
            }

            \\"\\"\\"
            Information about the number of nodes and relationships deleted during a delete mutation
            \\"\\"\\"
            type DeleteInfo {
              bookmark: String @deprecated(reason: \\"This field has been deprecated because bookmarks are now handled by the driver.\\")
              nodesDeleted: Int!
              relationshipsDeleted: Int!
            }

            type IDAggregateSelection {
              longest: ID
              shortest: ID
            }

            type Mutation {
              createUsers(input: [UserCreateInput!]!): CreateUsersMutationResponse!
              deleteUsers(where: UserWhere): DeleteInfo!
              updateUsers(update: UserUpdateInput, where: UserWhere): UpdateUsersMutationResponse!
            }

            \\"\\"\\"Pagination information (Relay)\\"\\"\\"
            type PageInfo {
              endCursor: String
              hasNextPage: Boolean!
              hasPreviousPage: Boolean!
              startCursor: String
            }

            type Query {
              userInterfaces(options: UserInterfaceOptions, where: UserInterfaceWhere): [UserInterface!]!
              userInterfacesAggregate(where: UserInterfaceWhere): UserInterfaceAggregateSelection!
              userInterfacesConnection(after: String, first: Int, sort: [UserInterfaceSort], where: UserInterfaceWhere): UserInterfacesConnection!
              users(options: UserOptions, where: UserWhere): [User!]!
              usersAggregate(where: UserWhere): UserAggregateSelection!
              usersConnection(after: String, first: Int, sort: [UserSort], where: UserWhere): UsersConnection!
            }

            \\"\\"\\"An enum for sorting in either ascending or descending order.\\"\\"\\"
            enum SortDirection {
              \\"\\"\\"Sort by field values in ascending order.\\"\\"\\"
              ASC
              \\"\\"\\"Sort by field values in descending order.\\"\\"\\"
              DESC
            }

            type StringAggregateSelection {
              longest: String
              shortest: String
            }

            \\"\\"\\"
            Information about the number of nodes and relationships created and deleted during an update mutation
            \\"\\"\\"
            type UpdateInfo {
              bookmark: String @deprecated(reason: \\"This field has been deprecated because bookmarks are now handled by the driver.\\")
              nodesCreated: Int!
              nodesDeleted: Int!
              relationshipsCreated: Int!
              relationshipsDeleted: Int!
            }

            type UpdateUsersMutationResponse {
              info: UpdateInfo!
              users: [User!]!
            }

            type User implements UserInterface {
              customResolver: String
              id: ID!
              nickname: String!
              password: String!
              username: String!
            }

            type UserAggregateSelection {
              count: Int!
              id: IDAggregateSelection!
              password: StringAggregateSelection!
              username: StringAggregateSelection!
            }

            input UserCreateInput {
              id: ID!
              password: String!
              username: String!
            }

            type UserEdge {
              cursor: String!
              node: User!
            }

            interface UserInterface {
              customResolver: String
            }

            type UserInterfaceAggregateSelection {
              count: Int!
              customResolver: StringAggregateSelection!
            }

            type UserInterfaceEdge {
              cursor: String!
              node: UserInterface!
            }

            enum UserInterfaceImplementation {
              User
            }

            input UserInterfaceOptions {
              limit: Int
              offset: Int
              \\"\\"\\"
              Specify one or more UserInterfaceSort objects to sort UserInterfaces by. The sorts will be applied in the order in which they are arranged in the array.
              \\"\\"\\"
              sort: [UserInterfaceSort]
            }

            \\"\\"\\"
            Fields to sort UserInterfaces by. The order in which sorts are applied is not guaranteed when specifying many fields in one UserInterfaceSort object.
            \\"\\"\\"
            input UserInterfaceSort {
              customResolver: SortDirection
            }

            input UserInterfaceWhere {
              AND: [UserInterfaceWhere!]
              NOT: UserInterfaceWhere
              OR: [UserInterfaceWhere!]
              customResolver: String
              customResolver_CONTAINS: String
              customResolver_ENDS_WITH: String
              customResolver_IN: [String]
              customResolver_NOT: String @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              customResolver_NOT_CONTAINS: String @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              customResolver_NOT_ENDS_WITH: String @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              customResolver_NOT_IN: [String] @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              customResolver_NOT_STARTS_WITH: String @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              customResolver_STARTS_WITH: String
              typename_IN: [UserInterfaceImplementation!]
            }

            type UserInterfacesConnection {
              edges: [UserInterfaceEdge!]!
              pageInfo: PageInfo!
              totalCount: Int!
            }

            input UserOptions {
              limit: Int
              offset: Int
              \\"\\"\\"
              Specify one or more UserSort objects to sort Users by. The sorts will be applied in the order in which they are arranged in the array.
              \\"\\"\\"
              sort: [UserSort!]
            }

            \\"\\"\\"
            Fields to sort Users by. The order in which sorts are applied is not guaranteed when specifying many fields in one UserSort object.
            \\"\\"\\"
            input UserSort {
              id: SortDirection
              password: SortDirection
              username: SortDirection
            }

            input UserUpdateInput {
              id: ID
              password: String
              username: String
            }

            input UserWhere {
              AND: [UserWhere!]
              NOT: UserWhere
              OR: [UserWhere!]
              id: ID
              id_CONTAINS: ID
              id_ENDS_WITH: ID
              id_IN: [ID!]
              id_NOT: ID @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              id_NOT_CONTAINS: ID @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              id_NOT_ENDS_WITH: ID @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              id_NOT_IN: [ID!] @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              id_NOT_STARTS_WITH: ID @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              id_STARTS_WITH: ID
              password: String
              password_CONTAINS: String
              password_ENDS_WITH: String
              password_IN: [String!]
              password_NOT: String @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              password_NOT_CONTAINS: String @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              password_NOT_ENDS_WITH: String @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              password_NOT_IN: [String!] @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              password_NOT_STARTS_WITH: String @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              password_STARTS_WITH: String
              username: String
              username_CONTAINS: String
              username_ENDS_WITH: String
              username_IN: [String!]
              username_NOT: String @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              username_NOT_CONTAINS: String @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              username_NOT_ENDS_WITH: String @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              username_NOT_IN: [String!] @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              username_NOT_STARTS_WITH: String @deprecated(reason: \\"Negation filters will be deprecated, use the NOT operator to achieve the same behavior\\")
              username_STARTS_WITH: String
            }

            type UsersConnection {
              edges: [UserEdge!]!
              pageInfo: PageInfo!
              totalCount: Int!
            }"
        `);
    });
});

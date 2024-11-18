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
import { Neo4jGraphQL } from "../../../src";

describe("https://github.com/neo4j/graphql/issues/2993", () => {
    test("should generate schema with only autogenerated properties on relationship", async () => {
        const typeDefs = gql`
            interface Profile {
                id: ID!
                userName: String!
            }

            type User implements Profile @node {
                id: ID! @id
                userName: String!
                following: [Profile!]! @relationship(type: "FOLLOWS", direction: OUT, properties: "FOLLOWS")
            }

            type FOLLOWS @relationshipProperties {
                since: DateTime! @timestamp(operations: [CREATE])
            }
        `;

        const neoSchema = new Neo4jGraphQL({ typeDefs });
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
              nodesCreated: Int!
              relationshipsCreated: Int!
            }

            type CreateUsersMutationResponse {
              info: CreateInfo!
              users: [User!]!
            }

            \\"\\"\\"A date and time, represented as an ISO-8601 string\\"\\"\\"
            scalar DateTime

            type DateTimeAggregateSelection {
              max: DateTime
              min: DateTime
            }

            \\"\\"\\"
            Information about the number of nodes and relationships deleted during a delete mutation
            \\"\\"\\"
            type DeleteInfo {
              nodesDeleted: Int!
              relationshipsDeleted: Int!
            }

            \\"\\"\\"
            The edge properties for the following fields:
            * User.following
            \\"\\"\\"
            type FOLLOWS {
              since: DateTime!
            }

            input FOLLOWSAggregationWhereInput {
              AND: [FOLLOWSAggregationWhereInput!]
              NOT: FOLLOWSAggregationWhereInput
              OR: [FOLLOWSAggregationWhereInput!]
              since_MAX_EQUAL: DateTime
              since_MAX_GT: DateTime
              since_MAX_GTE: DateTime
              since_MAX_LT: DateTime
              since_MAX_LTE: DateTime
              since_MIN_EQUAL: DateTime
              since_MIN_GT: DateTime
              since_MIN_GTE: DateTime
              since_MIN_LT: DateTime
              since_MIN_LTE: DateTime
            }

            input FOLLOWSSort {
              since: SortDirection
            }

            input FOLLOWSUpdateInput {
              since_SET: DateTime
            }

            input FOLLOWSWhere {
              AND: [FOLLOWSWhere!]
              NOT: FOLLOWSWhere
              OR: [FOLLOWSWhere!]
              since: DateTime @deprecated(reason: \\"Please use the explicit _EQ version\\")
              since_EQ: DateTime
              since_GT: DateTime
              since_GTE: DateTime
              since_IN: [DateTime!]
              since_LT: DateTime
              since_LTE: DateTime
            }

            type IDAggregateSelection {
              longest: ID
              shortest: ID
            }

            type Mutation {
              createUsers(input: [UserCreateInput!]!): CreateUsersMutationResponse!
              deleteUsers(delete: UserDeleteInput, where: UserWhere): DeleteInfo!
              updateUsers(update: UserUpdateInput, where: UserWhere): UpdateUsersMutationResponse!
            }

            \\"\\"\\"Pagination information (Relay)\\"\\"\\"
            type PageInfo {
              endCursor: String
              hasNextPage: Boolean!
              hasPreviousPage: Boolean!
              startCursor: String
            }

            interface Profile {
              id: ID!
              userName: String!
            }

            type ProfileAggregateSelection {
              count: Int!
              id: IDAggregateSelection!
              userName: StringAggregateSelection!
            }

            input ProfileConnectWhere {
              node: ProfileWhere!
            }

            input ProfileCreateInput {
              User: UserCreateInput
            }

            type ProfileEdge {
              cursor: String!
              node: Profile!
            }

            enum ProfileImplementation {
              User
            }

            \\"\\"\\"
            Fields to sort Profiles by. The order in which sorts are applied is not guaranteed when specifying many fields in one ProfileSort object.
            \\"\\"\\"
            input ProfileSort {
              id: SortDirection
              userName: SortDirection
            }

            input ProfileUpdateInput {
              id_SET: ID
              userName_SET: String
            }

            input ProfileWhere {
              AND: [ProfileWhere!]
              NOT: ProfileWhere
              OR: [ProfileWhere!]
              id: ID @deprecated(reason: \\"Please use the explicit _EQ version\\")
              id_CONTAINS: ID
              id_ENDS_WITH: ID
              id_EQ: ID
              id_IN: [ID!]
              id_STARTS_WITH: ID
              typename_IN: [ProfileImplementation!]
              userName: String @deprecated(reason: \\"Please use the explicit _EQ version\\")
              userName_CONTAINS: String
              userName_ENDS_WITH: String
              userName_EQ: String
              userName_IN: [String!]
              userName_STARTS_WITH: String
            }

            type ProfilesConnection {
              edges: [ProfileEdge!]!
              pageInfo: PageInfo!
              totalCount: Int!
            }

            type Query {
              profiles(limit: Int, offset: Int, sort: [ProfileSort!], where: ProfileWhere): [Profile!]!
              profilesAggregate(where: ProfileWhere): ProfileAggregateSelection!
              profilesConnection(after: String, first: Int, sort: [ProfileSort!], where: ProfileWhere): ProfilesConnection!
              users(limit: Int, offset: Int, sort: [UserSort!], where: UserWhere): [User!]!
              usersAggregate(where: UserWhere): UserAggregateSelection!
              usersConnection(after: String, first: Int, sort: [UserSort!], where: UserWhere): UsersConnection!
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
              nodesCreated: Int!
              nodesDeleted: Int!
              relationshipsCreated: Int!
              relationshipsDeleted: Int!
            }

            type UpdateUsersMutationResponse {
              info: UpdateInfo!
              users: [User!]!
            }

            type User implements Profile {
              following(limit: Int, offset: Int, sort: [ProfileSort!], where: ProfileWhere): [Profile!]!
              followingAggregate(where: ProfileWhere): UserProfileFollowingAggregationSelection
              followingConnection(after: String, first: Int, sort: [UserFollowingConnectionSort!], where: UserFollowingConnectionWhere): UserFollowingConnection!
              id: ID!
              userName: String!
            }

            type UserAggregateSelection {
              count: Int!
              id: IDAggregateSelection!
              userName: StringAggregateSelection!
            }

            input UserCreateInput {
              following: UserFollowingFieldInput
              userName: String!
            }

            input UserDeleteInput {
              following: [UserFollowingDeleteFieldInput!]
            }

            type UserEdge {
              cursor: String!
              node: User!
            }

            input UserFollowingAggregateInput {
              AND: [UserFollowingAggregateInput!]
              NOT: UserFollowingAggregateInput
              OR: [UserFollowingAggregateInput!]
              count: Int @deprecated(reason: \\"Please use the explicit _EQ version\\")
              count_EQ: Int
              count_GT: Int
              count_GTE: Int
              count_LT: Int
              count_LTE: Int
              edge: FOLLOWSAggregationWhereInput
              node: UserFollowingNodeAggregationWhereInput
            }

            input UserFollowingConnectFieldInput {
              where: ProfileConnectWhere
            }

            type UserFollowingConnection {
              edges: [UserFollowingRelationship!]!
              pageInfo: PageInfo!
              totalCount: Int!
            }

            input UserFollowingConnectionSort {
              edge: FOLLOWSSort
              node: ProfileSort
            }

            input UserFollowingConnectionWhere {
              AND: [UserFollowingConnectionWhere!]
              NOT: UserFollowingConnectionWhere
              OR: [UserFollowingConnectionWhere!]
              edge: FOLLOWSWhere
              node: ProfileWhere
            }

            input UserFollowingCreateFieldInput {
              node: ProfileCreateInput!
            }

            input UserFollowingDeleteFieldInput {
              where: UserFollowingConnectionWhere
            }

            input UserFollowingDisconnectFieldInput {
              where: UserFollowingConnectionWhere
            }

            input UserFollowingFieldInput {
              connect: [UserFollowingConnectFieldInput!]
              create: [UserFollowingCreateFieldInput!]
            }

            input UserFollowingNodeAggregationWhereInput {
              AND: [UserFollowingNodeAggregationWhereInput!]
              NOT: UserFollowingNodeAggregationWhereInput
              OR: [UserFollowingNodeAggregationWhereInput!]
              id_MAX_EQUAL: ID
              id_MAX_GT: ID
              id_MAX_GTE: ID
              id_MAX_LT: ID
              id_MAX_LTE: ID
              id_MIN_EQUAL: ID
              id_MIN_GT: ID
              id_MIN_GTE: ID
              id_MIN_LT: ID
              id_MIN_LTE: ID
              userName_AVERAGE_LENGTH_EQUAL: Float
              userName_AVERAGE_LENGTH_GT: Float
              userName_AVERAGE_LENGTH_GTE: Float
              userName_AVERAGE_LENGTH_LT: Float
              userName_AVERAGE_LENGTH_LTE: Float
              userName_LONGEST_LENGTH_EQUAL: Int
              userName_LONGEST_LENGTH_GT: Int
              userName_LONGEST_LENGTH_GTE: Int
              userName_LONGEST_LENGTH_LT: Int
              userName_LONGEST_LENGTH_LTE: Int
              userName_SHORTEST_LENGTH_EQUAL: Int
              userName_SHORTEST_LENGTH_GT: Int
              userName_SHORTEST_LENGTH_GTE: Int
              userName_SHORTEST_LENGTH_LT: Int
              userName_SHORTEST_LENGTH_LTE: Int
            }

            type UserFollowingRelationship {
              cursor: String!
              node: Profile!
              properties: FOLLOWS!
            }

            input UserFollowingUpdateConnectionInput {
              edge: FOLLOWSUpdateInput
              node: ProfileUpdateInput
            }

            input UserFollowingUpdateFieldInput {
              connect: [UserFollowingConnectFieldInput!]
              create: [UserFollowingCreateFieldInput!]
              delete: [UserFollowingDeleteFieldInput!]
              disconnect: [UserFollowingDisconnectFieldInput!]
              update: UserFollowingUpdateConnectionInput
              where: UserFollowingConnectionWhere
            }

            type UserProfileFollowingAggregationSelection {
              count: Int!
              edge: UserProfileFollowingEdgeAggregateSelection
              node: UserProfileFollowingNodeAggregateSelection
            }

            type UserProfileFollowingEdgeAggregateSelection {
              since: DateTimeAggregateSelection!
            }

            type UserProfileFollowingNodeAggregateSelection {
              id: IDAggregateSelection!
              userName: StringAggregateSelection!
            }

            \\"\\"\\"
            Fields to sort Users by. The order in which sorts are applied is not guaranteed when specifying many fields in one UserSort object.
            \\"\\"\\"
            input UserSort {
              id: SortDirection
              userName: SortDirection
            }

            input UserUpdateInput {
              following: [UserFollowingUpdateFieldInput!]
              userName_SET: String
            }

            input UserWhere {
              AND: [UserWhere!]
              NOT: UserWhere
              OR: [UserWhere!]
              followingAggregate: UserFollowingAggregateInput
              \\"\\"\\"
              Return Users where all of the related UserFollowingConnections match this filter
              \\"\\"\\"
              followingConnection_ALL: UserFollowingConnectionWhere
              \\"\\"\\"
              Return Users where none of the related UserFollowingConnections match this filter
              \\"\\"\\"
              followingConnection_NONE: UserFollowingConnectionWhere
              \\"\\"\\"
              Return Users where one of the related UserFollowingConnections match this filter
              \\"\\"\\"
              followingConnection_SINGLE: UserFollowingConnectionWhere
              \\"\\"\\"
              Return Users where some of the related UserFollowingConnections match this filter
              \\"\\"\\"
              followingConnection_SOME: UserFollowingConnectionWhere
              \\"\\"\\"Return Users where all of the related Profiles match this filter\\"\\"\\"
              following_ALL: ProfileWhere
              \\"\\"\\"Return Users where none of the related Profiles match this filter\\"\\"\\"
              following_NONE: ProfileWhere
              \\"\\"\\"Return Users where one of the related Profiles match this filter\\"\\"\\"
              following_SINGLE: ProfileWhere
              \\"\\"\\"Return Users where some of the related Profiles match this filter\\"\\"\\"
              following_SOME: ProfileWhere
              id: ID @deprecated(reason: \\"Please use the explicit _EQ version\\")
              id_CONTAINS: ID
              id_ENDS_WITH: ID
              id_EQ: ID
              id_IN: [ID!]
              id_STARTS_WITH: ID
              userName: String @deprecated(reason: \\"Please use the explicit _EQ version\\")
              userName_CONTAINS: String
              userName_ENDS_WITH: String
              userName_EQ: String
              userName_IN: [String!]
              userName_STARTS_WITH: String
            }

            type UsersConnection {
              edges: [UserEdge!]!
              pageInfo: PageInfo!
              totalCount: Int!
            }"
        `);
    });
});

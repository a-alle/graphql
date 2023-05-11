// /*
//  * Copyright (c) "Neo4j"
//  * Neo4j Sweden AB [http://neo4j.com]
//  *
//  * This file is part of Neo4j.
//  *
//  * Licensed under the Apache License, Version 2.0 (the "License");
//  * you may not use this file except in compliance with the License.
//  * You may obtain a copy of the License at
//  *
//  *     http://www.apache.org/licenses/LICENSE-2.0
//  *
//  * Unless required by applicable law or agreed to in writing, software
//  * distributed under the License is distributed on an "AS IS" BASIS,
//  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  * See the License for the specific language governing permissions and
//  * limitations under the License.
//  */

// import { Neo4jGraphQLAuthJWTPlugin } from "@neo4j/graphql-plugin-auth";
// import { gql } from "graphql-tag";
// import type { DocumentNode } from "graphql";
// import { Neo4jGraphQL } from "../../../../../../src";
// import { formatCypher, translateQuery, formatParams } from "../../../../utils/tck-test-utils";
// import { createJwtRequest } from "../../../../../utils/create-jwt-request";

// describe("Cypher Auth Roles", () => {
//     const secret = "secret";
//     let typeDefs: DocumentNode;
//     let neoSchema: Neo4jGraphQL;

//     beforeAll(() => {
//         typeDefs = gql`
//             type History {
//                 url: String @auth(rules: [{ operations: [READ], roles: ["super-admin"] }])
//             }

//             type Comment {
//                 id: String
//                 content: String
//                 post: Post! @relationship(type: "HAS_COMMENT", direction: IN)
//             }

//             type Post {
//                 id: String
//                 content: String
//                 creator: User! @relationship(type: "HAS_POST", direction: OUT)
//                 comments: [Comment!]! @relationship(type: "HAS_COMMENT", direction: OUT)
//             }

//             type User {
//                 id: ID
//                 name: String
//                 password: String
//                 posts: [Post!]! @relationship(type: "HAS_POST", direction: OUT)
//             }

//             extend type User
//                 @auth(
//                     rules: [
//                         {
//                             operations: [READ, CREATE, UPDATE, CREATE_RELATIONSHIP, DELETE_RELATIONSHIP, DELETE]
//                             roles: ["admin"]
//                         }
//                     ]
//                 )

//             extend type Post
//                 @auth(
//                     rules: [{ operations: [CREATE_RELATIONSHIP, DELETE_RELATIONSHIP, DELETE], roles: ["super-admin"] }]
//                 )

//             extend type User {
//                 password: String @auth(rules: [{ operations: [READ, CREATE, UPDATE], roles: ["super-admin"] }])
//             }

//             extend type User {
//                 history: [History]
//                     @cypher(statement: "MATCH (this)-[:HAS_HISTORY]->(h:History) RETURN h")
//                     @auth(rules: [{ operations: [READ], roles: ["super-admin"] }])
//             }
//         `;

//         neoSchema = new Neo4jGraphQL({
//             typeDefs,
//             plugins: {
//                 auth: new Neo4jGraphQLAuthJWTPlugin({
//                     secret,
//                 }),
//             },
//         });
//     });

//     test("Read Node", async () => {
//         const query = gql`
//             {
//                 users {
//                     id
//                     name
//                 }
//             }
//         `;

//         const req = createJwtRequest("secret", { sub: "super_admin", roles: ["admin"] });
//         const result = await translateQuery(neoSchema, query, {
//             req,
//         });

//         expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
//             "MATCH (this:\`User\`)
//             WHERE apoc.util.validatePredicate(NOT (any(var1 IN [\\"admin\\"] WHERE any(var0 IN $auth.roles WHERE var0 = var1))), \\"@neo4j/graphql/FORBIDDEN\\", [0])
//             RETURN this { .id, .name } AS this"
//         `);

//         expect(formatParams(result.params)).toMatchInlineSnapshot(`
//             "{
//                 \\"auth\\": {
//                     \\"isAuthenticated\\": true,
//                     \\"roles\\": [
//                         \\"admin\\"
//                     ],
//                     \\"jwt\\": {
//                         \\"roles\\": [
//                             \\"admin\\"
//                         ],
//                         \\"sub\\": \\"super_admin\\"
//                     }
//                 }
//             }"
//         `);
//     });

//     test("Read Node & Field", async () => {
//         const query = gql`
//             {
//                 users {
//                     id
//                     name
//                     password
//                 }
//             }
//         `;

//         const req = createJwtRequest("secret", { sub: "super_admin", roles: ["admin"] });
//         const result = await translateQuery(neoSchema, query, {
//             req,
//         });

//         expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
//             "MATCH (this:\`User\`)
//             WHERE apoc.util.validatePredicate(NOT (any(var1 IN [\\"admin\\"] WHERE any(var0 IN $auth.roles WHERE var0 = var1))), \\"@neo4j/graphql/FORBIDDEN\\", [0])
//             WITH *
//             WHERE apoc.util.validatePredicate(NOT (any(var3 IN [\\"super-admin\\"] WHERE any(var2 IN $auth.roles WHERE var2 = var3))), \\"@neo4j/graphql/FORBIDDEN\\", [0])
//             RETURN this { .id, .name, .password } AS this"
//         `);

//         expect(formatParams(result.params)).toMatchInlineSnapshot(`
//             "{
//                 \\"auth\\": {
//                     \\"isAuthenticated\\": true,
//                     \\"roles\\": [
//                         \\"admin\\"
//                     ],
//                     \\"jwt\\": {
//                         \\"roles\\": [
//                             \\"admin\\"
//                         ],
//                         \\"sub\\": \\"super_admin\\"
//                     }
//                 }
//             }"
//         `);
//     });

//     test("Read Node & Cypher Field", async () => {
//         const query = gql`
//             {
//                 users {
//                     history {
//                         url
//                     }
//                 }
//             }
//         `;

//         const req = createJwtRequest("secret", { sub: "super_admin", roles: ["admin"] });
//         const result = await translateQuery(neoSchema, query, {
//             req,
//         });

//         expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
//             "MATCH (this:\`User\`)
//             WHERE apoc.util.validatePredicate(NOT (any(var1 IN [\\"admin\\"] WHERE any(var0 IN $auth.roles WHERE var0 = var1))), \\"@neo4j/graphql/FORBIDDEN\\", [0])
//             WITH *
//             WHERE apoc.util.validatePredicate(NOT (any(var3 IN [\\"super-admin\\"] WHERE any(var2 IN $auth.roles WHERE var2 = var3))), \\"@neo4j/graphql/FORBIDDEN\\", [0])
//             CALL {
//                 WITH this
//                 UNWIND apoc.cypher.runFirstColumnMany(\\"MATCH (this)-[:HAS_HISTORY]->(h:History) RETURN h\\", { this: this, auth: $auth }) AS this4
//                 RETURN collect(this4 { .url }) AS this4
//             }
//             RETURN this { history: this4 } AS this"
//         `);

//         expect(formatParams(result.params)).toMatchInlineSnapshot(`
//             "{
//                 \\"auth\\": {
//                     \\"isAuthenticated\\": true,
//                     \\"roles\\": [
//                         \\"admin\\"
//                     ],
//                     \\"jwt\\": {
//                         \\"roles\\": [
//                             \\"admin\\"
//                         ],
//                         \\"sub\\": \\"super_admin\\"
//                     }
//                 }
//             }"
//         `);
//     });

//     test("Create Node", async () => {
//         const query = gql`
//             mutation {
//                 createUsers(input: [{ id: "1" }]) {
//                     users {
//                         id
//                     }
//                 }
//             }
//         `;

//         const req = createJwtRequest("secret", { sub: "super_admin", roles: ["admin"] });
//         const result = await translateQuery(neoSchema, query, {
//             req,
//         });

//         expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
//             "UNWIND $create_param0 AS create_var0
//             CALL {
//                 WITH create_var0
//                 CREATE (create_this1:\`User\`)
//                 SET
//                     create_this1.id = create_var0.id
//                 WITH *
//                 WHERE apoc.util.validatePredicate(NOT (any(create_var3 IN [\\"admin\\"] WHERE any(create_var2 IN $auth.roles WHERE create_var2 = create_var3))), \\"@neo4j/graphql/FORBIDDEN\\", [0])
//                 RETURN create_this1
//             }
//             RETURN collect(create_this1 { .id }) AS data"
//         `);

//         expect(formatParams(result.params)).toMatchInlineSnapshot(`
//             "{
//                 \\"create_param0\\": [
//                     {
//                         \\"id\\": \\"1\\"
//                     }
//                 ],
//                 \\"resolvedCallbacks\\": {},
//                 \\"auth\\": {
//                     \\"isAuthenticated\\": true,
//                     \\"roles\\": [
//                         \\"admin\\"
//                     ],
//                     \\"jwt\\": {
//                         \\"roles\\": [
//                             \\"admin\\"
//                         ],
//                         \\"sub\\": \\"super_admin\\"
//                     }
//                 }
//             }"
//         `);
//     });

//     test("Create Node & Field", async () => {
//         const query = gql`
//             mutation {
//                 createUsers(input: [{ id: "1", password: "super-password" }]) {
//                     users {
//                         id
//                     }
//                 }
//             }
//         `;

//         const req = createJwtRequest("secret", { sub: "super_admin", roles: ["admin"] });
//         const result = await translateQuery(neoSchema, query, {
//             req,
//         });

//         expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
//             "UNWIND $create_param0 AS create_var0
//             CALL {
//                 WITH create_var0
//                 CREATE (create_this1:\`User\`)
//                 SET
//                     create_this1.id = create_var0.id,
//                     create_this1.password = create_var0.password
//                 WITH *
//                 WHERE apoc.util.validatePredicate(NOT (any(create_var3 IN [\\"admin\\"] WHERE any(create_var2 IN $auth.roles WHERE create_var2 = create_var3))), \\"@neo4j/graphql/FORBIDDEN\\", [0])
//                 WITH *
//                 WHERE apoc.util.validatePredicate(NOT (create_var0.password IS NULL OR any(create_var5 IN [\\"super-admin\\"] WHERE any(create_var4 IN $auth.roles WHERE create_var4 = create_var5))), \\"@neo4j/graphql/FORBIDDEN\\", [0])
//                 RETURN create_this1
//             }
//             RETURN collect(create_this1 { .id }) AS data"
//         `);

//         expect(formatParams(result.params)).toMatchInlineSnapshot(`
//             "{
//                 \\"create_param0\\": [
//                     {
//                         \\"id\\": \\"1\\",
//                         \\"password\\": \\"super-password\\"
//                     }
//                 ],
//                 \\"resolvedCallbacks\\": {},
//                 \\"auth\\": {
//                     \\"isAuthenticated\\": true,
//                     \\"roles\\": [
//                         \\"admin\\"
//                     ],
//                     \\"jwt\\": {
//                         \\"roles\\": [
//                             \\"admin\\"
//                         ],
//                         \\"sub\\": \\"super_admin\\"
//                     }
//                 }
//             }"
//         `);
//     });

//     test("Update Node", async () => {
//         const query = gql`
//             mutation {
//                 updateUsers(where: { id: "1" }, update: { id: "id-1" }) {
//                     users {
//                         id
//                     }
//                 }
//             }
//         `;

//         const req = createJwtRequest("secret", { sub: "super_admin", roles: ["admin"] });
//         const result = await translateQuery(neoSchema, query, {
//             req,
//         });

//         expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
//             "MATCH (this:\`User\`)
//             WHERE this.id = $param0
//             WITH this
//             CALL apoc.util.validate(NOT (any(auth_var1 IN [\\"admin\\"] WHERE any(auth_var0 IN $auth.roles WHERE auth_var0 = auth_var1))), \\"@neo4j/graphql/FORBIDDEN\\", [0])
//             SET this.id = $this_update_id
//             RETURN collect(DISTINCT this { .id }) AS data"
//         `);

//         expect(formatParams(result.params)).toMatchInlineSnapshot(`
//             "{
//                 \\"param0\\": \\"1\\",
//                 \\"this_update_id\\": \\"id-1\\",
//                 \\"resolvedCallbacks\\": {},
//                 \\"auth\\": {
//                     \\"isAuthenticated\\": true,
//                     \\"roles\\": [
//                         \\"admin\\"
//                     ],
//                     \\"jwt\\": {
//                         \\"roles\\": [
//                             \\"admin\\"
//                         ],
//                         \\"sub\\": \\"super_admin\\"
//                     }
//                 }
//             }"
//         `);
//     });

//     test("Update Node & Field", async () => {
//         const query = gql`
//             mutation {
//                 updateUsers(where: { id: "1" }, update: { password: "password" }) {
//                     users {
//                         id
//                     }
//                 }
//             }
//         `;

//         const req = createJwtRequest("secret", { sub: "super_admin", roles: ["admin"] });
//         const result = await translateQuery(neoSchema, query, {
//             req,
//         });

//         expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
//             "MATCH (this:\`User\`)
//             WHERE this.id = $param0
//             WITH this
//             CALL apoc.util.validate(NOT (any(auth_var1 IN [\\"admin\\"] WHERE any(auth_var0 IN $auth.roles WHERE auth_var0 = auth_var1)) AND any(auth_var1 IN [\\"super-admin\\"] WHERE any(auth_var0 IN $auth.roles WHERE auth_var0 = auth_var1))), \\"@neo4j/graphql/FORBIDDEN\\", [0])
//             SET this.password = $this_update_password
//             RETURN collect(DISTINCT this { .id }) AS data"
//         `);

//         expect(formatParams(result.params)).toMatchInlineSnapshot(`
//             "{
//                 \\"param0\\": \\"1\\",
//                 \\"this_update_password\\": \\"password\\",
//                 \\"resolvedCallbacks\\": {},
//                 \\"auth\\": {
//                     \\"isAuthenticated\\": true,
//                     \\"roles\\": [
//                         \\"admin\\"
//                     ],
//                     \\"jwt\\": {
//                         \\"roles\\": [
//                             \\"admin\\"
//                         ],
//                         \\"sub\\": \\"super_admin\\"
//                     }
//                 }
//             }"
//         `);
//     });

//     test("Connect", async () => {
//         const query = gql`
//             mutation {
//                 updateUsers(connect: { posts: {} }) {
//                     users {
//                         id
//                     }
//                 }
//             }
//         `;

//         const req = createJwtRequest("secret", { sub: "super_admin", roles: ["admin"] });
//         const result = await translateQuery(neoSchema, query, {
//             req,
//         });

//         expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
//             "MATCH (this:\`User\`)
//             WITH this
//             CALL {
//             	WITH this
//             	OPTIONAL MATCH (this_connect_posts0_node:Post)
//             	WITH this, this_connect_posts0_node
//             	CALL apoc.util.validate(NOT (any(auth_var1 IN [\\"super-admin\\"] WHERE any(auth_var0 IN $auth.roles WHERE auth_var0 = auth_var1)) AND any(auth_var1 IN [\\"admin\\"] WHERE any(auth_var0 IN $auth.roles WHERE auth_var0 = auth_var1))), \\"@neo4j/graphql/FORBIDDEN\\", [0])
//             	CALL {
//             		WITH *
//             		WITH collect(this_connect_posts0_node) as connectedNodes, collect(this) as parentNodes
//             		CALL {
//             			WITH connectedNodes, parentNodes
//             			UNWIND parentNodes as this
//             			UNWIND connectedNodes as this_connect_posts0_node
//             			MERGE (this)-[:HAS_POST]->(this_connect_posts0_node)
//             			RETURN count(*) AS _
//             		}
//             		RETURN count(*) AS _
//             	}
//             WITH this, this_connect_posts0_node
//             	RETURN count(*) AS connect_this_connect_posts_Post
//             }
//             WITH *
//             RETURN collect(DISTINCT this { .id }) AS data"
//         `);

//         expect(formatParams(result.params)).toMatchInlineSnapshot(`
//             "{
//                 \\"resolvedCallbacks\\": {},
//                 \\"auth\\": {
//                     \\"isAuthenticated\\": true,
//                     \\"roles\\": [
//                         \\"admin\\"
//                     ],
//                     \\"jwt\\": {
//                         \\"roles\\": [
//                             \\"admin\\"
//                         ],
//                         \\"sub\\": \\"super_admin\\"
//                     }
//                 }
//             }"
//         `);
//     });

//     test("Nested Connect", async () => {
//         const query = gql`
//             mutation {
//                 updateComments(
//                     update: {
//                         post: { update: { node: { creator: { connect: { where: { node: { id: "user-id" } } } } } } }
//                     }
//                 ) {
//                     comments {
//                         content
//                     }
//                 }
//             }
//         `;

//         const req = createJwtRequest("secret", { sub: "super_admin", roles: ["admin"] });
//         const result = await translateQuery(neoSchema, query, {
//             req,
//         });

//         expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
//             "MATCH (this:\`Comment\`)
//             WITH this
//             CALL {
//             	WITH this
//             	MATCH (this)<-[this_has_comment0_relationship:HAS_COMMENT]-(this_post0:Post)
//             	WITH this, this_post0
//             	CALL {
//             		WITH this, this_post0
//             		OPTIONAL MATCH (this_post0_creator0_connect0_node:User)
//             		WHERE this_post0_creator0_connect0_node.id = $this_post0_creator0_connect0_node_param0
//             		WITH this, this_post0, this_post0_creator0_connect0_node
//             		CALL apoc.util.validate(NOT (any(auth_var1 IN [\\"admin\\"] WHERE any(auth_var0 IN $auth.roles WHERE auth_var0 = auth_var1)) AND any(auth_var1 IN [\\"super-admin\\"] WHERE any(auth_var0 IN $auth.roles WHERE auth_var0 = auth_var1))), \\"@neo4j/graphql/FORBIDDEN\\", [0])
//             		CALL {
//             			WITH *
//             			WITH this, collect(this_post0_creator0_connect0_node) as connectedNodes, collect(this_post0) as parentNodes
//             			CALL {
//             				WITH connectedNodes, parentNodes
//             				UNWIND parentNodes as this_post0
//             				UNWIND connectedNodes as this_post0_creator0_connect0_node
//             				MERGE (this_post0)-[:HAS_POST]->(this_post0_creator0_connect0_node)
//             				RETURN count(*) AS _
//             			}
//             			RETURN count(*) AS _
//             		}
//             	WITH this, this_post0, this_post0_creator0_connect0_node
//             		RETURN count(*) AS connect_this_post0_creator0_connect_User
//             	}
//             	WITH this, this_post0
//             	CALL {
//             		WITH this_post0
//             		MATCH (this_post0)-[this_post0_creator_User_unique:HAS_POST]->(:User)
//             		WITH count(this_post0_creator_User_unique) as c
//             		CALL apoc.util.validate(NOT (c = 1), '@neo4j/graphql/RELATIONSHIP-REQUIREDPost.creator required exactly once', [0])
//             		RETURN c AS this_post0_creator_User_unique_ignored
//             	}
//             	RETURN count(*) AS update_this_post0
//             }
//             WITH this
//             CALL {
//             	WITH this
//             	MATCH (this)<-[this_post_Post_unique:HAS_COMMENT]-(:Post)
//             	WITH count(this_post_Post_unique) as c
//             	CALL apoc.util.validate(NOT (c = 1), '@neo4j/graphql/RELATIONSHIP-REQUIREDComment.post required exactly once', [0])
//             	RETURN c AS this_post_Post_unique_ignored
//             }
//             RETURN collect(DISTINCT this { .content }) AS data"
//         `);

//         expect(formatParams(result.params)).toMatchInlineSnapshot(`
//             "{
//                 \\"this_post0_creator0_connect0_node_param0\\": \\"user-id\\",
//                 \\"resolvedCallbacks\\": {},
//                 \\"auth\\": {
//                     \\"isAuthenticated\\": true,
//                     \\"roles\\": [
//                         \\"admin\\"
//                     ],
//                     \\"jwt\\": {
//                         \\"roles\\": [
//                             \\"admin\\"
//                         ],
//                         \\"sub\\": \\"super_admin\\"
//                     }
//                 }
//             }"
//         `);
//     });

//     test("Disconnect", async () => {
//         const query = gql`
//             mutation {
//                 updateUsers(disconnect: { posts: {} }) {
//                     users {
//                         id
//                     }
//                 }
//             }
//         `;

//         const req = createJwtRequest("secret", { sub: "super_admin", roles: ["admin"] });
//         const result = await translateQuery(neoSchema, query, {
//             req,
//         });

//         expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
//             "MATCH (this:\`User\`)
//             WITH this
//             CALL {
//             WITH this
//             OPTIONAL MATCH (this)-[this_disconnect_posts0_rel:HAS_POST]->(this_disconnect_posts0:Post)
//             WITH this, this_disconnect_posts0, this_disconnect_posts0_rel
//             CALL apoc.util.validate(NOT (any(auth_var1 IN [\\"admin\\"] WHERE any(auth_var0 IN $auth.roles WHERE auth_var0 = auth_var1)) AND any(auth_var1 IN [\\"super-admin\\"] WHERE any(auth_var0 IN $auth.roles WHERE auth_var0 = auth_var1))), \\"@neo4j/graphql/FORBIDDEN\\", [0])
//             CALL {
//             	WITH this_disconnect_posts0, this_disconnect_posts0_rel, this
//             	WITH collect(this_disconnect_posts0) as this_disconnect_posts0, this_disconnect_posts0_rel, this
//             	UNWIND this_disconnect_posts0 as x
//             	DELETE this_disconnect_posts0_rel
//             	RETURN count(*) AS _
//             }
//             RETURN count(*) AS disconnect_this_disconnect_posts_Post
//             }
//             WITH *
//             RETURN collect(DISTINCT this { .id }) AS data"
//         `);

//         expect(formatParams(result.params)).toMatchInlineSnapshot(`
//             "{
//                 \\"updateUsers\\": {
//                     \\"args\\": {
//                         \\"disconnect\\": {
//                             \\"posts\\": [
//                                 {}
//                             ]
//                         }
//                     }
//                 },
//                 \\"resolvedCallbacks\\": {},
//                 \\"auth\\": {
//                     \\"isAuthenticated\\": true,
//                     \\"roles\\": [
//                         \\"admin\\"
//                     ],
//                     \\"jwt\\": {
//                         \\"roles\\": [
//                             \\"admin\\"
//                         ],
//                         \\"sub\\": \\"super_admin\\"
//                     }
//                 }
//             }"
//         `);
//     });

//     test("Nested Disconnect", async () => {
//         const query = gql`
//             mutation {
//                 updateComments(
//                     update: {
//                         post: { update: { node: { creator: { disconnect: { where: { node: { id: "user-id" } } } } } } }
//                     }
//                 ) {
//                     comments {
//                         content
//                     }
//                 }
//             }
//         `;

//         const req = createJwtRequest("secret", { sub: "super_admin", roles: ["admin"] });
//         const result = await translateQuery(neoSchema, query, {
//             req,
//         });

//         expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
//             "MATCH (this:\`Comment\`)
//             WITH this
//             CALL {
//             	WITH this
//             	MATCH (this)<-[this_has_comment0_relationship:HAS_COMMENT]-(this_post0:Post)
//             	WITH this, this_post0
//             	CALL {
//             	WITH this, this_post0
//             	OPTIONAL MATCH (this_post0)-[this_post0_creator0_disconnect0_rel:HAS_POST]->(this_post0_creator0_disconnect0:User)
//             	WHERE this_post0_creator0_disconnect0.id = $updateComments_args_update_post_update_node_creator_disconnect_where_User_this_post0_creator0_disconnect0param0
//             	WITH this, this_post0, this_post0_creator0_disconnect0, this_post0_creator0_disconnect0_rel
//             	CALL apoc.util.validate(NOT (any(auth_var1 IN [\\"super-admin\\"] WHERE any(auth_var0 IN $auth.roles WHERE auth_var0 = auth_var1)) AND any(auth_var1 IN [\\"admin\\"] WHERE any(auth_var0 IN $auth.roles WHERE auth_var0 = auth_var1))), \\"@neo4j/graphql/FORBIDDEN\\", [0])
//             	CALL {
//             		WITH this_post0_creator0_disconnect0, this_post0_creator0_disconnect0_rel, this_post0
//             		WITH collect(this_post0_creator0_disconnect0) as this_post0_creator0_disconnect0, this_post0_creator0_disconnect0_rel, this_post0
//             		UNWIND this_post0_creator0_disconnect0 as x
//             		DELETE this_post0_creator0_disconnect0_rel
//             		RETURN count(*) AS _
//             	}
//             	RETURN count(*) AS disconnect_this_post0_creator0_disconnect_User
//             	}
//             	WITH this, this_post0
//             	CALL {
//             		WITH this_post0
//             		MATCH (this_post0)-[this_post0_creator_User_unique:HAS_POST]->(:User)
//             		WITH count(this_post0_creator_User_unique) as c
//             		CALL apoc.util.validate(NOT (c = 1), '@neo4j/graphql/RELATIONSHIP-REQUIREDPost.creator required exactly once', [0])
//             		RETURN c AS this_post0_creator_User_unique_ignored
//             	}
//             	RETURN count(*) AS update_this_post0
//             }
//             WITH this
//             CALL {
//             	WITH this
//             	MATCH (this)<-[this_post_Post_unique:HAS_COMMENT]-(:Post)
//             	WITH count(this_post_Post_unique) as c
//             	CALL apoc.util.validate(NOT (c = 1), '@neo4j/graphql/RELATIONSHIP-REQUIREDComment.post required exactly once', [0])
//             	RETURN c AS this_post_Post_unique_ignored
//             }
//             RETURN collect(DISTINCT this { .content }) AS data"
//         `);

//         expect(formatParams(result.params)).toMatchInlineSnapshot(`
//             "{
//                 \\"updateComments_args_update_post_update_node_creator_disconnect_where_User_this_post0_creator0_disconnect0param0\\": \\"user-id\\",
//                 \\"updateComments\\": {
//                     \\"args\\": {
//                         \\"update\\": {
//                             \\"post\\": {
//                                 \\"update\\": {
//                                     \\"node\\": {
//                                         \\"creator\\": {
//                                             \\"disconnect\\": {
//                                                 \\"where\\": {
//                                                     \\"node\\": {
//                                                         \\"id\\": \\"user-id\\"
//                                                     }
//                                                 }
//                                             }
//                                         }
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 },
//                 \\"resolvedCallbacks\\": {},
//                 \\"auth\\": {
//                     \\"isAuthenticated\\": true,
//                     \\"roles\\": [
//                         \\"admin\\"
//                     ],
//                     \\"jwt\\": {
//                         \\"roles\\": [
//                             \\"admin\\"
//                         ],
//                         \\"sub\\": \\"super_admin\\"
//                     }
//                 }
//             }"
//         `);
//     });

//     test("Delete", async () => {
//         const query = gql`
//             mutation {
//                 deleteUsers {
//                     nodesDeleted
//                 }
//             }
//         `;

//         const req = createJwtRequest("secret", { sub: "super_admin", roles: ["admin"] });
//         const result = await translateQuery(neoSchema, query, {
//             req,
//         });

//         expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
//             "MATCH (this:\`User\`)
//             WITH this
//             CALL apoc.util.validate(NOT (any(auth_var1 IN [\\"admin\\"] WHERE any(auth_var0 IN $auth.roles WHERE auth_var0 = auth_var1))), \\"@neo4j/graphql/FORBIDDEN\\", [0])
//             DETACH DELETE this"
//         `);

//         expect(formatParams(result.params)).toMatchInlineSnapshot(`
//             "{
//                 \\"auth\\": {
//                     \\"isAuthenticated\\": true,
//                     \\"roles\\": [
//                         \\"admin\\"
//                     ],
//                     \\"jwt\\": {
//                         \\"roles\\": [
//                             \\"admin\\"
//                         ],
//                         \\"sub\\": \\"super_admin\\"
//                     }
//                 }
//             }"
//         `);
//     });

//     test("Nested Delete", async () => {
//         const query = gql`
//             mutation {
//                 deleteUsers(delete: { posts: { where: {} } }) {
//                     nodesDeleted
//                 }
//             }
//         `;

//         const req = createJwtRequest("secret", { sub: "super_admin", roles: ["admin"] });
//         const result = await translateQuery(neoSchema, query, {
//             req,
//         });

//         expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
//             "MATCH (this:\`User\`)
//             WITH this
//             OPTIONAL MATCH (this)-[this_posts0_relationship:HAS_POST]->(this_posts0:Post)
//             WITH this, this_posts0
//             CALL apoc.util.validate(NOT (any(auth_var1 IN [\\"super-admin\\"] WHERE any(auth_var0 IN $auth.roles WHERE auth_var0 = auth_var1))), \\"@neo4j/graphql/FORBIDDEN\\", [0])
//             WITH this, collect(DISTINCT this_posts0) AS this_posts0_to_delete
//             CALL {
//             	WITH this_posts0_to_delete
//             	UNWIND this_posts0_to_delete AS x
//             	DETACH DELETE x
//             	RETURN count(*) AS _
//             }
//             WITH this
//             CALL apoc.util.validate(NOT (any(auth_var1 IN [\\"admin\\"] WHERE any(auth_var0 IN $auth.roles WHERE auth_var0 = auth_var1))), \\"@neo4j/graphql/FORBIDDEN\\", [0])
//             DETACH DELETE this"
//         `);

//         expect(formatParams(result.params)).toMatchInlineSnapshot(`
//             "{
//                 \\"auth\\": {
//                     \\"isAuthenticated\\": true,
//                     \\"roles\\": [
//                         \\"admin\\"
//                     ],
//                     \\"jwt\\": {
//                         \\"roles\\": [
//                             \\"admin\\"
//                         ],
//                         \\"sub\\": \\"super_admin\\"
//                     }
//                 }
//             }"
//         `);
//     });
// });
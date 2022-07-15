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

import { Neo4jGraphQLAuthJWTPlugin } from "@neo4j/graphql-plugin-auth";
import { gql } from "apollo-server";
import { Neo4jGraphQL } from "../../../src";
import { createJwtRequest } from "../../utils/create-jwt-request";
import { formatCypher, translateQuery, formatParams } from "../utils/tck-test-utils";

describe("Arrays Methods", () => {
    test("push", async () => {
        const typeDefs = gql`
            type Movie {
                title: String!
                ratings: [Float!]!
            }
        `;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            config: { enableRegex: true },
            plugins: {
                auth: new Neo4jGraphQLAuthJWTPlugin({
                    secret: "secret",
                }),
            },
        });

        const query = gql`
            mutation {
                updateMovies(update: { ratings_PUSH: 1.0 }) {
                    movies {
                        title
                        ratings
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Movie)
            CALL apoc.util.validate(this.ratings IS NULL, \\"Property %s cannot be NULL\\", ['ratings'])
            SET this.ratings = this.ratings + $this_update_ratings_PUSH
            RETURN collect(DISTINCT this { .title, .ratings }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this_update_ratings_PUSH\\": [
                    1
                ],
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("push multiple", async () => {
        const typeDefs = gql`
            type Movie {
                title: String!
                ratings: [Float!]!
                scores: [Float!]!
            }
        `;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            config: { enableRegex: true },
            plugins: {
                auth: new Neo4jGraphQLAuthJWTPlugin({
                    secret: "secret",
                }),
            },
        });

        const query = gql`
            mutation {
                updateMovies(update: { ratings_PUSH: 1.0, scores_PUSH: 1.0 }) {
                    movies {
                        title
                        ratings
                        scores
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Movie)
            CALL apoc.util.validate(this.ratings IS NULL OR this.scores IS NULL, \\"Properties %s, %s cannot be NULL\\", ['ratings', 'scores'])
            SET this.ratings = this.ratings + $this_update_ratings_PUSH
            SET this.scores = this.scores + $this_update_scores_PUSH
            RETURN collect(DISTINCT this { .title, .ratings, .scores }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this_update_ratings_PUSH\\": [
                    1
                ],
                \\"this_update_scores_PUSH\\": [
                    1
                ],
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("push (point)", async () => {
        const typeDefs = gql`
            type Movie {
                title: String!
                filmingLocations: [Point!]!
            }
        `;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            config: { enableRegex: true },
            plugins: {
                auth: new Neo4jGraphQLAuthJWTPlugin({
                    secret: "secret",
                }),
            },
        });

        const inputValue = {
            longitude: -178.7374,
            latitude: 38.4554,
            height: 60111.54,
        };

        const query = gql`
            mutation UpdateMovie($inputValue: [PointInput!]!) {
                updateMovies(update: { filmingLocations_PUSH: $inputValue }) {
                    movies {
                        title
                        filmingLocations {
                            latitude
                            longitude
                            height
                        }
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
            variableValues: { inputValue },
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Movie)
            CALL apoc.util.validate(this.filmingLocations IS NULL, \\"Property %s cannot be NULL\\", ['filmingLocations'])
            SET this.filmingLocations = this.filmingLocations + [p in $this_update_filmingLocations_PUSH | point(p)]
            RETURN collect(DISTINCT this { .title, filmingLocations: apoc.cypher.runFirstColumn('RETURN
            CASE this.filmingLocations IS NOT NULL
            	WHEN true THEN [p in this.filmingLocations | { point:p }]
            	ELSE NULL
            END AS result',{ this: this },false) }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this_update_filmingLocations_PUSH\\": [
                    {
                        \\"longitude\\": -178.7374,
                        \\"latitude\\": 38.4554,
                        \\"height\\": 60111.54
                    }
                ],
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("push auth", async () => {
        const typeDefs = gql`
            type Movie {
                title: String!
                ratings: [Float!]! @auth(rules: [{ operations: [UPDATE], isAuthenticated: true }])
            }
        `;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            config: { enableRegex: true },
            plugins: {
                auth: new Neo4jGraphQLAuthJWTPlugin({
                    secret: "secret",
                }),
            },
        });

        const query = gql`
            mutation {
                updateMovies(update: { ratings_PUSH: 1.0 }) {
                    movies {
                        title
                        ratings
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Movie)
            WITH this
            CALL apoc.util.validate(NOT (apoc.util.validatePredicate(NOT ($auth.isAuthenticated = true), \\"@neo4j/graphql/UNAUTHENTICATED\\", [0])), \\"@neo4j/graphql/FORBIDDEN\\", [0])
            CALL apoc.util.validate(this.ratings IS NULL, \\"Property %s cannot be NULL\\", ['ratings'])
            SET this.ratings = this.ratings + $this_update_ratings_PUSH
            RETURN collect(DISTINCT this { .title, .ratings }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this_update_ratings_PUSH\\": [
                    1
                ],
                \\"resolvedCallbacks\\": {},
                \\"auth\\": {
                    \\"isAuthenticated\\": true,
                    \\"roles\\": [],
                    \\"jwt\\": {
                        \\"roles\\": []
                    }
                }
            }"
        `);
    });

    test("pop", async () => {
        const typeDefs = gql`
            type Movie {
                title: String!
                ratings: [Float!]!
            }
        `;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            config: { enableRegex: true },
            plugins: {
                auth: new Neo4jGraphQLAuthJWTPlugin({
                    secret: "secret",
                }),
            },
        });

        const query = gql`
            mutation {
                updateMovies(update: { ratings_POP: 1 }) {
                    movies {
                        title
                        ratings
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Movie)
            CALL apoc.util.validate(this.ratings IS NULL, \\"Property %s cannot be NULL\\", ['ratings'])
            SET this.ratings = this.ratings[0..-$this_update_ratings_POP]
            RETURN collect(DISTINCT this { .title, .ratings }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this_update_ratings_POP\\": {
                    \\"low\\": 1,
                    \\"high\\": 0
                },
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("pop multiple", async () => {
        const typeDefs = gql`
            type Movie {
                title: String!
                ratings: [Float!]!
                scores: [Float!]!
            }
        `;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            config: { enableRegex: true },
            plugins: {
                auth: new Neo4jGraphQLAuthJWTPlugin({
                    secret: "secret",
                }),
            },
        });

        const query = gql`
            mutation {
                updateMovies(update: { ratings_POP: 1, scores_POP: 1 }) {
                    movies {
                        title
                        ratings
                        scores
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Movie)
            CALL apoc.util.validate(this.ratings IS NULL OR this.scores IS NULL, \\"Properties %s, %s cannot be NULL\\", ['ratings', 'scores'])
            SET this.ratings = this.ratings[0..-$this_update_ratings_POP]
            SET this.scores = this.scores[0..-$this_update_scores_POP]
            RETURN collect(DISTINCT this { .title, .ratings, .scores }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this_update_ratings_POP\\": {
                    \\"low\\": 1,
                    \\"high\\": 0
                },
                \\"this_update_scores_POP\\": {
                    \\"low\\": 1,
                    \\"high\\": 0
                },
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("pop auth", async () => {
        const typeDefs = gql`
            type Movie {
                title: String!
                ratings: [Float!]! @auth(rules: [{ operations: [UPDATE], isAuthenticated: true }])
            }
        `;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            config: { enableRegex: true },
            plugins: {
                auth: new Neo4jGraphQLAuthJWTPlugin({
                    secret: "secret",
                }),
            },
        });

        const query = gql`
            mutation {
                updateMovies(update: { ratings_POP: 1 }) {
                    movies {
                        title
                        ratings
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Movie)
            WITH this
            CALL apoc.util.validate(NOT (apoc.util.validatePredicate(NOT ($auth.isAuthenticated = true), \\"@neo4j/graphql/UNAUTHENTICATED\\", [0])), \\"@neo4j/graphql/FORBIDDEN\\", [0])
            CALL apoc.util.validate(this.ratings IS NULL, \\"Property %s cannot be NULL\\", ['ratings'])
            SET this.ratings = this.ratings[0..-$this_update_ratings_POP]
            RETURN collect(DISTINCT this { .title, .ratings }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this_update_ratings_POP\\": {
                    \\"low\\": 1,
                    \\"high\\": 0
                },
                \\"resolvedCallbacks\\": {},
                \\"auth\\": {
                    \\"isAuthenticated\\": true,
                    \\"roles\\": [],
                    \\"jwt\\": {
                        \\"roles\\": []
                    }
                }
            }"
        `);
    });

    test("pop and push", async () => {
        const typeDefs = gql`
            type Movie {
                title: String!
                ratings: [Float!]!
                scores: [Float!]!
            }
        `;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            config: { enableRegex: true },
            plugins: {
                auth: new Neo4jGraphQLAuthJWTPlugin({
                    secret: "secret",
                }),
            },
        });

        const query = gql`
            mutation {
                updateMovies(update: { ratings_PUSH: 1.5, scores_POP: 1 }) {
                    movies {
                        title
                        ratings
                        scores
                    }
                }
            }
        `;

        const req = createJwtRequest("secret", {});
        const result = await translateQuery(neoSchema, query, {
            req,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Movie)
            CALL apoc.util.validate(this.ratings IS NULL OR this.scores IS NULL, \\"Properties %s, %s cannot be NULL\\", ['ratings', 'scores'])
            SET this.ratings = this.ratings + $this_update_ratings_PUSH
            SET this.scores = this.scores[0..-$this_update_scores_POP]
            RETURN collect(DISTINCT this { .title, .ratings, .scores }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this_update_ratings_PUSH\\": [
                    1.5
                ],
                \\"this_update_scores_POP\\": {
                    \\"low\\": 1,
                    \\"high\\": 0
                },
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });
});

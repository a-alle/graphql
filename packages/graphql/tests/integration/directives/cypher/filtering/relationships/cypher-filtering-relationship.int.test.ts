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

import { TestHelper } from "../../../../../utils/tests-helper";

describe("cypher directive filtering - Relationship", () => {
    const testHelper = new TestHelper();

    afterEach(async () => {
        await testHelper.close();
    });

    test("relationship with single property filter", async () => {
        const Movie = testHelper.createUniqueType("Movie");
        const Actor = testHelper.createUniqueType("Actor");

        const typeDefs = /* GraphQL */ `
            type ${Movie} @node {
                title: String
                actors: [${Actor}!]!
                    @cypher(
                        statement: """
                        MATCH (this)<-[:ACTED_IN]-(actor:${Actor})
                        RETURN actor
                        """
                        columnName: "actor"
                    )
            }

            type ${Actor} @node {
                name: String
                movies: [${Movie}!]!
                    @cypher(
                        statement: """
                        MATCH (this)-[:ACTED_IN]->(movie:${Movie})
                        RETURN movie
                        """
                        columnName: "movie"
                    )
            }
        `;

        await testHelper.initNeo4jGraphQL({ typeDefs });
        await testHelper.executeCypher(
            `
            CREATE (m:${Movie} { title: "The Matrix" })
            CREATE (m2:${Movie} { title: "The Matrix Reloaded" })
            CREATE (m3:${Movie} { title: "The Matrix Revolutions" })
            CREATE (a:${Actor} { name: "Keanu Reeves" })
            CREATE (a)-[:ACTED_IN]->(m)
            CREATE (a)-[:ACTED_IN]->(m2)
            CREATE (a)-[:ACTED_IN]->(m3)
            CREATE (a2:${Actor} { name: "Carrie-Anne Moss" })
            CREATE (a2)-[:ACTED_IN]->(m)
            CREATE (a2)-[:ACTED_IN]->(m2)
            CREATE (a2)-[:ACTED_IN]->(m3)
            CREATE (a3:${Actor} { name: "Jada Pinkett Smith" })
            CREATE (a3)-[:ACTED_IN]->(m2)
            CREATE (a3)-[:ACTED_IN]->(m3)
            `,
            {}
        );

        const query = /* GraphQL */ `
            query {
                ${Movie.plural}(
                    where: {
                        actors: {
                            name_EQ: "Jada Pinkett Smith"
                        } 
                    }
                ) {
                    title
                }
            }
        `;

        const gqlResult = await testHelper.executeGraphQL(query);

        expect(gqlResult.errors).toBeFalsy();
        expect(gqlResult?.data).toEqual({
            [Movie.plural]: expect.toIncludeSameMembers([
                {
                    title: "The Matrix Reloaded",
                },
                {
                    title: "The Matrix Revolutions",
                },
            ]),
        });
    });

    test("relationship with single property filter NOT", async () => {
        const Movie = testHelper.createUniqueType("Movie");
        const Actor = testHelper.createUniqueType("Actor");

        const typeDefs = /* GraphQL */ `
            type ${Movie} @node {
                title: String
                actors: [${Actor}!]!
                    @cypher(
                        statement: """
                        MATCH (this)<-[:ACTED_IN]-(actor:${Actor})
                        RETURN actor
                        """
                        columnName: "actor"
                    )
            }

            type ${Actor} @node {
                name: String
                movies: [${Movie}!]!
                    @cypher(
                        statement: """
                        MATCH (this)-[:ACTED_IN]->(movie:${Movie})
                        RETURN movie
                        """
                        columnName: "movie"
                    )
            }
        `;

        await testHelper.initNeo4jGraphQL({ typeDefs });
        await testHelper.executeCypher(
            `
            CREATE (m:${Movie} { title: "The Matrix" })
            CREATE (m2:${Movie} { title: "The Matrix Reloaded" })
            CREATE (m3:${Movie} { title: "The Matrix Revolutions" })
            CREATE (a:${Actor} { name: "Keanu Reeves" })
            CREATE (a)-[:ACTED_IN]->(m)
            CREATE (a)-[:ACTED_IN]->(m2)
            CREATE (a)-[:ACTED_IN]->(m3)
            CREATE (a2:${Actor} { name: "Carrie-Anne Moss" })
            CREATE (a2)-[:ACTED_IN]->(m)
            CREATE (a2)-[:ACTED_IN]->(m2)
            CREATE (a2)-[:ACTED_IN]->(m3)
            CREATE (a3:${Actor} { name: "Jada Pinkett Smith" })
            CREATE (a3)-[:ACTED_IN]->(m2)
            CREATE (a3)-[:ACTED_IN]->(m3)
            `,
            {}
        );

        const query = /* GraphQL */ `
            query {
                ${Movie.plural}(
                    where: {
                        NOT: {
                            actors: {
                                name_EQ: "Jada Pinkett Smith"
                            }   
                        }
                    }
                ) {
                    title
                }
            }
        `;

        const gqlResult = await testHelper.executeGraphQL(query);

        expect(gqlResult.errors).toBeFalsy();
        expect(gqlResult?.data).toEqual({
            [Movie.plural]: expect.toIncludeSameMembers([
                {
                    title: "The Matrix",
                },
            ]),
        });
    });

    test("relationship with single property filter ALL", async () => {
        const Movie = testHelper.createUniqueType("Movie");
        const Actor = testHelper.createUniqueType("Actor");

        const typeDefs = /* GraphQL */ `
            type ${Movie} @node {
                title: String
                actors: [${Actor}!]!
                    @cypher(
                        statement: """
                        MATCH (this)<-[:ACTED_IN]-(actor:${Actor})
                        RETURN actor
                        """
                        columnName: "actor"
                    )
            }

            type ${Actor} @node {
                name: String
                movies: [${Movie}!]!
                    @cypher(
                        statement: """
                        MATCH (this)-[:ACTED_IN]->(movie:${Movie})
                        RETURN movie
                        """
                        columnName: "movie"
                    )
            }
        `;

        await testHelper.initNeo4jGraphQL({ typeDefs });
        await testHelper.executeCypher(
            `
            CREATE (m:${Movie} { title: "The Matrix" })
            CREATE (m2:${Movie} { title: "The Matrix Reloaded" })
            CREATE (a:${Actor} { name: "Keanu Reeves" })
            CREATE (a)-[:ACTED_IN]->(m)
            CREATE (a)-[:ACTED_IN]->(m2)
            CREATE (a2:${Actor} { name: "Carrie-Anne Moss" })
            CREATE (a2)-[:ACTED_IN]->(m)
            `,
            {}
        );

        const query = /* GraphQL */ `
            query {
                ${Movie.plural}(
                    where: {
                        actors_ALL: {
                            name_EQ: "Keanu Reeves"
                        } 
                    }
                ) {
                    title
                }
            }
        `;

        const gqlResult = await testHelper.executeGraphQL(query);

        expect(gqlResult.errors).toBeFalsy();
        expect(gqlResult?.data).toEqual({
            [Movie.plural]: expect.toIncludeSameMembers([
                {
                    title: "The Matrix Reloaded",
                },
            ]),
        });
    });

    test("relationship with single property filter SINGLE", async () => {
        const Movie = testHelper.createUniqueType("Movie");
        const Actor = testHelper.createUniqueType("Actor");

        const typeDefs = /* GraphQL */ `
            type ${Movie} @node {
                title: String
                actors: [${Actor}!]!
                    @cypher(
                        statement: """
                        MATCH (this)<-[:ACTED_IN]-(actor:${Actor})
                        RETURN actor
                        """
                        columnName: "actor"
                    )
            }

            type ${Actor} @node {
                name: String
                movies: [${Movie}!]!
                    @cypher(
                        statement: """
                        MATCH (this)-[:ACTED_IN]->(movie:${Movie})
                        RETURN movie
                        """
                        columnName: "movie"
                    )
            }
        `;

        await testHelper.initNeo4jGraphQL({ typeDefs });
        await testHelper.executeCypher(
            `
            CREATE (m:${Movie} { title: "The Matrix" })
            CREATE (m2:${Movie} { title: "The Matrix Reloaded" })
            CREATE (a:${Actor} { name: "Keanu Reeves" })
            CREATE (a)-[:ACTED_IN]->(m)
            CREATE (a2:${Actor} { name: "Carrie-Anne Moss" })
            CREATE (a2)-[:ACTED_IN]->(m)
            CREATE (a2)-[:ACTED_IN]->(m2)
            CREATE (a3:${Actor} { name: "Carrie-Anne Moss" })
            CREATE (a3)-[:ACTED_IN]->(m)
            `,
            {}
        );

        const query = /* GraphQL */ `
            query {
                ${Movie.plural}(
                    where: {
                        actors_SINGLE: {
                            name_EQ: "Carrie-Anne Moss"
                        } 
                    }
                ) {
                    title
                }
            }
        `;

        const gqlResult = await testHelper.executeGraphQL(query);

        expect(gqlResult.errors).toBeFalsy();
        expect(gqlResult?.data).toEqual({
            [Movie.plural]: expect.toIncludeSameMembers([
                {
                    title: "The Matrix Reloaded",
                },
            ]),
        });
    });

    test("relationship with single property filter SOME", async () => {
        const Movie = testHelper.createUniqueType("Movie");
        const Actor = testHelper.createUniqueType("Actor");

        const typeDefs = /* GraphQL */ `
            type ${Movie} @node {
                title: String
                actors: [${Actor}!]!
                    @cypher(
                        statement: """
                        MATCH (this)<-[:ACTED_IN]-(actor:${Actor})
                        RETURN actor
                        """
                        columnName: "actor"
                    )
            }

            type ${Actor} @node {
                name: String
                movies: [${Movie}!]!
                    @cypher(
                        statement: """
                        MATCH (this)-[:ACTED_IN]->(movie:${Movie})
                        RETURN movie
                        """
                        columnName: "movie"
                    )
            }
        `;

        await testHelper.initNeo4jGraphQL({ typeDefs });
        await testHelper.executeCypher(
            `
            CREATE (m:${Movie} { title: "The Matrix" })
            CREATE (m2:${Movie} { title: "The Matrix Reloaded" })
            CREATE (a:${Actor} { name: "Keanu Reeves" })
            CREATE (a)-[:ACTED_IN]->(m)
            CREATE (a)-[:ACTED_IN]->(m2)
            CREATE (a2:${Actor} { name: "Carrie-Anne Moss" })
            CREATE (a2)-[:ACTED_IN]->(m)
            `,
            {}
        );

        const query = /* GraphQL */ `
            query {
                ${Movie.plural}(
                    where: {
                        actors_SOME: {
                            name_EQ: "Keanu Reeves"
                        } 
                    }
                ) {
                    title
                }
            }
        `;

        const gqlResult = await testHelper.executeGraphQL(query);

        expect(gqlResult.errors).toBeFalsy();
        expect(gqlResult?.data).toEqual({
            [Movie.plural]: expect.toIncludeSameMembers([
                {
                    title: "The Matrix",
                },
                {
                    title: "The Matrix Reloaded",
                },
            ]),
        });
    });

    test("relationship with single property filter NONE", async () => {
        const Movie = testHelper.createUniqueType("Movie");
        const Actor = testHelper.createUniqueType("Actor");

        const typeDefs = /* GraphQL */ `
            type ${Movie} @node {
                title: String
                actors: [${Actor}!]!
                    @cypher(
                        statement: """
                        MATCH (this)<-[:ACTED_IN]-(actor:${Actor})
                        RETURN actor
                        """
                        columnName: "actor"
                    )
            }

            type ${Actor} @node {
                name: String
                movies: [${Movie}!]!
                    @cypher(
                        statement: """
                        MATCH (this)-[:ACTED_IN]->(movie:${Movie})
                        RETURN movie
                        """
                        columnName: "movie"
                    )
            }
        `;

        await testHelper.initNeo4jGraphQL({ typeDefs });
        await testHelper.executeCypher(
            `
            CREATE (m:${Movie} { title: "The Matrix" })
            CREATE (m2:${Movie} { title: "The Matrix Reloaded" })
            CREATE (a:${Actor} { name: "Keanu Reeves" })
            CREATE (a)-[:ACTED_IN]->(m)
            CREATE (a2:${Actor} { name: "Carrie-Anne Moss" })
            CREATE (a2)-[:ACTED_IN]->(m2)
            `,
            {}
        );

        const query = /* GraphQL */ `
            query {
                ${Movie.plural}(
                    where: {
                        actors_NONE: {
                            name_EQ: "Keanu Reeves"
                        } 
                    }
                ) {
                    title
                }
            }
        `;

        const gqlResult = await testHelper.executeGraphQL(query);

        expect(gqlResult.errors).toBeFalsy();
        expect(gqlResult?.data).toEqual({
            [Movie.plural]: expect.toIncludeSameMembers([
                {
                    title: "The Matrix Reloaded",
                },
            ]),
        });
    });

    test("relationship with multiple property filters", async () => {
        const Movie = testHelper.createUniqueType("Movie");
        const Actor = testHelper.createUniqueType("Actor");
        const Genre = testHelper.createUniqueType("Genre");

        const typeDefs = /* GraphQL */ `
            type ${Movie} @node {
                title: String
                genres: [${Genre}!]!
                    @cypher(
                        statement: """
                        MATCH (this)-[:IN_GENRE]->(g:${Genre})
                        RETURN g
                        """
                        columnName: "g"
                    )
                actors: [${Actor}!]!
                    @cypher(
                        statement: """
                        MATCH (this)<-[:ACTED_IN]-(actor:${Actor})
                        RETURN actor
                        """
                        columnName: "actor"
                    )
            }

            type ${Actor} @node {
                name: String
                movies: [${Movie}!]!
                    @cypher(
                        statement: """
                        MATCH (this)-[:ACTED_IN]->(movie:${Movie})
                        RETURN movie
                        """
                        columnName: "movie"
                    )
            }

            type ${Genre} @node {
                name: String
                movies: [${Movie}!]!
                    @cypher(
                        statement: """
                        MATCH (this)<-[:IN_GENRE]-(movie:${Movie})
                        RETURN movie
                        """
                        columnName: "movie"
                    )
            }
        `;

        await testHelper.initNeo4jGraphQL({ typeDefs });
        await testHelper.executeCypher(
            `
            CREATE (g:${Genre} { name: "Action" })
            CREATE (g2:${Genre} { name: "Romance" })
            CREATE (m:${Movie} { title: "The Matrix" })
            CREATE (m2:${Movie} { title: "The Matrix Reloaded" })
            CREATE (m3:${Movie} { title: "The Matrix Revolutions" })
            CREATE (m4:${Movie} { title: "A different movie" })
            CREATE (m)-[:IN_GENRE]->(g)
            CREATE (m2)-[:IN_GENRE]->(g)
            CREATE (m3)-[:IN_GENRE]->(g)
            CREATE (m4)-[:IN_GENRE]->(g2)
            CREATE (a:${Actor} { name: "Keanu Reeves" })
            CREATE (a)-[:ACTED_IN]->(m)
            CREATE (a)-[:ACTED_IN]->(m2)
            CREATE (a)-[:ACTED_IN]->(m3)
            CREATE (a2:${Actor} { name: "Carrie-Anne Moss" })
            CREATE (a2)-[:ACTED_IN]->(m)
            CREATE (a2)-[:ACTED_IN]->(m2)
            CREATE (a2)-[:ACTED_IN]->(m3)
            CREATE (a3:${Actor} { name: "Jada Pinkett Smith" })
            CREATE (a3)-[:ACTED_IN]->(m2)
            CREATE (a3)-[:ACTED_IN]->(m3)
            `,
            {}
        );

        const query = /* GraphQL */ `
            query {
                ${Movie.plural}(
                    where: { 
                        OR: [
                            { actors: { name_EQ: "Jada Pinkett Smith" } },
                            { genres: { name_EQ: "Romance" } }
                        ]
                    }
                )
                {
                    title
                }
            }
        `;

        const gqlResult = await testHelper.executeGraphQL(query);

        expect(gqlResult.errors).toBeFalsy();
        expect(gqlResult?.data).toEqual({
            [Movie.plural]: expect.toIncludeSameMembers([
                {
                    title: "A different movie",
                },
                {
                    title: "The Matrix Reloaded",
                },
                {
                    title: "The Matrix Revolutions",
                },
            ]),
        });
    });
});

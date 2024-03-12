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

import { graphql } from "graphql";
import type { Driver } from "neo4j-driver";
import { generate } from "randomstring";
import { Neo4jGraphQL } from "../../../../../src/classes";
import { UniqueType } from "../../../../utils/graphql-types";
import Neo4jHelper from "../../../neo4j";

describe("aggregations-where-node-bigint - connections", () => {
    let driver: Driver;
    let neo4j: Neo4jHelper;
    let bigInt: string;
    let User: UniqueType;
    let Post: UniqueType;
    let neoSchema: Neo4jGraphQL;

    beforeAll(async () => {
        neo4j = new Neo4jHelper();
        driver = await neo4j.getDriver();
        bigInt = "2147483647";
        User = new UniqueType("User");
        Post = new UniqueType("Post");

        const typeDefs = `
            type ${User} {
                testString: String!
                someBigInt: BigInt
            }
    
            type ${Post} {
              testString: String!
              likes: [${User}!]! @relationship(type: "LIKES", direction: IN)
            }
        `;
        neoSchema = new Neo4jGraphQL({ typeDefs });
    });

    afterAll(async () => {
        await driver.close();
    });

    test("should return posts where a like BigInt is EQUAL to", async () => {
        const session = await neo4j.getSession();

        const testString = generate({
            charset: "alphabetic",
            readable: true,
        });

        try {
            await session.run(
                `
                    CREATE (:${Post} {testString: "${testString}"})<-[:LIKES]-(:${User} {testString: "${testString}", someBigInt: toInteger(${bigInt})})
                    CREATE (:${Post} {testString: "${testString}"})
                `
            );

            const query = `
                {
                    ${Post.operations.connection}(where: { testString: "${testString}", likesAggregate: { node: { someBigInt_EQUAL: ${bigInt} } } }) {
                        edges {
                            node {
                                testString
                                likes {
                                    testString
                                    someBigInt
                                }
                            }
                        }
                    }
                }
            `;

            const gqlResult = await graphql({
                schema: await neoSchema.getSchema(),
                source: query,
                contextValue: neo4j.getContextValues(),
            });

            if (gqlResult.errors) {
                console.log(JSON.stringify(gqlResult.errors, null, 2));
            }

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[Post.operations.connection]).toEqual({
                edges: [
                    {
                        node: {
                            testString,
                            likes: [{ testString, someBigInt: bigInt }],
                        },
                    },
                ],
            });
        } finally {
            await session.close();
        }
    });

    test("should return posts where a like BigInt is GT than", async () => {
        const session = await neo4j.getSession();

        const testString = generate({
            charset: "alphabetic",
            readable: true,
        });

        const someBigInt = `${bigInt}1`;
        const someBigIntGt = bigInt.substring(0, bigInt.length - 1);

        try {
            await session.run(
                `
                    CREATE (:${Post} {testString: "${testString}"})<-[:LIKES]-(:${User} {testString: "${testString}", someBigInt: ${someBigInt}})
                    CREATE (:${Post} {testString: "${testString}"})
                `
            );

            const query = `
                {
                    ${Post.operations.connection}(where: { testString: "${testString}", likesAggregate: { node: { someBigInt_GT: ${someBigIntGt} } } }) {
                        edges {
                            node {
                                testString
                                likes {
                                    testString
                                    someBigInt
                                }
                            }
                        }
                    }
                }
            `;

            const gqlResult = await graphql({
                schema: await neoSchema.getSchema(),
                source: query,
                contextValue: neo4j.getContextValues(),
            });

            if (gqlResult.errors) {
                console.log(JSON.stringify(gqlResult.errors, null, 2));
            }

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[Post.operations.connection]).toEqual({
                edges: [
                    {
                        node: {
                            testString,
                            likes: [{ testString, someBigInt }],
                        },
                    },
                ],
            });
        } finally {
            await session.close();
        }
    });

    test("should return posts where a like BigInt is GTE than", async () => {
        const session = await neo4j.getSession();

        const testString = generate({
            charset: "alphabetic",
            readable: true,
        });

        try {
            await session.run(
                `
                    CREATE (:${Post} {testString: "${testString}"})<-[:LIKES]-(:${User} {testString: "${testString}", someBigInt: toInteger(${bigInt})})
                    CREATE (:${Post} {testString: "${testString}"})
                `
            );

            const query = `
                {
                    ${Post.operations.connection}(where: { testString: "${testString}", likesAggregate: { node: { someBigInt_GTE: ${bigInt} } } }) {
                        edges {
                            node {
                                testString
                                likes {
                                    testString
                                    someBigInt
                                }
                            }
                        }
                    }
                }
            `;

            const gqlResult = await graphql({
                schema: await neoSchema.getSchema(),
                source: query,
                contextValue: neo4j.getContextValues(),
            });

            if (gqlResult.errors) {
                console.log(JSON.stringify(gqlResult.errors, null, 2));
            }

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[Post.operations.connection]).toEqual({
                edges: [
                    {
                        node: {
                            testString,
                            likes: [{ testString, someBigInt: bigInt }],
                        },
                    },
                ],
            });
        } finally {
            await session.close();
        }
    });

    test("should return posts where a like BigInt is LT than", async () => {
        const session = await neo4j.getSession();

        const testString = generate({
            charset: "alphabetic",
            readable: true,
        });

        const someBigIntLT = `${bigInt}1`;

        try {
            await session.run(
                `
                    CREATE (:${Post} {testString: "${testString}"})<-[:LIKES]-(:${User} {testString: "${testString}", someBigInt: toInteger(${bigInt})})
                    CREATE (:${Post} {testString: "${testString}"})
                `
            );

            const query = `
                {
                    ${Post.operations.connection}(where: { testString: "${testString}", likesAggregate: { node: { someBigInt_LT: ${someBigIntLT} } } }) {
                        edges {
                            node {
                                testString
                                likes {
                                    testString
                                    someBigInt
                                }
                            }
                        }
                    }
                }
            `;

            const gqlResult = await graphql({
                schema: await neoSchema.getSchema(),
                source: query,
                contextValue: neo4j.getContextValues(),
            });

            if (gqlResult.errors) {
                console.log(JSON.stringify(gqlResult.errors, null, 2));
            }

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[Post.operations.connection]).toEqual({
                edges: [
                    {
                        node: {
                            testString,
                            likes: [{ testString, someBigInt: bigInt }],
                        },
                    },
                ],
            });
        } finally {
            await session.close();
        }
    });

    test("should return posts where a like BigInt is LTE than", async () => {
        const session = await neo4j.getSession();

        const testString = generate({
            charset: "alphabetic",
            readable: true,
        });

        try {
            await session.run(
                `
                    CREATE (:${Post} {testString: "${testString}"})<-[:LIKES]-(:${User} {testString: "${testString}", someBigInt: toInteger(${bigInt})})
                    CREATE (:${Post} {testString: "${testString}"})
                `
            );

            const query = `
                {
                    ${Post.operations.connection}(where: { testString: "${testString}", likesAggregate: { node: { someBigInt_LTE: ${bigInt} } } }) {
                       edges {
                            node {
                                testString
                                likes {
                                    testString
                                    someBigInt
                                }
                            }
                        }
                    }
                }
            `;

            const gqlResult = await graphql({
                schema: await neoSchema.getSchema(),
                source: query,
                contextValue: neo4j.getContextValues(),
            });

            if (gqlResult.errors) {
                console.log(JSON.stringify(gqlResult.errors, null, 2));
            }

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[Post.operations.connection]).toEqual({
                edges: [
                    {
                        node: {
                            testString,
                            likes: [{ testString, someBigInt: bigInt }],
                        },
                    },
                ],
            });
        } finally {
            await session.close();
        }
    });
});

describe("aggregations-where-node-bigint - connections - interface relationships of concrete types", () => {
    let driver: Driver;
    let neo4j: Neo4jHelper;
    let bigInt: string;
    let User: UniqueType;
    let Post: UniqueType;
    let Person: UniqueType;
    let neoSchema: Neo4jGraphQL;

    beforeAll(async () => {
        neo4j = new Neo4jHelper();
        driver = await neo4j.getDriver();
        bigInt = "2147483647";
        User = new UniqueType("User");
        Post = new UniqueType("Post");
        Person = new UniqueType("Person");

        const typeDefs = `
        interface Human {
            testString: String!
            someBigInt: BigInt
        }

        type ${Person} implements Human {
            testString: String!
            someBigInt: BigInt
        }


            type ${User} implements Human {
                testString: String!
                someBigInt: BigInt
            }
    
            type ${Post} {
              testString: String!
              likes: [Human!]! @relationship(type: "LIKES", direction: IN)
            }
        `;
        neoSchema = new Neo4jGraphQL({ typeDefs });
    });

    afterAll(async () => {
        await driver.close();
    });

    test("should return posts where a like BigInt is EQUAL to", async () => {
        const session = await neo4j.getSession();

        const testString = generate({
            charset: "alphabetic",
            readable: true,
        });

        try {
            await session.run(
                `
                    CREATE (:${Post} {testString: "${testString}"})<-[:LIKES]-(:${User} {testString: "${testString}", someBigInt: toInteger(${bigInt})})
                    CREATE (:${Post} {testString: "${testString}"})
                `
            );

            const query = `
                {
                    ${Post.operations.connection}(where: { testString: "${testString}", likesAggregate: { node: { someBigInt_EQUAL: ${bigInt} } } }) {
                        edges {
                            node {
                                testString
                                likes {
                                    testString
                                    someBigInt
                                }
                            }
                        }
                    }
                }
            `;

            const gqlResult = await graphql({
                schema: await neoSchema.getSchema(),
                source: query,
                contextValue: neo4j.getContextValues(),
            });

            if (gqlResult.errors) {
                console.log(JSON.stringify(gqlResult.errors, null, 2));
            }

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[Post.operations.connection]).toEqual({
                edges: [
                    {
                        node: {
                            testString,
                            likes: [{ testString, someBigInt: bigInt }],
                        },
                    },
                ],
            });
        } finally {
            await session.close();
        }
    });

    test("should return posts where a like BigInt is GT than", async () => {
        const session = await neo4j.getSession();

        const testString = generate({
            charset: "alphabetic",
            readable: true,
        });

        const someBigInt = `${bigInt}1`;
        const someBigIntGt = bigInt.substring(0, bigInt.length - 1);

        try {
            await session.run(
                `
                    CREATE (:${Post} {testString: "${testString}"})<-[:LIKES]-(:${User} {testString: "${testString}", someBigInt: ${someBigInt}})
                    CREATE (:${Post} {testString: "${testString}"})
                `
            );

            const query = `
                {
                    ${Post.operations.connection}(where: { testString: "${testString}", likesAggregate: { node: { someBigInt_GT: ${someBigIntGt} } } }) {
                       edges {
                        node {
                             testString
                                likes {
                                    testString
                                    someBigInt
                                }
                            }
                        }
                    }
                }
            `;

            const gqlResult = await graphql({
                schema: await neoSchema.getSchema(),
                source: query,
                contextValue: neo4j.getContextValues(),
            });

            if (gqlResult.errors) {
                console.log(JSON.stringify(gqlResult.errors, null, 2));
            }

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[Post.operations.connection]).toEqual({
                edges: [
                    {
                        node: {
                            testString,
                            likes: [{ testString, someBigInt }],
                        },
                    },
                ],
            });
        } finally {
            await session.close();
        }
    });

    test("should return posts where a like BigInt is GTE than", async () => {
        const session = await neo4j.getSession();

        const testString = generate({
            charset: "alphabetic",
            readable: true,
        });

        try {
            await session.run(
                `
                    CREATE (:${Post} {testString: "${testString}"})<-[:LIKES]-(:${User} {testString: "${testString}", someBigInt: toInteger(${bigInt})})
                    CREATE (:${Post} {testString: "${testString}"})
                `
            );

            const query = `
                {
                    ${Post.operations.connection}(where: { testString: "${testString}", likesAggregate: { node: { someBigInt_GTE: ${bigInt} } } }) {
                        edges {
                            node {
                                testString
                                likes {
                                    testString
                                    someBigInt
                                }
                            }
                        }
                    }
                }
            `;

            const gqlResult = await graphql({
                schema: await neoSchema.getSchema(),
                source: query,
                contextValue: neo4j.getContextValues(),
            });

            if (gqlResult.errors) {
                console.log(JSON.stringify(gqlResult.errors, null, 2));
            }

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[Post.operations.connection]).toEqual({
                edges: [
                    {
                        node: {
                            testString,
                            likes: [{ testString, someBigInt: bigInt }],
                        },
                    },
                ],
            });
        } finally {
            await session.close();
        }
    });

    test("should return posts where a like BigInt is LT than", async () => {
        const session = await neo4j.getSession();

        const testString = generate({
            charset: "alphabetic",
            readable: true,
        });

        const someBigIntLT = `${bigInt}1`;

        try {
            await session.run(
                `
                    CREATE (:${Post} {testString: "${testString}"})<-[:LIKES]-(:${User} {testString: "${testString}", someBigInt: toInteger(${bigInt})})
                    CREATE (:${Post} {testString: "${testString}"})
                `
            );

            const query = `
                {
                    ${Post.operations.connection}(where: { testString: "${testString}", likesAggregate: { node: { someBigInt_LT: ${someBigIntLT} } } }) {
                        edges {
                            node {
                                testString
                                likes {
                                    testString
                                    someBigInt
                                }
                            }
                        }
                    }
                }
            `;

            const gqlResult = await graphql({
                schema: await neoSchema.getSchema(),
                source: query,
                contextValue: neo4j.getContextValues(),
            });

            if (gqlResult.errors) {
                console.log(JSON.stringify(gqlResult.errors, null, 2));
            }

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[Post.operations.connection]).toEqual({
                edges: [
                    {
                        node: {
                            testString,
                            likes: [{ testString, someBigInt: bigInt }],
                        },
                    },
                ],
            });
        } finally {
            await session.close();
        }
    });

    test("should return posts where a like BigInt is LTE than", async () => {
        const session = await neo4j.getSession();

        const testString = generate({
            charset: "alphabetic",
            readable: true,
        });

        try {
            await session.run(
                `
                    CREATE (:${Post} {testString: "${testString}"})<-[:LIKES]-(:${User} {testString: "${testString}", someBigInt: toInteger(${bigInt})})
                    CREATE (:${Post} {testString: "${testString}"})
                `
            );

            const query = `
                {
                    ${Post.operations.connection}(where: { testString: "${testString}", likesAggregate: { node: { someBigInt_LTE: ${bigInt} } } }) {
                        edges {
                            node {
                                testString
                                likes {
                                    testString
                                    someBigInt
                                }
                            }
                        }
                    }
                }
            `;

            const gqlResult = await graphql({
                schema: await neoSchema.getSchema(),
                source: query,
                contextValue: neo4j.getContextValues(),
            });

            if (gqlResult.errors) {
                console.log(JSON.stringify(gqlResult.errors, null, 2));
            }

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[Post.operations.connection]).toEqual({
                edges: [
                    {
                        node: {
                            testString,
                            likes: [{ testString, someBigInt: bigInt }],
                        },
                    },
                ],
            });
        } finally {
            await session.close();
        }
    });
});

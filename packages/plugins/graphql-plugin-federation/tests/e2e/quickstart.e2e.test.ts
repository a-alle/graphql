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

import type * as neo4j from "neo4j-driver";
import supertest from "supertest";
import { generateUniqueType, UniqueType } from "../utils/graphql-types";
import { GatewayServer } from "./setup/gateway-server";
import type { Server } from "./setup/server";
import { Subgraph } from "./setup/subgraph";
import { SubgraphServer } from "./setup/subgraph-server";
import { Neo4j } from "./setup/neo4j";

describe("Federation 2 quickstart (https://www.apollographql.com/docs/federation/quickstart/setup/)", () => {
    let locationsServer: Server;
    let reviewsServer: Server;
    let gatewayServer: Server;

    let neo4j: Neo4j;

    let gatewayUrl: string;

    let Location: UniqueType;
    let Review: UniqueType;

    beforeAll(async () => {
        Location = generateUniqueType("Location");
        Review = generateUniqueType("Review");

        const locations = `
            extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

            type ${Location} @key(fields: "id") {
                id: ID!
                "The name of the location"
                name: String
                "A short description about the location"
                description: String
                "The location's main photo as a URL"
                photo: String
            }
        `;

        const reviews = `
            extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

            type ${Location} @key(fields: "id") {
                id: ID!
                "The calculated overall rating based on all reviews"
                overallRating: Float
                "All submitted reviews about this location"
                reviewsForLocation: [${Review}!]!
            }

            type ${Review} {
                id: ID!
                "Written text"
                comment: String
                "A number from 1 - 5 with 1 being lowest and 5 being highest"
                rating: Int
                "The location the review is about"
                location: ${Location}
            }
        `;

        neo4j = new Neo4j();
        await neo4j.init();

        const locationsSubgraph = new Subgraph(locations, neo4j.driver);
        const reviewsSubgraph = new Subgraph(reviews, neo4j.driver);

        const [locationsSchema, reviewsSchema] = await Promise.all([
            locationsSubgraph.getSchema(),
            reviewsSubgraph.getSchema(),
        ]);

        locationsServer = new SubgraphServer(locationsSchema, 4000);
        reviewsServer = new SubgraphServer(reviewsSchema, 4001);

        const [locationsUrl, reviewsUrl] = await Promise.all([locationsServer.start(), reviewsServer.start()]);

        gatewayServer = new GatewayServer(
            [
                { name: "locations", url: locationsUrl },
                { name: "reviews", url: reviewsUrl },
            ],
            4002
        );

        gatewayUrl = await gatewayServer.start();

        await neo4j.executeWrite(
            `CREATE (:${Location} { id: "1", description: "description", name: "name", overallRating: 5.5, photo: "photo" })`
        );
    });

    afterAll(async () => {
        await gatewayServer.stop();
        await Promise.all([locationsServer.stop(), reviewsServer.stop()]);
        await neo4j.close();
    });

    test("all Location fields can be resolved across both subgraphs", async () => {
        const request = supertest(gatewayUrl);

        const response = await request.post("").send({
            query: `
            {
                ${Location.plural} {
                  description
                  id
                  name
                  overallRating
                  photo
                }
              }
        `,
        });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            data: {
                [Location.plural]: [
                    { description: "description", id: "1", name: "name", overallRating: 5.5, photo: "photo" },
                ],
            },
        });
    });
});

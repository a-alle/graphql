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

import { mergeTypeDefs } from "@graphql-tools/merge";
import { gql } from "graphql-tag";
import type { ConcreteEntityAdapter } from "../../../src/schema-model/entity/model-adapters/ConcreteEntityAdapter";
import { generateModel } from "../../../src/schema-model/generate-model";

describe("https://github.com/neo4j/graphql/issues/4001", () => {
    test("https://github.com/neo4j/graphql/issues/4001", () => {
        const typeDefs = gql`
            input Pagination {
                limit: Int = 20
                offset: Int = 0
            }

            type Video {
                id: ID!
            }

            type Serie {
                id: ID!

                allEpisodes(options: Pagination): [Video!]!
                    @cypher(
                        statement: """
                        MATCH (n:Video) RETURN n
                        SKIP toInteger($options.offset) LIMIT toInteger($options.limit)
                        """
                        columnName: "n"
                    )
            }
        `;
        const document = mergeTypeDefs(typeDefs);
        const schemaModel = generateModel(document);
        const serie = schemaModel.getConcreteEntityAdapter("Serie") as ConcreteEntityAdapter;
        expect(serie.attributes.get("allEpisodes")).toBeDefined();
    });
});

import type { BCClient } from "../client/client.js";
import type { StandardSchemaV1 } from "../validation/standard-schema.js";
import { ApiPage, type ODataQuery, type PaginationOpts } from "./api-page.js";

export class APIQuery<T> {
	#apiPage;

	constructor(client: BCClient, endpoint: string, schema: StandardSchemaV1<T>) {
		this.#apiPage = new ApiPage(client, endpoint, schema);
	}

	list(query: ODataQuery, pOpts?: PaginationOpts): AsyncIterableIterator<T> {
		return this.#apiPage.list(query, pOpts);
	}
}

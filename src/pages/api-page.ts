import { startsWith } from "zod";
import type { BCClient, RequestOpts } from "../client/client.js";
import { BCError } from "../error/error.js";
import { parseSchema } from "../validation/parse-schema.js";
import type { StandardSchemaV1 } from "../validation/standard-schema.js";

/*=============================== Types ===================================*/

export type PaginationOpts = {
	maxResults?: number;
	serverPageLimit?: number;
};

/** A query string of OData properties. */
export type ODataQuery = string;

/*=============================== Main class ===================================*/

/** ApiPage represents an API Page for a collection.
 * It uses the Standard Schema of an individual row result.
 * It has full CRUD functionality.
 */
export class ApiPage<TOutput, TInput> {
	#schema: StandardSchemaV1<TInput, TOutput>;
	readonly endpoint: string;
	readonly client: BCClient;

	constructor(
		client: BCClient,
		endpoint: string,
		schema: StandardSchemaV1<TInput, TOutput>,
	) {
		this.endpoint = endpoint;
		this.#schema = schema;
		this.client = client;
	}

	async getById(id: string, query?: ODataQuery): Promise<TOutput> {
		const opts = { params: new URLSearchParams(query) };

		return await this.client.requestWithSchema(
			this.#endpointWithId(id),
			this.#schema,
			opts,
		);
	}

	async *list(
		query?: ODataQuery,
		pOpts?: PaginationOpts,
	): AsyncIterableIterator<TOutput> {
		let skipToken = "";
		let itemCount = 0;

		console.log("list query", query);

		while (true) {
			const opts: RequestOpts = {
				serverPageSize: pOpts?.serverPageLimit,
			};

			if (skipToken) {
				const params = new URLSearchParams(query);
				console.log({ params });
				params.append("$skipToken", skipToken);
				opts.params = params;
			}

			const data = (await this.client.request(this.endpoint, {
				params: opts.params,
			})) as {
				value: unknown[];
				"@odata.nextLink"?: string;
			};

			// Check the wrapper {value: []T}
			if (!data.value || !Array.isArray(data.value)) {
				const err = BCError.fromSchemaValidation([
					{
						message: "Missing value property on list response.",
						path: "root.value",
					},
				]);
				err.responseData = data;
				throw err;
			}

			if (data["@odata.nextLink"]) {
				skipToken =
					URL.parse(data["@odata.nextLink"])?.searchParams.get("skipToken") ||
					"";
			}

			for (const item of data.value) {
				const result = await parseSchema(this.#schema, item);
				if (result.issues) {
					throw BCError.fromSchemaValidation(result.issues);
				}

				yield result.data;
				itemCount++;

				// Break out and return when limit reached
				if (pOpts?.maxResults && itemCount >= pOpts.maxResults) {
					return;
				}
			}
		}
	}

	async findOne(query: ODataQuery): Promise<TOutput | null> {
		for await (const item of this.list(query, { serverPageLimit: 1 })) {
			return item;
		}
		return null;
	}

	async update(
		id: string,
		updateCommand: Partial<TInput>,
		query?: ODataQuery,
	): Promise<TOutput> {
		const data = await this.client.requestWithSchema(
			this.#endpointWithId(id),
			this.#schema,
			{
				method: "PATCH",
				payload: updateCommand,
				params: new URLSearchParams(query),
			},
		);
		return data;
	}

	async create(
		createCommand: Partial<TInput>,
		query: ODataQuery,
	): Promise<TOutput> {
		const data = await this.client.requestWithSchema(
			this.endpoint,
			this.#schema,
			{
				method: "POST",
				payload: createCommand,
				params: new URLSearchParams(query),
			},
		);
		return data;
	}

	async delete(id: string) {
		await this.client.request(this.#endpointWithId(id), { method: "DELETE" });
	}

	#endpointWithId(id: string) {
		return `${this.endpoint}(${id})`;
	}
}

import type { UUID } from "node:crypto";
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
export class ApiPage<
	T,
	TCreate = unknown,
	TUpdate = unknown,
	TActions extends string = string,
> {
	#schema: StandardSchemaV1<unknown, T>;
	readonly endpoint: string;
	readonly client: BCClient;

	constructor(
		client: BCClient,
		endpoint: string,
		schema: StandardSchemaV1<unknown, T>,
	) {
		this.endpoint = endpoint;
		this.#schema = schema;
		this.client = client;
	}

	withCommands<
		TNewCreate,
		TNewUpdate,
		TNewActions extends string = string,
	>(): ApiPage<T, TNewCreate, TNewUpdate, TNewActions> {
		return this as unknown as ApiPage<T, TNewCreate, TNewUpdate, TNewActions>;
	}

	async getById(id: string, query?: ODataQuery): Promise<T> {
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
	): AsyncIterableIterator<T> {
		let more = true;
		let skipToken = "";
		let itemCount = 0;

		while (more) {
			const opts: RequestOpts = {
				serverPageSize: pOpts?.serverPageLimit,
			};
			opts.params = new URLSearchParams(query);

			if (skipToken) {
				opts.params.append("$skipToken", skipToken);
			}

			const data = (await this.client.request(this.endpoint, opts)) as {
				value?: unknown[];
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

				console.log({ skipToken });
			}

			if (!data.value.length) {
				more = false;
				break;
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
					more = false;
					break;
				}
			}
		}
	}

	async findOne(query: ODataQuery): Promise<T | null> {
		let found = null;
		for await (const item of this.list(query, { serverPageLimit: 1 })) {
			found = item;
			break;
		}
		return found;
	}

	async update(
		id: string | UUID,
		updateCommand: TUpdate,
		query?: ODataQuery,
	): Promise<T> {
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

	async create(createCommand: TCreate, query?: ODataQuery): Promise<T> {
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

	async delete(id: string): Promise<void> {
		await this.client.request(this.#endpointWithId(id), { method: "DELETE" });
	}

	/** Executes a bound action. Use the withCommands method to add types to give options. */
	async action(id: string, action: TActions): Promise<void> {
		const actionEndpoint = `${this.#endpointWithId(id)}/Microsoft.NAV.${action}`;

		await this.client.request(actionEndpoint, {
			method: "POST",
		});
	}

	#endpointWithId(id: string) {
		return `${this.endpoint}(${id})`;
	}
}

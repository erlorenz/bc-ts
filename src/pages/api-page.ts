import z, { string } from "zod";
import type { BCClient, ODataQuery, RequestOpts } from "../client/client.js";
import { BCError } from "../error/error.js";
import { parseSchema } from "../validation/parse-schema.js";
import type { StandardSchemaV1 } from "../validation/standard-schema.js";

type PaginationOptions = { maxResults?: number; serverPageLimit?: number };

export class ApiPage<TOutput, I> {
	#schema: StandardSchemaV1<I, TOutput>;
	readonly endpoint: string;
	readonly client: BCClient;

	constructor(
		client: BCClient,
		endpoint: string,
		schema: StandardSchemaV1<I, TOutput>,
	) {
		this.endpoint = endpoint;
		this.#schema = schema;
		this.client = client;
	}

	async getById(id: string): Promise<TOutput> {
		return await this.client.requestWithSchema(
			`${this.endpoint}(${id})`,
			this.#schema,
		);
	}

	async *list(
		query: ODataQuery,
		pOpts?: PaginationOptions,
	): AsyncIterableIterator<TOutput> {
		let skipToken = "";
		const itemCount = 0;

		while (true) {
			const opts: RequestOpts = {
				serverPageSize: pOpts?.serverPageLimit,
			};

			if (skipToken) {
				opts.params = query.toURLSearchParams();
				opts.params.append("skipToken", skipToken);
			}

			const data = (await this.client.request(this.endpoint, {})) as {
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
				itemIndex++;

				// Break out and return when limit reached
				if (pOpts?.maxResults && itemIndex > pOpts.maxResults) {
					return;
				}
			}
		}
	}

	async findByKey<K extends keyof I>(
		key: K,
		value: I[K],
	): Promise<TOutput | null> {
		return {} as TOutput;
	}

	async findOne(q: ODataQuery): Promise<TOutput | null> {
		return null;
	}
}

const schema = z
	.object({ id: z.string(), name: z.string(), createdAt: z.string() })
	.transform((val) => ({
		id: val.id,
		createdAt: new Date(val.createdAt),
		name: val.name,
	}));

const client = {} as BCClient;
const page = new ApiPage(client, "something", schema);

let item = await page.getById("dsfsd");

item = await page.findByKey("createdAt");

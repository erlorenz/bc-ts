import packageJson from "../../package.json" with { type: "json" };
import { BCError } from "../error/error.js";
import { parseSchema } from "../error/parse-schema.js";
import type { StandardSchemaV1 } from "../error/standard-schema.js";
import {
	isEmpty,
	isValidGUID,
	isValidURL,
	notEmpty,
} from "../validation/validation.js";

/*=============================== Constants ===================================*/

// Initialization
export const BC_BASE_URL = "https://api.businesscentral.dynamics.com/v2.0";
export const DEFAULT_TIMEOUT = 30_000;
export const BC_DEFAULT_SCOPE =
	"https://api.businesscentral.dynamics.com/.default";

// Headers and Request options
const HEADER_DATA_ACCESS_INTENT = "Data-Access-Intent";
const HEADER_AUTH = "Authorization";
const HEADER_ACCEPTS = "Accepts";
const HEADER_CONTENT_TYPE = "Content-Type";
const HEADER_IF_MATCH = "If-Match";
const HEADER_PREFER = "Prefer";
const HEADER_USER_AGENT = "User-Agent";
const HEADER_CORRELATION_ID = "request-id";
// Header values
const DATA_ACCESS_READONLY = "ReadOnly";
const DATA_ACCESS_READWRITE = "ReadWrite";
const CONTENTTYPE_JSON = "application/json";
const ODATA_PAGE_SIZE = "odata.maxpagesize";

/*=============================== Types and Interfaces ===================================*/

export type BCConfig = {
	tenantId: string;
	environment: string;
	companyId: string;
	timeout?: number;
	baseURL?: string;
	userAgent?: string;
};

/** The options used for an individual request. */
type RequestOpts = {
	// group?: "sod" | "v2" | "manamed_connect" | "batch";
	// group?: "v2" | "manamed_connect" | "batch";
	method?: "GET" | "POST" | "PATCH" | "DELETE";
	params?: QueryBuilder;
	payload?: unknown;
	timeout?: number;
	serverPageSize?: number;
};

/** Builds URLSearchParams and a query string. */
export interface QueryBuilder {
	toURLSearchParams(): URLSearchParams;
	toQuery(): string;
}

/** Satisfies the \@azure/identity TokenCredential. Can also use MSAL-node.  */
export interface AuthClient {
	getToken(scope: string): Promise<string>;
}

/*=============================== Main Client ===================================*/
/** Business Central API client. Use one client per API path. Takes an
 * AuthClient that is satisfied by \@azure/identity or msal-node.
 */
export class BCClient {
	readonly auth;
	readonly apiPath;
	readonly apiURL;
	readonly scope = BC_DEFAULT_SCOPE;
	readonly userAgent;
	readonly timeout;

	constructor(config: BCConfig, apiPath: string, authClient: AuthClient) {
		const { baseURL, tenantId, environment, companyId, timeout, userAgent } =
			parseConfig(config);

		this.apiPath = apiPath;
		this.auth = authClient;
		this.apiURL = `${baseURL}/${tenantId}/${environment}/api/${apiPath}/companies(${companyId})`;
		this.timeout = timeout;
		this.userAgent = userAgent;
	}

	/** Gets the auth token. */
	async #getToken() {
		return await this.auth.getToken(this.scope).catch((err) => {
			throw new BCError(
				{
					error: {
						code: "Authentication_TokenRequest",
						message: err.message,
					},
				},
				401,
			);
		});
	}

	/** Makes a request to the BC server.
	 * Returns the raw response body or throws a BCError. */
	async request(endpoint: string, opts: RequestOpts): Promise<unknown> {
		opts = opts || {};

		const {
			payload,
			method = "GET",
			params,
			timeout = 30_000,
			serverPageSize,
		} = opts;

		// Strip out the leading slash.
		endpoint = endpoint.startsWith("/") ? endpoint.replace("/", "") : endpoint;

		// Build URL.
		const url = new URL(`${this.apiURL}/${endpoint}`);

		if (params) {
			url.search = params.toQuery();
		}

		// Build headers.
		// Keeps cached token, only gets when expired.
		// Throws BCError with category Authentication.
		const token = await this.#getToken();

		const headers = new Headers();

		headers.set(HEADER_AUTH, `Bearer ${token}`);
		headers.set(HEADER_ACCEPTS, CONTENTTYPE_JSON);
		headers.set(HEADER_CONTENT_TYPE, CONTENTTYPE_JSON); // Doesn't hurt for GET so always set
		headers.set(HEADER_USER_AGENT, this.userAgent);

		// May speed things up for GET requests.
		if (method === "GET") {
			headers.set(HEADER_DATA_ACCESS_INTENT, DATA_ACCESS_READONLY);
		}

		// Patch requires this.
		if (method === "PATCH") {
			headers.set(HEADER_IF_MATCH, "*");
		}

		// For server driven paging.
		if (serverPageSize) {
			const pageSize = `${ODATA_PAGE_SIZE}=${serverPageSize.toString()}`;
			headers.append(HEADER_PREFER, pageSize);
		}

		// Build request.
		const init: RequestInit = {
			method,
			headers,
			signal: AbortSignal.timeout(timeout),
		};

		if (payload) {
			init.body = JSON.stringify(payload);
		}

		const request = new Request(url, init);

		// Make response and handle errors.
		const response = await fetch(request).catch((err) => {
			// Network error
			throw BCError.fromNetworkError(err);
		});

		// Extract correlation ID
		const correlationId = response.headers.get(HEADER_CORRELATION_ID) || "";

		const data = await response.json().catch((err) => {
			// JSON parse error
			throw BCError.fromJsonError(err, response.status, correlationId);
		});

		if (!response.ok) {
			throw BCError.fromHttpResponse(response.status, data, correlationId);
		}

		return data;
	}

	/** Internally calls request and then parses the data against the provided schema. */
	async requestWithSchema<TSchema extends StandardSchemaV1>(
		endpoint: string,
		schema: TSchema,
		opts: RequestOpts,
	) {
		const data = await this.request(endpoint, opts);

		const result = await parseSchema(schema, data);
		if (result.issues) {
			throw BCError.fromParseResult(result.issues);
		}

		return result.data;
	}
}

function parseConfig(config: BCConfig): Required<BCConfig> {
	if (config.baseURL && !isValidURL(config.baseURL)) {
		throw Error("BCClient: a valid baseURL is required.");
	}
	if (!isValidGUID(config.companyId)) {
		throw Error("BCClient: a valid companyId is required.");
	}

	if (!isValidGUID(config.tenantId)) {
		throw Error("BCClient: a valid tenantId is required.");
	}

	if (isEmpty(config.environment)) {
		throw Error("BCClient: a valid environment name is required.");
	}

	return {
		companyId: config.companyId,
		environment: config.environment,
		tenantId: config.tenantId,
		timeout: config.timeout || DEFAULT_TIMEOUT,
		baseURL: config.baseURL || BC_BASE_URL,
		userAgent: config.userAgent || defaultUserAgent(),
	};
}

/**
 * Generate a default user agent following RFC 7231 format:
 * ProductName/Version (Platform; Runtime) LibraryName/Version
 */
function defaultUserAgent(): string {
	const packageVersion = packageJson.version;
	const packageName = packageJson.name;
	const nodeVersion = process.version;
	const platform = process.platform;
	const arch = process.arch;

	return `${packageName}/${packageVersion} (${platform}; Node.js ${nodeVersion}; ${arch})`;
}

import packageJson from "../../package.json" with { type: "json" };
import { BCError } from "../error/error.js";

/*=============================== Constants ===================================*/
export const BC_BASE_URL = "https://api.businesscentral.dynamics.com/v2.0";
export const DEFAULT_TIMEOUT = 30_000;
export const BC_DEFAULT_SCOPE =
	"https://api.businesscentral.dynamics.com/.default";

const GUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/*=============================== Types ===================================*/

export type BCConfig = {
	tenantId: string;
	environment: string;
	companyId: string;
	timeout?: number;
	baseURL?: string;
	userAgent?: string;
};

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
	readonly baseURL;
	readonly scope = BC_DEFAULT_SCOPE;
	readonly userAgent;
	readonly timeout;

	constructor(config: BCConfig, apiPath: string, authClient: AuthClient) {
		const { baseURL, tenantId, environment, companyId, timeout, userAgent } =
			parseConfig(config);

		this.apiPath = apiPath;
		this.auth = authClient;
		this.baseURL = `${baseURL}/${tenantId}/${environment}/api/${apiPath}/companies(${companyId})`;
		this.timeout = timeout;
		this.userAgent = userAgent;
	}

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
}

function parseConfig(config: BCConfig): Required<BCConfig> {
	if (config.baseURL && !URL.parse(config.baseURL)) {
		throw Error("BCClient: a valid baseURL is required.");
	}
	if (!GUID_REGEX.test(config.companyId)) {
		throw Error("BCClient: a valid companyId is required.");
	}

	if (!GUID_REGEX.test(config.tenantId)) {
		throw Error("BCClient: a valid tenantId is required.");
	}

	if (config.environment === "") {
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

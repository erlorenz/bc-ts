import packageJson from "../../package.json" with { type: "json" };

/*=============================== Constants ===================================*/
export const BC_BASE_URL = "https://api.businesscentral.dynamics.com/v2.0";
export const DEFAULT_TIMEOUT = 30_000;
export const BC_DEFAULT_SCOPE = "something";

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
/** Business Central API client. Use one client per API path.  */
export class BCClient {
	readonly auth: AuthClient;
	readonly apiPath: string;
	readonly baseURL: string;
	readonly userAgent: string;
	timeout: number;

	constructor(config: BCConfig, apiPath: string, authClient: AuthClient) {
		const { baseURL, tenantId, environment, companyId, timeout, userAgent } =
			validateConfig(config);

		this.apiPath = apiPath;
		this.baseURL = `${baseURL}/${tenantId}/${environment}/api/${apiPath}/companies(${companyId})`;
		this.auth = authClient;
		this.timeout = timeout;
		this.userAgent = userAgent;
	}
}

function validateConfig(config: BCConfig): Required<BCConfig> {
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
		userAgent: config.userAgent || getDefaultUserAgent(),
	};
}

/**
 * Generate a default user agent following RFC 7231 format:
 * ProductName/Version (Platform; Runtime) LibraryName/Version
 */
function getDefaultUserAgent(): string {
	const packageVersion = packageJson.version;
	const packageName = packageJson.name;
	const nodeVersion = process.version;
	const platform = process.platform;
	const arch = process.arch;

	return `${packageName}/${packageVersion} (${platform}; Node.js ${nodeVersion}; ${arch})`;
}

import packageJson from "../../package.json" with { type: "json" };
import { AzureIdentityClient, type AzureIdentityConfig } from "./auth.js";

/*=============================== Constants ===================================*/
export const BC_BASE_URL = "https://api.businesscentral.dynamics.com/v2.0";
export const DEFAULT_TIMEOUT = 30_000;
export const BC_DEFAULT_SCOPE = "something";

const GUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/*=============================== Types ===================================*/
export type BCAuthConfig = Pick<
	AzureIdentityConfig,
	"clientId" | "clientSecret"
>;

export type BCConfig = {
	tenantId: string;
	environment: string;
	companyId: string;
	timeout?: number;
	baseURL?: string;
	userAgent?: string;
};

/** Gets an Entra ID access token.  */
export interface AuthClient {
	getToken(): Promise<string>;
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

	/** Create a BCClient using built-in \@azure/identity.  */
	static withAuth(
		config: BCConfig,
		apiPath: string,
		authConfig: BCAuthConfig,
	): BCClient {
		authConfig = validateAuthConfig(authConfig);
		const authClient = new AzureIdentityClient({
			...authConfig,
			tenantId: config.tenantId,
			scope: BC_DEFAULT_SCOPE,
		});
		return new BCClient(config, apiPath, authClient);
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

function validateAuthConfig(config: BCAuthConfig): BCAuthConfig {
	if (!GUID_REGEX.test(config.clientId)) {
		throw Error("BCClient: a valid clientId is required.");
	}
	if (config.clientSecret === "") {
		throw Error("BCClient: a valid clientSecret is required.");
	}

	return config;
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

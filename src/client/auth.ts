import { ClientSecretCredential } from "@azure/identity";
import type { AuthClient } from "./client.js";

export type AzureIdentityConfig = {
	clientId: string;
	clientSecret: string;
	tenantId: string;
	scope: string;
};

/** Wraps an \@azure/indentity ClientSecretCredential to satisfy AuthClient interface. */
export class AzureIdentityClient implements AuthClient {
	#credential: ClientSecretCredential;
	#scope: string;

	constructor(config: AzureIdentityConfig) {
		// Create Azure credential
		this.#credential = new ClientSecretCredential(
			config.tenantId,
			config.clientId,
			config.clientSecret,
		);

		this.#scope = config.scope;
	}

	async getToken(): Promise<string> {
		try {
			const tokenResponse = await this.#credential.getToken(this.#scope);

			if (!tokenResponse || !tokenResponse.token) {
				throw new Error("Failed to acquire access token");
			}

			return tokenResponse.token;
		} catch (error) {
			throw new Error(
				`Azure token acquisition failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
}

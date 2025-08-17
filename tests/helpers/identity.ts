import { randomUUID } from "node:crypto";
import { ClientSecretCredential } from "@azure/identity";
import z from "zod";

interface AuthClient {
	getToken: (scope: string) => Promise<string>;
}

export class AzureIdentityClient {
	client: ClientSecretCredential;

	constructor(tenantId: string, clientId: string, clientSecret: string) {
		this.client = new ClientSecretCredential(tenantId, clientId, clientSecret);
	}

	async getToken(scope: string): Promise<string> {
		return (await this.client.getToken(scope)).token;
	}
}

export class MockAuthClient implements AuthClient {
	error?: string;

	async getToken(_: string): Promise<string> {
		if (this.error) {
			throw new Error(this.error);
		}

		return randomUUID();
	}
}

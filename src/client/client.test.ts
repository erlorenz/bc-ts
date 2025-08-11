import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { suite, test } from "node:test";
import {
	BC_BASE_URL,
	type BCAuthConfig,
	BCClient,
	type BCConfig,
	DEFAULT_TIMEOUT,
} from "./client.js";

/*=============================== Helpers ===================================*/

const fakeAuth = {
	getToken: async () => "fake_token",
};

const validConfig = {
	baseURL: "http://example.com",
	companyId: randomUUID(),
	tenantId: randomUUID(),
	environment: "SANDBOX",
	timeout: 5_000,
} satisfies BCConfig;

const validAuthConfig: BCAuthConfig = {
	clientId: randomUUID(),
	clientSecret: "secret",
};

/*=============================== Suites ===================================*/

suite("Initialize BCClient", { concurrency: true }, () => {
	test("With valid config", () => {
		const client = new BCClient(validConfig, "apiPath", fakeAuth);
		assert.ok(client.baseURL.startsWith(validConfig.baseURL));
	});

	test("With invalid config", () => {
		const invalidConfig = {
			...validConfig,
			tenantId: "not uuid",
		};

		assert.throws(
			() =>
				new BCClient(
					invalidConfig as BCConfig,
					"something/something/v1.0",
					fakeAuth,
				),
		);
	});

	test("With minimal config (fills defaults)", () => {
		const minimalConfig: BCConfig = {
			...validConfig,
		};
		delete minimalConfig.baseURL;
		delete minimalConfig.timeout;
		delete minimalConfig.userAgent;

		const client = new BCClient(minimalConfig, "apiPath", fakeAuth);
		assert.ok(client.baseURL.startsWith(BC_BASE_URL));
		assert.equal(client.timeout, DEFAULT_TIMEOUT);
		assert.ok(client.userAgent && client.userAgent !== "");
	});

	test("withAuth factory - valid auth config", () => {
		assert.doesNotThrow(() =>
			BCClient.withAuth(validConfig, "apiPath", validAuthConfig),
		);
	});

	test("withAuth factory - invalid auth config", () => {
		const invalidConfig = { ...validAuthConfig, clientId: "not uuid" };

		assert.throws(() =>
			BCClient.withAuth(validConfig, "apiPath", invalidConfig),
		);
	});
});

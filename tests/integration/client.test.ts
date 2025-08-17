import assert from "node:assert/strict";
import test, { describe } from "node:test";
import z from "zod";
import { BCClient, type BCConfig } from "../../src/index.js";
import { SalesOrder } from "../fixtures/schemas.js";
import { AzureIdentityClient } from "../helpers/identity.js";

// Run concurrently
describe("AuthClient", { concurrency: true }, () => {
	const env = z
		.object({
			COMPANY_ID: z.string().min(1),
			ENVIRONMENT: z.string().min(1),
			TENANT_ID: z.string().min(1),
			CLIENT_ID: z.string().min(1),
			CLIENT_SECRET: z.string().min(1),
		})
		.parse(process.env);

	const SALES_ORDERS = "salesOrders";

	const config: BCConfig = {
		companyId: env.COMPANY_ID,
		environment: env.ENVIRONMENT,
		tenantId: env.TENANT_ID,
	};
	const authClient = new AzureIdentityClient(
		env.TENANT_ID,
		env.CLIENT_ID,
		env.CLIENT_SECRET,
	);
	const client = new BCClient(config, "v2.0", authClient);

	test("Gets token", async () => {
		const token = await client.getToken();
		assert(token, "expected a token");
		assert.ok(token.length > 5);
	});

	test("Makes GET request with no params", async () => {
		const res = await client.request(SALES_ORDERS, {});

		assert(res);
	});

	test("Makes get request with param", async () => {
		const params = new URLSearchParams();
		params.append("$top", "1");
		const res = (await client.request(SALES_ORDERS, {
			params,
		})) as { value: unknown[] };

		assert.equal(res.value.length, 1);
	});

	test("Makes request with server paging", async () => {
		const res = (await client.request(SALES_ORDERS, {
			serverPageSize: 1,
		})) as { value: unknown[] };

		assert.equal(res.value.length, 1);
	});

	test("Makes request with schema", async () => {
		const params = new URLSearchParams();
		params.append("$top", "1");

		const schema = z.object({ value: z.array(SalesOrder) });

		const res = await client.requestWithSchema(SALES_ORDERS, schema, {
			params,
		});
		const first = res.value[0];

		assert.equal(res.value.length, 1);
		assert(first);

		assert.ok(first.orderDate > new Date("2025-01-01"));
	});
});

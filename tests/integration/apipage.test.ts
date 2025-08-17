import assert from "node:assert/strict";
import test, { describe } from "node:test";
import z from "zod";
import { BCClient, type BCConfig } from "../../src/index.js";
import { ApiPage } from "../../src/pages/api-page.js";
import { SalesOrder } from "../fixtures/schemas.js";
import { AzureIdentityClient } from "../helpers/identity.js";

describe("API Page - v2.0/salesOrders", () => {
	const env = z
		.object({
			COMPANY_ID: z.string().min(1),
			ENVIRONMENT: z.string().min(1),
			TENANT_ID: z.string().min(1),
			CLIENT_ID: z.string().min(1),
			CLIENT_SECRET: z.string().min(1),
		})
		.parse(process.env);

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
	const page = new ApiPage(client, "salesOrders", SalesOrder);

	let salesOrder: SalesOrder;

	test("lists sales orders with no arguments", async () => {
		const orders = [];

		for await (const order of page.list()) {
			salesOrder = order;
			orders.push(order);

			if (orders.length === 5) break;
		}

		assert.equal(orders.length, 5);
	});

	test("gets by ID", async () => {
		const order = await page.getById(salesOrder.id);
		assert(order);
		assert.equal(order.id, salesOrder.id);

		assert.equal(
			order.lines,
			undefined,
			"expected no sales lines without expand",
		);
	});

	test("gets by ID with expanded salesLines", async () => {
		const params = new URLSearchParams();
		params.append("$expand", "salesOrderLines");

		const order = await page.getById(salesOrder.id, params.toString());
		assert(order);
		assert.equal(order.id, salesOrder.id);

		assert.ok(Array.isArray(order.lines), "expected lines as an array.");
	});

	test("finds one by orderNumber", async () => {
		const params = new URLSearchParams();
		params.append("$filter", `orderNumber eq '${salesOrder.number}'`);
		params.append("$expand", "salesOrderLines");

		const order = await page.findOne(params.toString());
		assert(order);

		console.log(order);

		assert.ok(Array.isArray(order.lines), "expected lines as an array.");
	});

	test.skip("returns null if cannot find one", async () => {
		const params = new URLSearchParams();
		params.append("$filter", `orderNumber eq 'DOES_NOT_EXIST'`);
		params.append("$expand", "salesOrderLines");

		const order = await page.findOne(params.toString());
		assert(order);

		assert.ok(Array.isArray(order.lines), "expected lines as an array.");
	});
});

import assert from "node:assert/strict";
import test, { after, describe } from "node:test";
import z from "zod";
import { BCClient, type BCConfig, type BCError } from "../../src/index.js";
import {
	SalesOrder,
	type SalesOrderActions,
	type SalesOrderCreate,
	type SalesOrderUpdate,
} from "../fixtures/schemas.js";
import { AzureIdentityClient } from "../helpers/identity.js";

describe("API Page - v2.0/salesOrders - Queries", { timeout: 10_000 }, () => {
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
	const page = client.for("salesOrders", SalesOrder);

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

	test("lists sales orders with server paging", async () => {
		const orders = [];

		for await (const order of page.list("", {
			serverPageLimit: 2,
			maxResults: 5,
		})) {
			salesOrder = order;
			orders.push(order);
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

		assert.ok(
			Array.isArray(order.lines),
			`wanted lines as an array: got ${order.lines}`,
		);
	});

	test.skip("finds one by orderNumber", async () => {
		const params = new URLSearchParams();
		params.append("$filter", `number eq '${salesOrder.number}'`);
		params.append("$expand", "salesOrderLines");

		const order = await page.findOne(params.toString());
		assert(order);

		assert.ok(
			Array.isArray(order.lines),
			`wanted lines as an array: got ${order.lines}`,
		);
	});

	test("returns null if cannot find one", async () => {
		const params = new URLSearchParams();
		params.append("$filter", `number eq 'DOES_NOT_EXIST'`);
		params.append("$expand", "salesOrderLines");

		const order = await page.findOne(params.toString());
		assert.equal(order, null);
	});
});

describe("API Page - v2.0/salesOrders - Commands", { timeout: 10_000 }, () => {
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
	const page = client
		.for("salesOrders", SalesOrder)
		.withCommands<SalesOrderCreate, SalesOrderUpdate, SalesOrderActions>();

	let order: SalesOrder;

	test("creates, updates date, and deletes", async (t) => {
		const TODAY = new Date().toISOString().slice(0, 10);
		const YESTERDAY = new Date(Date.now() - 1000 * 60 * 60 * 24)
			.toISOString()
			.slice(0, 10);

		order = await page.create({
			// id: CREATE_ID,
			customerNumber: "TEST01",
			orderDate: TODAY,
		});

		assert.equal(order.orderDate, TODAY);

		order = await page.update(order.id, { orderDate: YESTERDAY });
		assert.equal(order.orderDate, YESTERDAY);
	});

	after(async () => {
		try {
			await page.delete(order.id);
		} catch (err) {
			const e = err as BCError;
			if (e.category === "NOT_FOUND") {
				console.log("No record found to delete");
				return;
			}

			console.log(e);
		}
	});
});

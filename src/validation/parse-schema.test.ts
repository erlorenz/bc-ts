import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { describe } from "node:test";
import * as z from "zod";
import { parseSchema } from "./parse-schema.js";

describe("Parse schema function", () => {
	const id = randomUUID();
	const data = {
		id,
		name: "Fred",
	};

	const schema = z.object({ id: z.uuid(), name: z.string().min(3) });
	test("Parses normal schema", async () => {
		const result = await parseSchema(schema, data);
		if (result.issues) {
			assert.fail("expected there to be no issues");
		}

		assert.deepEqual(result.data, data);
	});
	test("Parses transformed schema", async () => {
		const transformed = schema.transform((val) => ({ id: val.id }));

		const result = await parseSchema(transformed, data);
		if (result.issues) {
			assert.fail("expected there to be no issues");
		}

		assert.deepEqual(result.data, { id: data.id });
	});

	test("Returns issues with parse failure", async () => {
		const result = await parseSchema(schema, "something else");
		if (!result.issues || !result.issues.length) {
			assert.fail("expected there to be issues");
		}
	});
});

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { randomUUID } from "crypto";
import * as z from "zod";
import { parseSchema } from "./parse-schema.js";

describe("Parse schema function", () => {
	test("Parses normal schema", async (t) => {
		const id = randomUUID();
		const data = {
			id,
			name: "Fred",
		};

		const schema = z.object({ id: z.uuid(), name: z.string().min(3) });

		const result = await parseSchema(schema, data);
		if (result.issues) {
			assert.fail("expected there to be no issues");
		}

		assert.deepEqual(result.data, data);
	});
});

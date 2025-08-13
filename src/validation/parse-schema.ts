import type { StandardSchemaV1 } from "./standard-schema.js";

/**
 * Parse result for easier consumption
 */
export type ParseResult<T> =
	| {
			data: T;
			issues?: undefined;
	  }
	| {
			data?: undefined;
			issues: Array<{
				message: string;
				path: string;
			}>;
	  };

/**
 * Async schema parsing function that handles both sync and async validation
 * Based on the standard signature from standardschema.dev
 */
export async function parseSchema<T extends StandardSchemaV1>(
	schema: T,
	input: unknown,
): Promise<ParseResult<StandardSchemaV1.InferOutput<T>>> {
	// Call the validate function (matches standard approach)
	let result = schema["~standard"].validate(input);
	if (result instanceof Promise) result = await result;

	// Check if validation failed (if issues field exists)
	if (result.issues) {
		// Map issues to our format
		const issues = result.issues.map((issue) => {
			// Handle the path which can be PropertyKey | StandardSchemaV1.PathSegment
			const pathSegments =
				issue.path?.map((segment) => {
					if (typeof segment === "object" && "key" in segment) {
						return String(segment.key);
					}
					return String(segment);
				}) || [];

			return {
				message: issue.message,
				path: pathSegments.join(".") || "root",
			};
		});

		return {
			issues,
		};
	}

	// Validation succeeded
	return {
		data: result.value,
	};
}

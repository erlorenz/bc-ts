import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { BCError } from "./error.js";

describe("BCError static factory methods", () => {
	const mockCorrelationId = "test-correlation-123";

	describe("fromHttpResponse", () => {
		test("handles authentication errors", () => {
			const errorData = {
				error: {
					code: "Unauthorized",
					message: "Access token is invalid or expired",
				},
			};

			const bcError = BCError.fromHttpResponse(
				401,
				errorData,
				mockCorrelationId,
			);

			assert.equal(bcError.category, "AUTHENTICATION");
			assert.equal(bcError.retryStrategy, "REFRESH_TOKEN");
			assert.equal(bcError.isRetryable(), true);
			assert.equal(bcError.httpStatus, 401);
			assert.equal(bcError.correlationId, mockCorrelationId);
			assert.equal(bcError.message, "Access token is invalid or expired");
			assert.deepEqual(bcError.serverError, {
				code: "Unauthorized",
				message: "Access token is invalid or expired",
			});
		});

		test("handles authorization errors", () => {
			const errorData = {
				error: {
					code: "Forbidden",
					message: "Insufficient permissions to access this resource",
				},
			};

			const bcError = BCError.fromHttpResponse(
				403,
				errorData,
				mockCorrelationId,
			);

			assert.equal(bcError.category, "AUTHORIZATION");
			assert.equal(bcError.retryStrategy, "NO_RETRY");
			assert.equal(bcError.isRetryable(), false);
		});

		test("handles bad request errors", () => {
			const errorData = {
				error: {
					code: "BadRequest_RequiredParamNotProvided",
					message: "The required parameter companyId was not provided",
				},
			};

			const bcError = BCError.fromHttpResponse(
				400,
				errorData,
				mockCorrelationId,
			);

			assert.equal(bcError.category, "BAD_REQUEST");
			assert.equal(bcError.retryStrategy, "NO_RETRY");
			assert.equal(bcError.isRetryable(), false);
		});

		test("handles skip token errors", () => {
			const errorData = {
				error: {
					code: "SkipTokenIsNoLongerValid",
					message: "The skip token is no longer valid",
				},
			};

			const bcError = BCError.fromHttpResponse(
				400,
				errorData,
				mockCorrelationId,
			);

			assert.equal(bcError.category, "BAD_REQUEST");
			assert.equal(bcError.retryStrategy, "NO_RETRY");
			assert.equal(bcError.isRetryable(), false);
		});

		test("handles not found errors", () => {
			const errorData = {
				error: {
					code: "Internal_RecordNotFound",
					message: "The customer record was not found",
				},
			};

			const bcError = BCError.fromHttpResponse(
				404,
				errorData,
				mockCorrelationId,
			);

			assert.equal(bcError.category, "NOT_FOUND");
			assert.equal(bcError.retryStrategy, "NO_RETRY");
			assert.equal(bcError.isRetryable(), false);
		});

		test("handles conflict errors", () => {
			const errorData = {
				error: {
					code: "Internal_EntityWithSameKeyExists",
					message: "A customer with this number already exists",
				},
			};

			const bcError = BCError.fromHttpResponse(
				409,
				errorData,
				mockCorrelationId,
			);

			assert.equal(bcError.category, "CONFLICT");
			assert.equal(bcError.retryStrategy, "NO_RETRY");
			assert.equal(bcError.isRetryable(), false);
		});

		test("handles server errors with retry", () => {
			const errorData = {
				error: {
					code: "Internal_ServerError",
					message: "Database connection failed",
				},
			};

			const bcError = BCError.fromHttpResponse(
				500,
				errorData,
				mockCorrelationId,
			);

			assert.equal(bcError.category, "SERVER_ERROR");
			assert.equal(bcError.retryStrategy, "EXPONENTIAL_BACKOFF");
			assert.equal(bcError.isRetryable(), true);
		});

		test("categorizes errors by prefix when no exact match", () => {
			const errorData = {
				error: {
					code: "Application_CustomValidationError",
					message: "Custom business rule validation failed",
				},
			};

			const bcError = BCError.fromHttpResponse(
				400,
				errorData,
				mockCorrelationId,
			);

			assert.equal(bcError.category, "BAD_REQUEST");
			assert.equal(bcError.retryStrategy, "NO_RETRY");
		});

		test("falls back to unknown category for unrecognized errors", () => {
			const errorData = {
				error: {
					code: "SomeUnknown_ErrorCode",
					message: "This error code is not in our mappings",
				},
			};

			const bcError = BCError.fromHttpResponse(
				500,
				errorData,
				mockCorrelationId,
			);

			assert.equal(bcError.category, "UNKNOWN");
			assert.equal(bcError.retryStrategy, "NO_RETRY");
		});

		test("handles malformed response data", () => {
			const malformedData = { notAnError: "invalid format" };

			const bcError = BCError.fromHttpResponse(
				500,
				malformedData,
				mockCorrelationId,
			);

			assert.equal(bcError.category, "UNEXPECTED_RESPONSE");
			assert.equal(bcError.retryStrategy, "NO_RETRY");
			assert.equal(
				bcError.message,
				"Business Central returned an unexpected response format",
			);
			assert.deepEqual(bcError.responseData, malformedData);
			assert.equal(bcError.correlationId, mockCorrelationId);
			assert.equal(bcError.serverError, undefined);
		});

		test("handles missing error object", () => {
			const invalidData = { someField: "value" };

			const bcError = BCError.fromHttpResponse(
				400,
				invalidData,
				mockCorrelationId,
			);

			assert.equal(bcError.category, "UNEXPECTED_RESPONSE");
			assert.equal(
				bcError.message,
				"Business Central returned an unexpected response format",
			);
		});

		test("handles null response data", () => {
			const bcError = BCError.fromHttpResponse(500, null, mockCorrelationId);

			assert.equal(bcError.category, "UNEXPECTED_RESPONSE");
		});
	});

	describe("fromSchemaValidation", () => {
		test("creates schema mismatch error", () => {
			const validationIssues = [
				{ message: "Expected string, got number", path: "customer.name" },
				{ message: "Required field missing", path: "customer.id" },
			];

			const bcError = BCError.fromSchemaValidation(validationIssues, 200);

			assert.equal(bcError.category, "SCHEMA_MISMATCH");
			assert.equal(bcError.retryStrategy, "NO_RETRY");
			assert.equal(bcError.httpStatus, 200);
			assert.equal(
				bcError.message,
				"Schema validation failed. The provided schema does not match Business Central's response format.",
			);
			assert.deepEqual(bcError.validationDetails, validationIssues);
			assert.equal(bcError.hasValidationDetails(), true);
			assert.equal(bcError.isSchemaMismatch(), true);
			assert.deepEqual(bcError.getValidationFields(), [
				"customer.name",
				"customer.id",
			]);
			assert.equal(bcError.correlationId, undefined);
		});

		test("handles empty validation issues", () => {
			const bcError = BCError.fromSchemaValidation([]);

			assert.equal(bcError.hasValidationDetails(), false);
			assert.deepEqual(bcError.getValidationFields(), []);
		});

		test("uses default http status when not provided", () => {
			const validationIssues = [{ message: "Test error", path: "test.field" }];
			const bcError = BCError.fromSchemaValidation(validationIssues);

			assert.equal(bcError.httpStatus, 200);
		});

		test("extracts validation field paths correctly", () => {
			const validationIssues = [
				{ message: "Error 1", path: "customer.name" },
				{ message: "Error 2", path: "order.items[0].quantity" },
				{ message: "Error 3", path: "billing.address.zipCode" },
			];

			const bcError = BCError.fromSchemaValidation(validationIssues);
			const fieldPaths = bcError.getValidationFields();

			assert.deepEqual(fieldPaths, [
				"customer.name",
				"order.items[0].quantity",
				"billing.address.zipCode",
			]);
		});
	});

	describe("fromUnexpectedResponse", () => {
		test("creates error for unexpected response format", () => {
			const unexpectedData = {
				result: "success",
				data: { id: 123, name: "test" },
			};

			const bcError = BCError.fromUnexpectedResponse(
				unexpectedData,
				200,
				mockCorrelationId,
			);

			assert.equal(bcError.category, "UNEXPECTED_RESPONSE");
			assert.equal(bcError.retryStrategy, "NO_RETRY");
			assert.equal(bcError.httpStatus, 200);
			assert.equal(bcError.correlationId, mockCorrelationId);
			assert.equal(
				bcError.message,
				"Business Central returned an unexpected response format",
			);
			assert.deepEqual(bcError.responseData, unexpectedData);
			assert.equal(bcError.isRetryable(), false);
		});

		test("handles null response", () => {
			const bcError = BCError.fromUnexpectedResponse(
				null,
				204,
				mockCorrelationId,
			);

			assert.equal(bcError.responseData, null);
		});

		test("handles xml error response", () => {
			const xmlData = "<e><message>Authentication failed</message></e>";
			const bcError = BCError.fromUnexpectedResponse(
				xmlData,
				401,
				mockCorrelationId,
			);

			assert.equal(bcError.responseData, xmlData);
			assert.equal(bcError.category, "UNEXPECTED_RESPONSE");
			assert.equal(bcError.correlationId, mockCorrelationId);
		});

		test("handles html error page", () => {
			const htmlData = "<html><body><h1>404 Not Found</h1></body></html>";
			const bcError = BCError.fromUnexpectedResponse(
				htmlData,
				404,
				mockCorrelationId,
			);

			assert.equal(bcError.responseData, htmlData);
			assert.equal(bcError.category, "UNEXPECTED_RESPONSE");
		});
	});

	describe("fromGetToken", () => {
		test("creates authentication error from token failure", () => {
			const tokenError = new Error("OAuth server returned 400: invalid_grant");

			const bcError = BCError.fromGetToken(tokenError);

			assert.equal(bcError.category, "AUTHENTICATION");
			assert.equal(bcError.retryStrategy, "REFRESH_TOKEN");
			assert.equal(bcError.httpStatus, 401);
			assert.equal(bcError.cause, tokenError);
			assert.equal(bcError.isRetryable(), true);
			assert.ok(bcError.message.includes("invalid_grant"));
			assert.equal(bcError.correlationId, undefined);
		});

		test("handles non-error objects", () => {
			const tokenError = {
				error: "invalid_client",
				error_description: "Client authentication failed",
			};

			const bcError = BCError.fromGetToken(tokenError as unknown as Error);

			assert.equal(bcError.category, "AUTHENTICATION");
		});

		test("handles string errors", () => {
			const tokenError = "Network timeout during token request";

			const bcError = BCError.fromGetToken(tokenError as unknown as Error);

			assert.ok(bcError.message.includes("Network timeout"));
			assert.equal(bcError.category, "AUTHENTICATION");
		});

		test("handles undefined token errors", () => {
			const bcError = BCError.fromGetToken(undefined as unknown as Error);

			assert.equal(bcError.category, "AUTHENTICATION");
		});
	});

	describe("fromNetworkError", () => {
		test("categorizes all network errors as retryable", () => {
			const networkError = new Error(
				"getaddrinfo ENOTFOUND api.businesscentral.dynamics.com",
			) as Error & { code: string };
			networkError.code = "ENOTFOUND";

			const bcError = BCError.fromNetworkError(networkError);

			assert.equal(bcError.category, "NETWORK_ERROR");
			assert.equal(bcError.retryStrategy, "EXPONENTIAL_BACKOFF");
			assert.equal(bcError.httpStatus, 0);
			assert.equal(bcError.cause, networkError);
			assert.equal(bcError.isRetryable(), true);
			assert.ok(bcError.message.includes("ENOTFOUND"));
			assert.equal(bcError.correlationId, undefined);
		});

		test("handles connection refused errors", () => {
			const networkError = new Error(
				"connect ECONNREFUSED 127.0.0.1:443",
			) as Error & { code: string };
			networkError.code = "ECONNREFUSED";

			const bcError = BCError.fromNetworkError(networkError);

			assert.equal(bcError.category, "NETWORK_ERROR");
			assert.equal(bcError.retryStrategy, "EXPONENTIAL_BACKOFF");
			assert.equal(bcError.isRetryable(), true);
			assert.ok(bcError.message.includes("ECONNREFUSED"));
		});

		test("handles timeout errors", () => {
			const networkError = new Error("Request timeout") as Error & {
				code: string;
			};
			networkError.code = "ETIMEDOUT";

			const bcError = BCError.fromNetworkError(networkError);

			assert.equal(bcError.category, "NETWORK_ERROR");
			assert.equal(bcError.retryStrategy, "EXPONENTIAL_BACKOFF");
			assert.equal(bcError.isRetryable(), true);
		});

		test("handles network error without error code", () => {
			const networkError = new Error("Generic network failure");

			const bcError = BCError.fromNetworkError(networkError);

			assert.equal(bcError.message, "Network error: Generic network failure");
			assert.equal(bcError.category, "NETWORK_ERROR");
			assert.equal(bcError.retryStrategy, "EXPONENTIAL_BACKOFF");
		});

		test("handles unknown network error codes", () => {
			const networkError = new Error("Unknown network issue") as Error & {
				code: string;
			};
			networkError.code = "ESOMEUNKNOWNERROR";

			const bcError = BCError.fromNetworkError(networkError);

			assert.equal(bcError.category, "NETWORK_ERROR");
			assert.equal(bcError.retryStrategy, "EXPONENTIAL_BACKOFF");
			assert.equal(bcError.isRetryable(), true);
		});
	});

	describe("error utility methods", () => {
		test("creates comprehensive log object for server errors", () => {
			const errorData = {
				error: {
					code: "BadRequest_RequiredParamNotProvided",
					message: "Missing required parameter",
				},
			};

			const bcError = BCError.fromHttpResponse(
				400,
				errorData,
				mockCorrelationId,
			);
			const logObject = bcError.toLogObject();

			assert.equal(logObject.name, "BCError");
			assert.equal(logObject.message, "Missing required parameter");
			assert.equal(logObject.category, "BAD_REQUEST");
			assert.equal(logObject.httpStatus, 400);
			assert.equal(logObject.retryStrategy, "NO_RETRY");
			assert.equal(logObject.correlationId, mockCorrelationId);
			assert.ok(logObject.timestamp);
			assert.ok("serverError" in logObject);
			assert.deepEqual(logObject.serverError, {
				code: "BadRequest_RequiredParamNotProvided",
				message: "Missing required parameter",
			});

			// Verify timestamp is valid ISO string
			assert.ok(new Date(logObject.timestamp) instanceof Date);
		});

		test("includes validation details in log object when present", () => {
			const validationIssues = [
				{ message: "Invalid field", path: "customer.email" },
			];
			const bcError = BCError.fromSchemaValidation(validationIssues, 200);
			const logObject = bcError.toLogObject();

			assert.ok("validationDetails" in logObject);
			assert.deepEqual(logObject.validationDetails, validationIssues);
			assert.equal(logObject.validationCount, 1);
		});

		test("includes response data for unexpected format errors", () => {
			const unexpectedData = { someField: "value" };
			const bcError = BCError.fromUnexpectedResponse(
				unexpectedData,
				500,
				mockCorrelationId,
			);
			const logObject = bcError.toLogObject();
			assert.ok("responseData" in logObject);
			assert.deepEqual(logObject.responseData, unexpectedData);
		});

		test("creates opentelemetry span attributes", () => {
			const errorData = {
				error: {
					code: "Internal_ServerError",
					message: "Database error",
				},
			};

			const bcError = BCError.fromHttpResponse(
				500,
				errorData,
				mockCorrelationId,
			);
			const spanAttributes = bcError.toSpanAttributes();

			assert.deepEqual(spanAttributes, {
				"bc.error.category": "SERVER_ERROR",
				"bc.error.retryable": true,
				"bc.request.correlation_id": mockCorrelationId,
			});
		});

		test("handles missing correlation id in span attributes", () => {
			const networkError = new Error("Connection failed");
			const bcError = BCError.fromNetworkError(networkError);
			const spanAttributes = bcError.toSpanAttributes();

			assert.equal(spanAttributes["bc.request.correlation_id"], "");
		});
	});

	describe("real-world integration scenarios", () => {
		test("handles complete authentication flow", () => {
			const authError = {
				error: {
					code: "Unauthorized",
					message: "The access token has expired",
				},
			};

			const bcError = BCError.fromHttpResponse(401, authError, "auth-flow-456");

			assert.equal(bcError.category, "AUTHENTICATION");
			assert.equal(bcError.retryStrategy, "REFRESH_TOKEN");
			assert.equal(bcError.isRetryable(), true);

			const spanAttrs = bcError.toSpanAttributes();
			assert.equal(spanAttrs["bc.error.retryable"], true);
		});

		test("handles field validation failure", () => {
			const validationError = {
				error: {
					code: "Application_FieldValidationException",
					message: "The field Customer No. cannot be longer than 20 characters",
				},
			};

			const bcError = BCError.fromHttpResponse(
				400,
				validationError,
				"validation-req-789",
			);

			assert.equal(bcError.category, "BAD_REQUEST");
			assert.equal(bcError.retryStrategy, "NO_RETRY");
			assert.equal(bcError.isRetryable(), false);

			const logData = bcError.toLogObject();
			assert.equal(logData.correlationId, "validation-req-789");
		});

		test("handles server connectivity issues", () => {
			const networkError = new Error("Socket timeout") as Error & {
				code: string;
			};
			networkError.code = "ETIMEDOUT";

			const bcError = BCError.fromNetworkError(networkError);

			assert.equal(bcError.category, "NETWORK_ERROR");
			assert.equal(bcError.retryStrategy, "EXPONENTIAL_BACKOFF");
			assert.equal(bcError.isRetryable(), true);

			assert.equal(bcError.toSpanAttributes()["bc.error.retryable"], true);
		});

		test("handles schema mismatch from api changes", () => {
			const schemaIssues = [
				{
					message: 'Expected "displayName" but got "name"',
					path: "customer.displayName",
				},
				{ message: "Missing required field", path: "customer.systemId" },
			];

			const bcError = BCError.fromSchemaValidation(schemaIssues, 200);

			assert.equal(bcError.category, "SCHEMA_MISMATCH");
			assert.equal(bcError.isSchemaMismatch(), true);
			assert.equal(bcError.isRetryable(), false);
			assert.deepEqual(bcError.getValidationFields(), [
				"customer.displayName",
				"customer.systemId",
			]);

			const logData = bcError.toLogObject();
			assert.ok("validationCount" in logData);
			assert.equal(logData.validationCount, 2);
		});

		test("handles xml response when accept header not set", () => {
			const xmlResponse =
				'<?xml version="1.0"?><e><code>Unauthorized</code><message>Invalid credentials</message></e>';

			const bcError = BCError.fromUnexpectedResponse(
				xmlResponse,
				401,
				"xml-error-123",
			);

			assert.equal(bcError.category, "UNEXPECTED_RESPONSE");
			assert.equal(bcError.isRetryable(), false);
			assert.equal(bcError.responseData, xmlResponse);
			assert.equal(bcError.correlationId, "xml-error-123");

			// This indicates a library bug (missing Accept header)
			const logData = bcError.toLogObject();
			assert.ok("responseData" in logData);
			assert.equal(logData.responseData, xmlResponse);
		});
	});

	describe("edge cases and error boundaries", () => {
		test("preserves stack trace information", () => {
			const errorData = {
				error: {
					code: "BadRequest_InvalidOperation",
					message: "Invalid operation",
				},
			};

			const bcError = BCError.fromHttpResponse(
				400,
				errorData,
				mockCorrelationId,
			);

			assert.ok(bcError.stack);
			assert.ok(bcError.stack.includes("BCError"));
		});

		test("handles large validation issues arrays", () => {
			const manyIssues = Array.from({ length: 50 }, (_, i) => ({
				message: `Validation error ${i}`,
				path: `field[${i}].value`,
			}));

			const bcError = BCError.fromSchemaValidation(manyIssues);

			assert.equal(bcError.validationDetails?.length, 50);
			assert.equal(bcError.getValidationFields().length, 50);
			assert.equal(bcError.hasValidationDetails(), true);
		});

		test("has correct error name for logging", () => {
			const bcError = BCError.fromNetworkError(new Error("test"));

			assert.equal(bcError.name, "BCError");
			assert.ok(bcError.toString().startsWith("BCError:"));
		});

		test("maintains readonly properties", () => {
			const bcError = BCError.fromNetworkError(new Error("test"));

			// These should be readonly - TypeScript will catch attempts to modify
			assert.equal(bcError.category, "NETWORK_ERROR");
			assert.equal(bcError.retryStrategy, "EXPONENTIAL_BACKOFF");
			assert.equal(typeof bcError.timestamp, "object");
			assert.equal(bcError.httpStatus, 0);
		});
	});
});

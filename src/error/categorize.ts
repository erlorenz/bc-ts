export type BCErrorCategory = (typeof errorCategories)[number];

export type BCRetryStrategy = (typeof retryStrategies)[number];

const errorCategories = [
	"AUTHENTICATION", // Invalid/expired tokens, token refresh failures
	"AUTHORIZATION", // Cannot access tables/resources
	"BAD_REQUEST", // Consumer errors: wrong URLs, invalid fields, malformed requests
	"NOT_FOUND", // Records/resources don't exist
	"CONFLICT", // Duplicate keys, entity changed conflicts
	"SCHEMA_MISMATCH", // Response doesn't match expected schema
	"NETWORK_ERROR", // Connection issues, timeouts, DNS failures
	"UNEXPECTED_RESPONSE", // BC returned non-standard format
	"SERVER_ERROR", // BC internal errors, database issues
	"UNKNOWN", // Fallback for unrecognized errors
] as const;

const retryStrategies = [
	"NO_RETRY",
	"EXPONENTIAL_BACKOFF",
	"REFRESH_TOKEN",
] as const;

const errorCodeMappings = new Map<string, BCErrorCategory>([
	// Authentication errors
	["BadRequest_InvalidToken", "AUTHENTICATION"],
	["Unauthorized", "AUTHENTICATION"],
	["Authentication_TokenError", "AUTHENTICATION"],

	// Authorization errors (forbidden access to resources)
	["Forbidden", "AUTHORIZATION"],
	["Authorization_InsufficientPermissions", "AUTHORIZATION"],

	// Bad Request - Consumer errors
	["BadRequest", "BAD_REQUEST"], // Exact code
	["BadRequest_InvalidRequestUrl", "BAD_REQUEST"],
	["BadRequest_NotFound", "BAD_REQUEST"],
	["BadRequest_MethodNotAllowed", "BAD_REQUEST"],
	["BadRequest_MethodNotImplemented", "BAD_REQUEST"],
	["BadRequest_RequiredParamNotProvided", "BAD_REQUEST"],
	["BadRequest_InvalidOperation", "BAD_REQUEST"],
	["SkipTokenIsNoLongerValid", "BAD_REQUEST"],
	["Application_FieldValidationException", "BAD_REQUEST"],
	["Application_StringExceededLength", "BAD_REQUEST"],
	["Application_InvalidGUID", "BAD_REQUEST"],
	["Application_FilterErrorException", "BAD_REQUEST"],

	// Not Found
	["BadRequest_ResourceNotFound", "NOT_FOUND"],
	["Internal_RecordNotFound", "NOT_FOUND"],
	["Internal_CompanyNotFound", "NOT_FOUND"],
	["Internal_DataNotFoundFilter", "NOT_FOUND"],

	// Conflicts
	["Request_EntityChanged", "CONFLICT"],
	["Internal_EntityWithSameKeyExists", "CONFLICT"],

	// Server Errors (retryable)
	["Internal_ServerError", "SERVER_ERROR"],
	["Internal_TenantUnavailable", "SERVER_ERROR"],
	["Internal_DatabaseConnection", "SERVER_ERROR"],

	// Business Logic errors (treat as bad request since they're often due to invalid data/operations)
	["Application_DialogException", "BAD_REQUEST"],
	["Application_EvaluateException", "BAD_REQUEST"],
	["Application_CallbackNotAllowed", "BAD_REQUEST"],
]);

const prefixDefaults = new Map<string, BCErrorCategory>([
	["BadRequest_", "BAD_REQUEST"],
	["Request_", "CONFLICT"],
	["Internal_", "SERVER_ERROR"],
	["Application_", "BAD_REQUEST"],
	["Authentication_", "AUTHENTICATION"],
	["Authorization_", "AUTHORIZATION"],
]);

const categoryToRetryStrategy = new Map<BCErrorCategory, BCRetryStrategy>([
	["AUTHENTICATION", "REFRESH_TOKEN"],
	["AUTHORIZATION", "NO_RETRY"],
	["BAD_REQUEST", "NO_RETRY"],
	["NOT_FOUND", "NO_RETRY"],
	["CONFLICT", "NO_RETRY"],
	["SCHEMA_MISMATCH", "NO_RETRY"],
	["NETWORK_ERROR", "EXPONENTIAL_BACKOFF"],
	["UNEXPECTED_RESPONSE", "NO_RETRY"],
	["SERVER_ERROR", "EXPONENTIAL_BACKOFF"],
	["UNKNOWN", "NO_RETRY"],
]);

/** Categorizes BC error codes into simplified categories for retry decision making */
export function categorizeError(code: string): {
	category: BCErrorCategory;
	retryStrategy: BCRetryStrategy;
} {
	// Check for exact match first
	let category = errorCodeMappings.get(code);

	if (!category) {
		// Check for prefix match
		for (const [prefix, defaultCategory] of prefixDefaults) {
			if (code.startsWith(prefix)) {
				category = defaultCategory;
				break;
			}
		}
	}
	// Global fallback
	if (!category) {
		category = "UNKNOWN";
	}

	// Get retry strategy from category
	const retryStrategy = categoryToRetryStrategy.get(category) ?? "NO_RETRY";

	return { category, retryStrategy };
}

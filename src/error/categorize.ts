/**
 * Business Central API Error Categories
 */
export const BCErrorCategory = {
	CLIENT_ERROR: "CLIENT_ERROR",
	NETWORK_ERROR: "NETWORK_ERROR",
	NOT_FOUND: "NOT_FOUND",
	CONFLICT: "CONFLICT",
	VALIDATION: "VALIDATION",
	AUTHORIZATION: "AUTHORIZATION",
	AUTHENTICATION: "AUTHENTICATION",
	SERVER_ERROR: "SERVER_ERROR",
	BUSINESS_LOGIC: "BUSINESS_LOGIC",
	PARSING_ERROR: "PARSING_ERROR",
	UNKNOWN: "UNKNOWN",
} as const;

export type BCErrorCategory =
	(typeof BCErrorCategory)[keyof typeof BCErrorCategory];

/**
 * Business Central API Error Subcategories
 */
export const BCErrorSubcategory = {
	// Token error
	TOKEN_ERROR: "TOKEN_ERROR",
	// Client errors
	NETWORK_ERROR: "NETWORK_ERROR",
	MALFORMED_REQUEST: "MALFORMED_REQUEST",
	INVALID_URL: "INVALID_URL",
	SYNTAX_ERROR: "SYNTAX_ERROR",
	INVALID_TOKEN: "INVALID_TOKEN",
	MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
	METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
	METHOD_NOT_IMPLEMENTED: "METHOD_NOT_IMPLEMENTED",

	// Not found variants
	RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
	RECORD_NOT_FOUND: "RECORD_NOT_FOUND",
	COMPANY_NOT_FOUND: "COMPANY_NOT_FOUND",

	// Conflict variants
	DUPLICATE_KEY: "DUPLICATE_KEY",
	ENTITY_CHANGED: "ENTITY_CHANGED",

	// Validation variants
	FIELD_VALIDATION: "FIELD_VALIDATION",
	STRING_LENGTH_EXCEEDED: "STRING_LENGTH_EXCEEDED",
	INVALID_GUID: "INVALID_GUID",
	INVALID_DATETIME: "INVALID_DATETIME",
	FILTER_ERROR: "FILTER_ERROR",
	ODATA_TYPE_ERROR: "ODATA_TYPE_ERROR",
	ODATA_PROPERTY_NOT_FOUND: "ODATA_PROPERTY_NOT_FOUND",
	INVALID_TABLE_RELATION: "INVALID_TABLE_RELATION",

	// Server errors
	DATA_ACCESS_ERROR: "DATA_ACCESS_ERROR",
	DATABASE_CONNECTION: "DATABASE_CONNECTION",
	TENANT_UNAVAILABLE: "TENANT_UNAVAILABLE",

	// Business logic
	DIALOG_EXCEPTION: "DIALOG_EXCEPTION",
	CALLBACK_NOT_ALLOWED: "CALLBACK_NOT_ALLOWED",
	EVALUATE_EXCEPTION: "EVALUATE_EXCEPTION",

	// Parsing errors
	SCHEMA_VALIDATION: "SCHEMA_VALIDATION",
	UNEXPECTED_RESPONSE_FORMAT: "UNEXPECTED_RESPONSE_FORMAT",
} as const;

export type BCErrorSubcategory =
	(typeof BCErrorSubcategory)[keyof typeof BCErrorSubcategory];

/**
 * Retry strategy recommendations based on error type
 */
export const BCRetryStrategy = {
	NO_RETRY: "NO_RETRY",
	IMMEDIATE_RETRY: "IMMEDIATE_RETRY",
	EXPONENTIAL_BACKOFF: "EXPONENTIAL_BACKOFF",
	REFRESH_TOKEN: "REFRESH_TOKEN",
} as const;

export type BCRetryStrategy =
	(typeof BCRetryStrategy)[keyof typeof BCRetryStrategy];

// Configuration: All specific error code mappings
type ErrorCodeGroup = {
	category: BCErrorCategory;
	subcategory: BCErrorSubcategory;
	retryStrategy: BCRetryStrategy;
};

const ERROR_CODE_MAPPINGS = new Map<string, ErrorCodeGroup>([
	// TokenRequest
	[
		"Authentication_TokenRequest",
		{
			category: BCErrorCategory.AUTHENTICATION,
			subcategory: BCErrorSubcategory.TOKEN_ERROR,
			retryStrategy: BCRetryStrategy.REFRESH_TOKEN,
		},
	],
	// BadRequest errors
	[
		"BadRequest_ResourceNotFound",
		{
			category: BCErrorCategory.NOT_FOUND,
			subcategory: BCErrorSubcategory.RESOURCE_NOT_FOUND,
			retryStrategy: BCRetryStrategy.NO_RETRY,
		},
	],
	[
		"BadRequest_NotFound",
		{
			category: BCErrorCategory.CLIENT_ERROR,
			subcategory: BCErrorSubcategory.INVALID_URL,
			retryStrategy: BCRetryStrategy.NO_RETRY,
		},
	],
	[
		"BadRequest_InvalidRequestUrl",
		{
			category: BCErrorCategory.CLIENT_ERROR,
			subcategory: BCErrorSubcategory.INVALID_URL,
			retryStrategy: BCRetryStrategy.NO_RETRY,
		},
	],
	[
		"BadRequest_InvalidToken",
		{
			category: BCErrorCategory.CLIENT_ERROR,
			subcategory: BCErrorSubcategory.INVALID_TOKEN,
			retryStrategy: BCRetryStrategy.REFRESH_TOKEN,
		},
	],
	[
		"BadRequest_InvalidOperation",
		{
			category: BCErrorCategory.VALIDATION,
			subcategory: BCErrorSubcategory.FIELD_VALIDATION,
			retryStrategy: BCRetryStrategy.NO_RETRY,
		},
	],
	[
		"BadRequest_RequiredParamNotProvided",
		{
			category: BCErrorCategory.VALIDATION,
			subcategory: BCErrorSubcategory.MISSING_REQUIRED_FIELD,
			retryStrategy: BCRetryStrategy.NO_RETRY,
		},
	],
	[
		"BadRequest_MethodNotAllowed",
		{
			category: BCErrorCategory.CLIENT_ERROR,
			subcategory: BCErrorSubcategory.METHOD_NOT_ALLOWED,
			retryStrategy: BCRetryStrategy.NO_RETRY,
		},
	],
	[
		"BadRequest_MethodNotImplemented",
		{
			category: BCErrorCategory.CLIENT_ERROR,
			subcategory: BCErrorSubcategory.METHOD_NOT_IMPLEMENTED,
			retryStrategy: BCRetryStrategy.NO_RETRY,
		},
	],

	// Request errors
	[
		"Request_EntityChanged",
		{
			category: BCErrorCategory.CONFLICT,
			subcategory: BCErrorSubcategory.ENTITY_CHANGED,
			retryStrategy: BCRetryStrategy.NO_RETRY,
		},
	],

	// Internal errors
	[
		"Internal_EntityWithSameKeyExists",
		{
			category: BCErrorCategory.CONFLICT,
			subcategory: BCErrorSubcategory.DUPLICATE_KEY,
			retryStrategy: BCRetryStrategy.NO_RETRY,
		},
	],
	[
		"Internal_RecordNotFound",
		{
			category: BCErrorCategory.NOT_FOUND,
			subcategory: BCErrorSubcategory.RECORD_NOT_FOUND,
			retryStrategy: BCRetryStrategy.NO_RETRY,
		},
	],
	[
		"Internal_CompanyNotFound",
		{
			category: BCErrorCategory.NOT_FOUND,
			subcategory: BCErrorSubcategory.COMPANY_NOT_FOUND,
			retryStrategy: BCRetryStrategy.NO_RETRY,
		},
	],
	[
		"Internal_DataNotFoundFilter",
		{
			category: BCErrorCategory.NOT_FOUND,
			subcategory: BCErrorSubcategory.RECORD_NOT_FOUND,
			retryStrategy: BCRetryStrategy.NO_RETRY,
		},
	],
	[
		"Internal_InvalidTableRelation",
		{
			category: BCErrorCategory.VALIDATION,
			subcategory: BCErrorSubcategory.INVALID_TABLE_RELATION,
			retryStrategy: BCRetryStrategy.NO_RETRY,
		},
	],
	[
		"Internal_ServerError",
		{
			category: BCErrorCategory.SERVER_ERROR,
			subcategory: BCErrorSubcategory.DATABASE_CONNECTION,
			retryStrategy: BCRetryStrategy.EXPONENTIAL_BACKOFF,
		},
	],
	[
		"Internal_TenantUnavailable",
		{
			category: BCErrorCategory.SERVER_ERROR,
			subcategory: BCErrorSubcategory.TENANT_UNAVAILABLE,
			retryStrategy: BCRetryStrategy.EXPONENTIAL_BACKOFF,
		},
	],

	// Application errors
	[
		"Application_DialogException",
		{
			category: BCErrorCategory.BUSINESS_LOGIC,
			subcategory: BCErrorSubcategory.DIALOG_EXCEPTION,
			retryStrategy: BCRetryStrategy.NO_RETRY,
		},
	],
	[
		"Application_FieldValidationException",
		{
			category: BCErrorCategory.VALIDATION,
			subcategory: BCErrorSubcategory.FIELD_VALIDATION,
			retryStrategy: BCRetryStrategy.NO_RETRY,
		},
	],
	[
		"Application_StringExceededLength",
		{
			category: BCErrorCategory.VALIDATION,
			subcategory: BCErrorSubcategory.STRING_LENGTH_EXCEEDED,
			retryStrategy: BCRetryStrategy.NO_RETRY,
		},
	],
	[
		"Application_InvalidGUID",
		{
			category: BCErrorCategory.VALIDATION,
			subcategory: BCErrorSubcategory.INVALID_GUID,
			retryStrategy: BCRetryStrategy.NO_RETRY,
		},
	],
	[
		"Application_FilterErrorException",
		{
			category: BCErrorCategory.VALIDATION,
			subcategory: BCErrorSubcategory.FILTER_ERROR,
			retryStrategy: BCRetryStrategy.NO_RETRY,
		},
	],
	[
		"Application_EvaluateException",
		{
			category: BCErrorCategory.BUSINESS_LOGIC,
			subcategory: BCErrorSubcategory.EVALUATE_EXCEPTION,
			retryStrategy: BCRetryStrategy.NO_RETRY,
		},
	],
	[
		"Application_CallbackNotAllowed",
		{
			category: BCErrorCategory.BUSINESS_LOGIC,
			subcategory: BCErrorSubcategory.CALLBACK_NOT_ALLOWED,
			retryStrategy: BCRetryStrategy.NO_RETRY,
		},
	],

	// Special cases
	[
		"Unauthorized",
		{
			category: BCErrorCategory.AUTHENTICATION,
			subcategory: BCErrorSubcategory.INVALID_TOKEN,
			retryStrategy: BCRetryStrategy.REFRESH_TOKEN,
		},
	],
]);

// Configuration: Default mappings for error code prefixes
const PREFIX_DEFAULTS = new Map<string, ErrorCodeGroup>([
	[
		"BadRequest_",
		{
			category: BCErrorCategory.CLIENT_ERROR,
			subcategory: BCErrorSubcategory.MALFORMED_REQUEST,
			retryStrategy: BCRetryStrategy.NO_RETRY,
		},
	],
	[
		"Request_",
		{
			category: BCErrorCategory.CONFLICT,
			subcategory: BCErrorSubcategory.ENTITY_CHANGED,
			retryStrategy: BCRetryStrategy.NO_RETRY,
		},
	],
	[
		"Internal_",
		{
			category: BCErrorCategory.SERVER_ERROR,
			subcategory: BCErrorSubcategory.DATABASE_CONNECTION,
			retryStrategy: BCRetryStrategy.EXPONENTIAL_BACKOFF,
		},
	],
	[
		"Application_",
		{
			category: BCErrorCategory.BUSINESS_LOGIC,
			subcategory: BCErrorSubcategory.DIALOG_EXCEPTION,
			retryStrategy: BCRetryStrategy.NO_RETRY,
		},
	],
	[
		"Authentication_",
		{
			category: BCErrorCategory.AUTHENTICATION,
			subcategory: BCErrorSubcategory.INVALID_TOKEN,
			retryStrategy: BCRetryStrategy.REFRESH_TOKEN,
		},
	],
	[
		"Authorization_",
		{
			category: BCErrorCategory.AUTHORIZATION,
			subcategory: BCErrorSubcategory.FIELD_VALIDATION,
			retryStrategy: BCRetryStrategy.NO_RETRY,
		},
	],
]);

/** Picks from a map of known errors, otherwise chooses a default. */
export function categorizeError(code: string): {
	category: BCErrorCategory;
	subcategory: BCErrorSubcategory;
	retryStrategy: BCRetryStrategy;
} {
	// Check for exact match first
	const exactMatch = ERROR_CODE_MAPPINGS.get(code);
	if (exactMatch) {
		return exactMatch;
	}

	// Check for prefix match
	for (const [prefix, defaultMapping] of PREFIX_DEFAULTS) {
		if (code.startsWith(prefix)) {
			return defaultMapping;
		}
	}

	// Global fallback
	return {
		category: BCErrorCategory.UNKNOWN,
		subcategory: BCErrorSubcategory.MALFORMED_REQUEST,
		retryStrategy: BCRetryStrategy.NO_RETRY,
	};
}

import {
	BCErrorCategory,
	BCErrorSubcategory,
	BCRetryStrategy,
} from "./error.js";

// Configuration: All specific error code mappings
const ERROR_CODE_MAPPINGS = new Map([
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
const PREFIX_DEFAULTS = new Map([
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

import type { ParseResult } from "./parse-schema.js";

/**
 * Business Central OData Error Response Structure
 */
type ErrorResponse = {
	error: {
		code: string;
		message: string;
	};
};

/**
 * Minimal schema validation for library internals
 */
function validateErrorResponse(data: unknown): ErrorResponse {
	if (!data || typeof data !== "object") {
		throw new Error("Expected object for BC error response");
	}

	const obj = data;

	if (!("error" in obj) || typeof obj.error !== "object") {
		throw new Error("Missing 'error' object in BC response");
	}

	const error = obj.error || {};

	if (!("code" in error) || typeof error.code !== "string") {
		throw new Error("Expected string for error.code");
	}

	if (!("message" in error) || typeof error.message !== "string") {
		throw new Error("Expected string for error.message");
	}

	return {
		error: {
			code: error.code,
			message: error.message,
		},
	};
}

/**
 * Business Central API Error Categories
 */
export const BCErrorCategory = {
	CLIENT_ERROR: "CLIENT_ERROR",
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
	// Client errors
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

/**
 * Comprehensive Business Central API Error Class
 *
 * 1. Categorizes errors to facilitate domain error translation in repositories
 * 2. Preserves original error context for debugging/tracing
 * 3. Provides retry strategy guidance for resilient error handling
 * 4. Captures BC server request ID for correlation with server logs
 * 5. Provides OpenTelemetry helpers without requiring OTel dependencies
 */
export class BCError extends Error {
	category: BCErrorCategory;
	subcategory: BCErrorSubcategory;
	code: string;
	httpStatus: number;
	retryStrategy: BCRetryStrategy;
	originalError: ErrorResponse;
	timestamp: Date;
	correlationId?: string;
	validationDetails?: Array<{ message: string; path: string }>;

	constructor(
		errorResponse: ErrorResponse,
		httpStatus: number,
		correlationId?: string,
	) {
		const message =
			errorResponse.error.message || "Unknown Business Central error";
		super(message);

		this.name = "BCError";
		this.code = errorResponse.error.code;
		this.httpStatus = httpStatus;
		this.originalError = errorResponse;
		this.timestamp = new Date();
		if (correlationId) this.correlationId = correlationId;

		// Categorize the error based on the BC error code pattern
		const categorization = this.#categorizeError(errorResponse.error.code);
		this.category = categorization.category;
		this.subcategory = categorization.subcategory;
		this.retryStrategy = categorization.retryStrategy;

		// Preserve stack trace
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, BCError);
		}
	}

	/**
	 * Categorizes Business Central error codes into domain-friendly categories
	 */
	#categorizeError(code: string): {
		category: BCErrorCategory;
		subcategory: BCErrorSubcategory;
		retryStrategy: BCRetryStrategy;
	} {
		// BadRequest_* errors
		if (code.startsWith("BadRequest_")) {
			if (code === "BadRequest_ResourceNotFound") {
				return {
					category: BCErrorCategory.NOT_FOUND,
					subcategory: BCErrorSubcategory.RESOURCE_NOT_FOUND,
					retryStrategy: BCRetryStrategy.NO_RETRY,
				};
			}
			if (code === "BadRequest_NotFound") {
				return {
					category: BCErrorCategory.CLIENT_ERROR,
					subcategory: BCErrorSubcategory.INVALID_URL,
					retryStrategy: BCRetryStrategy.NO_RETRY,
				};
			}
			if (code === "BadRequest_InvalidRequestUrl") {
				return {
					category: BCErrorCategory.CLIENT_ERROR,
					subcategory: BCErrorSubcategory.INVALID_URL,
					retryStrategy: BCRetryStrategy.NO_RETRY,
				};
			}
			if (code === "BadRequest_InvalidToken") {
				return {
					category: BCErrorCategory.CLIENT_ERROR,
					subcategory: BCErrorSubcategory.INVALID_TOKEN,
					retryStrategy: BCRetryStrategy.REFRESH_TOKEN,
				};
			}
			if (code === "BadRequest_InvalidOperation") {
				return {
					category: BCErrorCategory.VALIDATION,
					subcategory: BCErrorSubcategory.FIELD_VALIDATION,
					retryStrategy: BCRetryStrategy.NO_RETRY,
				};
			}
			if (code === "BadRequest_RequiredParamNotProvided") {
				return {
					category: BCErrorCategory.VALIDATION,
					subcategory: BCErrorSubcategory.MISSING_REQUIRED_FIELD,
					retryStrategy: BCRetryStrategy.NO_RETRY,
				};
			}
			if (code === "BadRequest_MethodNotAllowed") {
				return {
					category: BCErrorCategory.CLIENT_ERROR,
					subcategory: BCErrorSubcategory.METHOD_NOT_ALLOWED,
					retryStrategy: BCRetryStrategy.NO_RETRY,
				};
			}
			if (code === "BadRequest_MethodNotImplemented") {
				return {
					category: BCErrorCategory.CLIENT_ERROR,
					subcategory: BCErrorSubcategory.METHOD_NOT_IMPLEMENTED,
					retryStrategy: BCRetryStrategy.NO_RETRY,
				};
			}
			// Generic BadRequest
			return {
				category: BCErrorCategory.CLIENT_ERROR,
				subcategory: BCErrorSubcategory.MALFORMED_REQUEST,
				retryStrategy: BCRetryStrategy.NO_RETRY,
			};
		}

		// Request_* errors (conflicts)
		if (code.startsWith("Request_")) {
			if (code === "Request_EntityChanged") {
				return {
					category: BCErrorCategory.CONFLICT,
					subcategory: BCErrorSubcategory.ENTITY_CHANGED,
					retryStrategy: BCRetryStrategy.NO_RETRY,
				};
			}
		}

		// Internal_* errors (server-side issues)
		if (code.startsWith("Internal_")) {
			if (code === "Internal_EntityWithSameKeyExists") {
				return {
					category: BCErrorCategory.CONFLICT,
					subcategory: BCErrorSubcategory.DUPLICATE_KEY,
					retryStrategy: BCRetryStrategy.NO_RETRY,
				};
			}
			if (code === "Internal_RecordNotFound") {
				return {
					category: BCErrorCategory.NOT_FOUND,
					subcategory: BCErrorSubcategory.RECORD_NOT_FOUND,
					retryStrategy: BCRetryStrategy.NO_RETRY,
				};
			}
			if (code === "Internal_CompanyNotFound") {
				return {
					category: BCErrorCategory.NOT_FOUND,
					subcategory: BCErrorSubcategory.COMPANY_NOT_FOUND,
					retryStrategy: BCRetryStrategy.NO_RETRY,
				};
			}
			if (code === "Internal_DataNotFoundFilter") {
				return {
					category: BCErrorCategory.NOT_FOUND,
					subcategory: BCErrorSubcategory.RECORD_NOT_FOUND,
					retryStrategy: BCRetryStrategy.NO_RETRY,
				};
			}
			if (code === "Internal_InvalidTableRelation") {
				return {
					category: BCErrorCategory.VALIDATION,
					subcategory: BCErrorSubcategory.INVALID_TABLE_RELATION,
					retryStrategy: BCRetryStrategy.NO_RETRY,
				};
			}
			if (code === "Internal_ServerError") {
				return {
					category: BCErrorCategory.SERVER_ERROR,
					subcategory: BCErrorSubcategory.DATABASE_CONNECTION,
					retryStrategy: BCRetryStrategy.EXPONENTIAL_BACKOFF,
				};
			}
			if (code === "Internal_TenantUnavailable") {
				return {
					category: BCErrorCategory.SERVER_ERROR,
					subcategory: BCErrorSubcategory.TENANT_UNAVAILABLE,
					retryStrategy: BCRetryStrategy.EXPONENTIAL_BACKOFF,
				};
			}
		}

		// Application_* errors (business logic)
		if (code.startsWith("Application_")) {
			if (code === "Application_DialogException") {
				return {
					category: BCErrorCategory.BUSINESS_LOGIC,
					subcategory: BCErrorSubcategory.DIALOG_EXCEPTION,
					retryStrategy: BCRetryStrategy.NO_RETRY,
				};
			}
			if (code === "Application_FieldValidationException") {
				return {
					category: BCErrorCategory.VALIDATION,
					subcategory: BCErrorSubcategory.FIELD_VALIDATION,
					retryStrategy: BCRetryStrategy.NO_RETRY,
				};
			}
			if (code === "Application_StringExceededLength") {
				return {
					category: BCErrorCategory.VALIDATION,
					subcategory: BCErrorSubcategory.STRING_LENGTH_EXCEEDED,
					retryStrategy: BCRetryStrategy.NO_RETRY,
				};
			}
			if (code === "Application_InvalidGUID") {
				return {
					category: BCErrorCategory.VALIDATION,
					subcategory: BCErrorSubcategory.INVALID_GUID,
					retryStrategy: BCRetryStrategy.NO_RETRY,
				};
			}
			if (code === "Application_FilterErrorException") {
				return {
					category: BCErrorCategory.VALIDATION,
					subcategory: BCErrorSubcategory.FILTER_ERROR,
					retryStrategy: BCRetryStrategy.NO_RETRY,
				};
			}
			if (code === "Application_EvaluateException") {
				return {
					category: BCErrorCategory.BUSINESS_LOGIC,
					subcategory: BCErrorSubcategory.EVALUATE_EXCEPTION,
					retryStrategy: BCRetryStrategy.NO_RETRY,
				};
			}
			if (code === "Application_CallbackNotAllowed") {
				return {
					category: BCErrorCategory.BUSINESS_LOGIC,
					subcategory: BCErrorSubcategory.CALLBACK_NOT_ALLOWED,
					retryStrategy: BCRetryStrategy.NO_RETRY,
				};
			}
		}

		// Authentication errors
		if (code === "Unauthorized") {
			return {
				category: BCErrorCategory.AUTHENTICATION,
				subcategory: BCErrorSubcategory.INVALID_TOKEN,
				retryStrategy: BCRetryStrategy.REFRESH_TOKEN,
			};
		}

		if (code.startsWith("Authentication_")) {
			return {
				category: BCErrorCategory.AUTHENTICATION,
				subcategory: BCErrorSubcategory.INVALID_TOKEN,
				retryStrategy: BCRetryStrategy.REFRESH_TOKEN,
			};
		}

		// Authorization errors
		if (code.startsWith("Authorization_")) {
			return {
				category: BCErrorCategory.AUTHORIZATION,
				subcategory: BCErrorSubcategory.FIELD_VALIDATION,
				retryStrategy: BCRetryStrategy.NO_RETRY,
			};
		}

		// Default case
		return {
			category: BCErrorCategory.UNKNOWN,
			subcategory: BCErrorSubcategory.MALFORMED_REQUEST,
			retryStrategy: BCRetryStrategy.NO_RETRY,
		};
	}

	/**
	 * Checks if this error type is retryable
	 */
	isRetryable(): boolean {
		return this.retryStrategy !== BCRetryStrategy.NO_RETRY;
	}

	/**
	 * Checks if this error indicates a schema mismatch (consumer's schema vs BC response)
	 */
	isSchemaMismatch(): boolean {
		return this.code === "Client_SchemaMismatch" || this.hasValidationDetails();
	}

	/**
	 * Checks if this error has validation details (from schema parsing)
	 */
	hasValidationDetails(): boolean {
		return Boolean(this.validationDetails?.length);
	}

	/**
	 * Gets all validation field paths that failed
	 */
	getValidationFields(): string[] {
		return this.validationDetails?.map((detail) => detail.path) || [];
	}

	/**
	 * Creates a structured error object for logging/telemetry
	 */
	toLogObject(): object {
		const baseLog = {
			name: this.name,
			message: this.message,
			code: this.code,
			category: this.category,
			subcategory: this.subcategory,
			httpStatus: this.httpStatus,
			retryStrategy: this.retryStrategy,
			correlationId: this.correlationId,
			timestamp: this.timestamp.toISOString(),
			originalError: this.originalError,
		};

		// Include validation details if available
		if (this.validationDetails) {
			return {
				...baseLog,
				validationDetails: this.validationDetails,
				validationCount: this.validationDetails.length,
			};
		}

		return baseLog;
	}

	/**
	 * Creates OpenTelemetry-compatible span attributes object
	 * Focuses on Business Central-specific error context that auto-instrumentation can't capture
	 */
	toSpanAttributes(): Record<string, string | number | boolean> {
		return {
			"bc.error.code": this.code,
			"bc.error.category": this.category,
			"bc.error.subcategory": this.subcategory,
			"bc.error.retryable": this.isRetryable(),
			"bc.request.correlation_id": this.correlationId || "",
		};
	}

	/**
	 * Factory method to create BCError from schema validation issues
	 * This is the only method for handling schema validation errors
	 */
	static fromParseResult(
		issues: Array<{ message: string; path: string }>,
		httpStatus: number = 200,
		correlationId?: string,
	): BCError {
		const errorResponse: ErrorResponse = {
			error: {
				code: "Client_SchemaMismatch",
				message:
					"Schema validation failed. The provided schema does not match Business Central's response format.",
			},
		};

		const bcError = new BCError(errorResponse, httpStatus, correlationId);

		// Override categorization - this is a client configuration error
		bcError.category = BCErrorCategory.CLIENT_ERROR;
		bcError.subcategory = BCErrorSubcategory.SCHEMA_VALIDATION;
		bcError.retryStrategy = BCRetryStrategy.NO_RETRY;

		// Store the issues directly since they're already in the right format
		bcError.validationDetails = issues;

		return bcError;
	}

	/**
	 * Factory method to create BCError from HTTP error response
	 */
	static fromHttpResponse(response: {
		status: number;
		data: any;
		headers?: Record<string, string>;
	}): BCError {
		// Extract correlation ID from headers (case-insensitive)
		const correlationId =
			response.headers?.["request-id"] ||
			response.headers?.["Request-Id"] ||
			response.headers?.["REQUEST-ID"];

		// Validate and parse BC error response
		let errorResponse: ErrorResponse;
		try {
			errorResponse = validateErrorResponse(response.data);
		} catch (validationError) {
			// BC returned unexpected format - use fromUnexpectedResponse
			return BCError.fromUnexpectedResponse(
				response.data,
				response.status,
				correlationId,
			);
		}

		return new BCError(errorResponse, response.status, correlationId);
	}

	/**
	 * Factory method to create BCError from unexpected response format
	 */
	static fromUnexpectedResponse(
		response: any,
		httpStatus: number,
		correlationId?: string,
	): BCError {
		const errorResponse: ErrorResponse = {
			error: {
				code: "Client_UnexpectedResponseFormat",
				message: "Business Central returned an unexpected response format",
			},
		};

		const bcError = new BCError(errorResponse, httpStatus, correlationId);

		// Override categorization for parsing errors
		bcError.category = BCErrorCategory.PARSING_ERROR;
		bcError.subcategory = BCErrorSubcategory.UNEXPECTED_RESPONSE_FORMAT;
		bcError.retryStrategy = BCRetryStrategy.NO_RETRY;

		return bcError;
	}
}

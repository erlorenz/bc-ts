import {
	BCErrorCategory,
	BCErrorSubcategory,
	BCRetryStrategy,
	categorizeError,
} from "./categorize.js";

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
	originalResponse?: unknown;

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
		const categorization = categorizeError(errorResponse.error.code);
		this.category = categorization.category;
		this.subcategory = categorization.subcategory;
		this.retryStrategy = categorization.retryStrategy;

		// Preserve stack trace
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, BCError);
		}
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
	 * Factory method to create BCError from network/fetch errors
	 */
	static fromNetworkError(networkError: Error): BCError {
		// Type assertion to access Node.js error properties
		const nodeError = networkError as Error & {
			code?: string;
			errno?: string | number;
			syscall?: string;
		};

		// Determine retry strategy based on Node.js error codes
		let retryStrategy: BCRetryStrategy = BCRetryStrategy.EXPONENTIAL_BACKOFF;
		let subcategory: BCErrorSubcategory = BCErrorSubcategory.MALFORMED_REQUEST;

		switch (nodeError.code) {
			case "EAI_NONAME":
				// DNS resolution failed - might be temporary
				subcategory = BCErrorSubcategory.INVALID_URL;
				retryStrategy = BCRetryStrategy.EXPONENTIAL_BACKOFF;
				break;

			case "ECONNREFUSED":
				// Connection refused - server might be down
				retryStrategy = BCRetryStrategy.EXPONENTIAL_BACKOFF;
				break;

			case "ETIMEDOUT":
			case "ESOCKETTIMEDOUT":
				// Timeout - worth retrying
				retryStrategy = BCRetryStrategy.EXPONENTIAL_BACKOFF;
				break;

			case "ECONNRESET":
			case "EPIPE":
				// Connection reset - might be temporary
				retryStrategy = BCRetryStrategy.EXPONENTIAL_BACKOFF;
				break;

			case "ENOTFOUND":
				// Host not found - might be a config issue
				subcategory = BCErrorSubcategory.INVALID_URL;
				retryStrategy = BCRetryStrategy.NO_RETRY;
				break;

			case "CERT_HAS_EXPIRED":
			case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
			case "SELF_SIGNED_CERT_IN_CHAIN":
				// Certificate errors - don't retry
				retryStrategy = BCRetryStrategy.NO_RETRY;
				break;

			default:
				// Unknown network error - try with backoff
				retryStrategy = BCRetryStrategy.EXPONENTIAL_BACKOFF;
		}

		const errorMessage = nodeError.code
			? `Network error (${nodeError.code}): ${networkError.message}`
			: `Network error: ${networkError.message}`;

		const errorResponse: ErrorResponse = {
			error: {
				code: "Client_NetworkError",
				message: errorMessage,
			},
		};

		const bcError = new BCError(errorResponse, 0);

		// Override categorization for network errors
		bcError.category = BCErrorCategory.NETWORK_ERROR;
		bcError.subcategory = subcategory;
		bcError.retryStrategy = retryStrategy;

		return bcError;
	}

	/**
	 * Factory method to create BCError from JSON parsing errors
	 */
	static fromJsonError(
		jsonError: Error,
		httpStatus: number,
		correlationId: string,
	): BCError {
		const errorResponse: ErrorResponse = {
			error: {
				code: "Client_JSONParsingError",
				message: `Failed to parse JSON response: ${jsonError.message}`,
			},
		};

		const bcError = new BCError(errorResponse, httpStatus, correlationId);

		// Override categorization for JSON parsing errors
		bcError.category = BCErrorCategory.PARSING_ERROR;
		bcError.subcategory = BCErrorSubcategory.UNEXPECTED_RESPONSE_FORMAT;
		bcError.retryStrategy = BCRetryStrategy.NO_RETRY;

		return bcError;
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
	static fromHttpResponse(
		status: number,
		data: unknown,
		correlationId: string,
	): BCError {
		// Validate and parse BC error response
		let errorResponse: ErrorResponse;
		try {
			errorResponse = validateErrorResponse(data);
		} catch {
			// BC returned unexpected format - use fromUnexpectedResponse
			return BCError.fromUnexpectedResponse(data, status, correlationId);
		}

		return new BCError(errorResponse, status, correlationId);
	}

	/**
	 * Factory method to create BCError from unexpected response format
	 */
	static fromUnexpectedResponse(
		data: unknown,
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
		bcError.originalResponse = data;

		return bcError;
	}
}

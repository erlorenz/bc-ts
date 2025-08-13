import {
	type BCErrorCategory,
	type BCRetryStrategy,
	categorizeError,
} from "./categorize.js";

type ServerError = {
	code: string;
	message: string;
};

function parseErrorResponse(data: unknown): ServerError {
	const response = data as { error?: { code?: string; message?: string } };

	if (!response.error?.code || !response.error?.message) {
		throw new Error("Invalid BC error response format");
	}

	return {
		code: response.error.code,
		message: response.error.message,
	};
}

/**
 * Business Central API Error class
 */
export class BCError extends Error {
	readonly category: BCErrorCategory;
	readonly httpStatus: number;
	readonly retryStrategy: BCRetryStrategy;
	readonly timestamp: Date;
	correlationId?: string;
	validationDetails?: { message: string; path: string }[];
	serverError?: ServerError;
	responseData?: unknown;
	cause?: Error;

	constructor(
		message: string,
		category: BCErrorCategory,
		retryStrategy: BCRetryStrategy,
		httpStatus: number,
	) {
		super(message);

		this.name = "BCError";
		this.category = category;
		this.retryStrategy = retryStrategy;
		this.httpStatus = httpStatus;
		this.timestamp = new Date();

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, BCError);
		}
	}

	isRetryable(): boolean {
		return this.retryStrategy !== "NO_RETRY";
	}

	isSchemaMismatch(): boolean {
		return this.category === "SCHEMA_MISMATCH";
	}

	hasValidationDetails(): boolean {
		return Boolean(this.validationDetails?.length);
	}

	getValidationFields(): string[] {
		return this.validationDetails?.map((detail) => detail.path) || [];
	}

	toLogObject() {
		return {
			name: this.name,
			message: this.message,
			category: this.category,
			httpStatus: this.httpStatus,
			retryStrategy: this.retryStrategy,
			correlationId: this.correlationId,
			timestamp: this.timestamp.toISOString(),
			validationDetails: this.validationDetails,
			validationCount: this.validationDetails?.length,
			responseData: this.responseData,
			serverError: this.serverError,
		};
	}

	toSpanAttributes(): Record<string, string | number | boolean> {
		return {
			"bc.error.category": this.category,
			"bc.error.retryable": this.isRetryable(),
			"bc.request.correlation_id": this.correlationId || "",
		};
	}

	static fromHttpResponse(
		status: number,
		data: unknown,
		correlationId: string,
	): BCError {
		let serverError: ServerError;
		try {
			serverError = parseErrorResponse(data);
		} catch {
			return BCError.fromUnexpectedResponse(data, status, correlationId);
		}

		const { category, retryStrategy } = categorizeError(serverError.code);

		const bcError = new BCError(
			serverError.message,
			category,
			retryStrategy,
			status,
		);

		if (correlationId) bcError.correlationId = correlationId;
		bcError.serverError = serverError;
		return bcError;
	}

	static fromSchemaValidation(
		issues: { message: string; path: string }[],
		httpStatus: number = 200,
	): BCError {
		const bcError = new BCError(
			"Schema validation failed. The provided schema does not match Business Central's response format.",
			"SCHEMA_MISMATCH",
			"NO_RETRY",
			httpStatus,
		);

		bcError.validationDetails = issues;
		return bcError;
	}

	static fromUnexpectedResponse(
		data: unknown,
		httpStatus: number,
		correlationId: string,
		cause?: Error, // For JSON parsing
	): BCError {
		const bcError = new BCError(
			"Business Central returned an unexpected response format",
			"UNEXPECTED_RESPONSE",
			"NO_RETRY",
			httpStatus,
		);

		if (correlationId) bcError.correlationId = correlationId;
		bcError.responseData = data;
		bcError.cause = cause;
		return bcError;
	}

	static fromGetToken(err: unknown): BCError {
		let message: string = "Failed to retrieve authentication token.";
		let cause = new Error(message);

		if (typeof err === "string") {
			message = `${message}: ${err}`;
			cause = new Error(err);
		}

		if (err instanceof Error) {
			message = `${message}: ${err.message}`;
			cause = err;
		}

		const bcError = new BCError(
			message,
			"AUTHENTICATION",
			"REFRESH_TOKEN",
			401,
		);

		bcError.cause = cause;
		return bcError;
	}

	static fromNetworkError(networkError: Error): BCError {
		const nodeError = networkError as Error & { code?: string };

		const errorMessage = nodeError.code
			? `Network error (${nodeError.code}): ${networkError.message}`
			: `Network error: ${networkError.message}`;

		const bcError = new BCError(
			errorMessage,
			"NETWORK_ERROR",
			"EXPONENTIAL_BACKOFF",
			0,
		);

		bcError.cause = networkError;
		return bcError;
	}
}

export {
	type AuthClient,
	BCClient,
	type BCConfig,
} from "./client/client.js";
export type {
	BCErrorCategory,
	BCRetryStrategy,
} from "./error/categorize.js";
export { BCError } from "./error/error.js";
export { ApiPage } from "./pages/api-page.js";
export { ApiQuery } from "./pages/api-query.js";

import {
	createServer,
	type IncomingMessage,
	type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { setTimeout as sleep } from "node:timers/promises";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type MockRoute = {
	method: Method;
	path: string;
	response: {
		status: number;
		headers?: Record<string, string>;
		body: unknown;
	};
	delay?: number;
	// Simulate network error
	closeConnection?: boolean;
	malformedResponse?: boolean;
};

function routePath(method: Method, path: string): RoutePath {
	return `${method} ${path}`;
}
type RoutePath = `${Method} ${string}`;

export class MockServer {
	#server = createServer();
	#routes: Map<RoutePath, MockRoute> = new Map();

	constructor() {
		this.#server.on("request", this.#handleRequest.bind(this));
	}

	addRoute(route: MockRoute): void {
		this.#routes.set(`${route.method} ${route.path}`, route);
	}

	/** Listen and return the URL. If no port is entered it picks an available one. */
	async start(port = 0): Promise<string> {
		return new Promise((resolve) => {
			this.#server.listen(port, () => {
				// listen on random port
				const address = this.#server.address() as AddressInfo;
				resolve(`http://localhost:${address.port}`);
			});
		});
	}
	/** Shuts down the server. */
	async stop(): Promise<void> {
		return new Promise((resolve) => {
			this.#server.close(() => resolve());
		});
	}

	// Force server to close all connections (simulates network failure).
	closeAll(): void {
		this.#server.closeAllConnections();
	}

	async #handleRequest(
		req: IncomingMessage,
		res: ServerResponse,
	): Promise<void> {
		const url = new URL(req.url || "", "http://localhost");
		const method = req.method as Method;

		const route = this.#routes.get(routePath(method, url.pathname));

		if (!route) {
			res.writeHead(404);
			res.end("Not Found");
			return;
		}

		// Simulate connection drop (network error)
		if (route.closeConnection) {
			req.socket.destroy();
			return;
		}

		// Simulate network delay if specified
		if (route.delay) {
			await sleep(route.delay);
		}

		// Simulate malformed response (partial/corrupted data)
		if (route.malformedResponse) {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.write('{"incomplete": "json"'); // No closing brace
			req.socket.destroy(); // Cut connection mid-response
			return;
		}

		// Set headers
		const headers = {
			"Content-Type": "application/json",
			...route.response.headers,
		};

		res.writeHead(route.response.status, headers);

		if (typeof route.response.body === "string") {
			res.end(route.response.body);
		} else {
			res.end(JSON.stringify(route.response.body));
		}
	}
}

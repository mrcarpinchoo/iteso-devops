import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { beforeAll, describe, it, expect } from "vitest";
import worker from "../src/index";

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

const expected = {
	message: "Hello, world!",
	result: [{ id: 1, name: "Alice" }],
};

// Seed the local D1 database once for this file.
beforeAll(async () => {
	await env.db.batch([
		env.db.prepare("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)"),
		env.db.prepare("INSERT INTO users (id, name) VALUES (1, 'Alice')"),
	]);
});

describe("Users worker", () => {
	it("responds with the users from D1 (unit style)", async () => {
		const request = new IncomingRequest("http://example.com");
		// Create an empty context to pass to `worker.fetch()`.
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
		await waitOnExecutionContext(ctx);
		expect(await response.json()).toEqual(expected);
	});

	it("responds with the users from D1 (integration style)", async () => {
		const response = await SELF.fetch("https://example.com");
		expect(await response.json()).toEqual(expected);
	});
});

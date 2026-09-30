import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, it, expect } from "vitest";

const BASE = "https://example.com/users";

const json = (method: string, body: unknown, path = "") =>
	SELF.fetch(BASE + path, {
		method,
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});

beforeEach(async () => {
	await env.db.batch([
		env.db.prepare("DROP TABLE IF EXISTS users"),
		env.db.prepare("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)"),
		env.db.prepare("INSERT INTO users (id, name) VALUES (1, 'Alice'), (2, 'Bob')"),
	]);
});

describe("GET /users", () => {
	it("lists all users", async () => {
		const response = await SELF.fetch(BASE);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([
			{ id: 1, name: "Alice" },
			{ id: 2, name: "Bob" },
		]);
	});

	it("accepts a trailing slash", async () => {
		const response = await SELF.fetch(BASE + "/");
		expect(response.status).toBe(200);
	});
});

describe("GET /users/:id", () => {
	it("returns a single user", async () => {
		const response = await SELF.fetch(BASE + "/2");
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ id: 2, name: "Bob" });
	});

	it("returns 404 for an unknown user", async () => {
		const response = await SELF.fetch(BASE + "/99");
		expect(response.status).toBe(404);
	});

	it("returns 400 for a non-numeric id", async () => {
		const response = await SELF.fetch(BASE + "/abc");
		expect(response.status).toBe(400);
	});
});

describe("POST /users", () => {
	it("creates a user and returns it with 201", async () => {
		const response = await json("POST", { name: "  Carol " });
		expect(response.status).toBe(201);
		expect(await response.json()).toEqual({ id: 3, name: "Carol" });

		const fetched = await SELF.fetch(BASE + "/3");
		expect(await fetched.json()).toEqual({ id: 3, name: "Carol" });
	});

	it.each([
		["missing name", {}],
		["empty name", { name: "   " }],
		["non-string name", { name: 42 }],
		["null body", null],
	])("returns 400 for %s", async (_label, body) => {
		const response = await json("POST", body);
		expect(response.status).toBe(400);
	});

	it("returns 400 for invalid JSON", async () => {
		const response = await SELF.fetch(BASE, { method: "POST", body: "not json" });
		expect(response.status).toBe(400);
	});
});

describe("PUT /users/:id", () => {
	it("updates an existing user", async () => {
		const response = await json("PUT", { name: "Alicia" }, "/1");
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ id: 1, name: "Alicia" });

		const fetched = await SELF.fetch(BASE + "/1");
		expect(await fetched.json()).toEqual({ id: 1, name: "Alicia" });
	});

	it("returns 404 for an unknown user", async () => {
		const response = await json("PUT", { name: "Ghost" }, "/99");
		expect(response.status).toBe(404);
	});

	it("returns 400 for an invalid name", async () => {
		const response = await json("PUT", { name: "" }, "/1");
		expect(response.status).toBe(400);
	});
});

describe("DELETE /users/:id", () => {
	it("deletes an existing user with 204", async () => {
		const response = await SELF.fetch(BASE + "/1", { method: "DELETE" });
		expect(response.status).toBe(204);

		const fetched = await SELF.fetch(BASE + "/1");
		expect(fetched.status).toBe(404);
	});

	it("returns 404 for an unknown user", async () => {
		const response = await SELF.fetch(BASE + "/99", { method: "DELETE" });
		expect(response.status).toBe(404);
	});
});

describe("unsupported requests", () => {
	it("returns 405 for unsupported methods on the collection", async () => {
		const response = await SELF.fetch(BASE, { method: "DELETE" });
		expect(response.status).toBe(405);
	});

	it("returns 405 for unsupported methods on a single user", async () => {
		const response = await SELF.fetch(BASE + "/1", { method: "PATCH" });
		expect(response.status).toBe(405);
	});

	it("returns 404 for nested paths", async () => {
		const response = await SELF.fetch(BASE + "/1/extra");
		expect(response.status).toBe(404);
	});
});

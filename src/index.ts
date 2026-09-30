/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { handleUsers } from './users';

async function queryDatabase(db: D1Database) {
	// Connect and execute a query
	const { results } = await db.prepare('SELECT * FROM users').all();

	return results;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const { pathname } = new URL(request.url);
		if (pathname === '/users' || pathname.startsWith('/users/')) {
			return handleUsers(request, env.db, pathname);
		}

		const result = await queryDatabase(env.db);

		return Response.json({ message: 'Hello, world!', result });
	},
} satisfies ExportedHandler<Env>;

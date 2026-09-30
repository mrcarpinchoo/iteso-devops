interface User {
	id: number;
	name: string;
}

const error = (message: string, status: number) => Response.json({ error: message }, { status });

async function readName(request: Request): Promise<string | null> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return null;
	}
	const name = (body as { name?: unknown } | null)?.name;
	return typeof name === 'string' && name.trim() !== '' ? name.trim() : null;
}

export async function handleUsers(request: Request, db: D1Database, pathname: string): Promise<Response> {
	const match = pathname.match(/^\/users(?:\/([^/]+))?\/?$/);
	if (!match) return error('Not found', 404);

	const rawId = match[1];

	if (rawId === undefined) {
		if (request.method === 'GET') {
			const { results } = await db.prepare('SELECT id, name FROM users ORDER BY id').all<User>();
			return Response.json(results);
		}
		if (request.method === 'POST') {
			const name = await readName(request);
			if (name === null) return error('"name" must be a non-empty string', 400);
			const user = await db.prepare('INSERT INTO users (name) VALUES (?) RETURNING id, name').bind(name).first<User>();
			return Response.json(user, { status: 201 });
		}
		return error('Method not allowed', 405);
	}

	if (!/^\d+$/.test(rawId)) return error('User id must be a positive integer', 400);
	const id = Number(rawId);

	switch (request.method) {
		case 'GET': {
			const user = await db.prepare('SELECT id, name FROM users WHERE id = ?').bind(id).first<User>();
			return user ? Response.json(user) : error('User not found', 404);
		}
		case 'PUT': {
			const name = await readName(request);
			if (name === null) return error('"name" must be a non-empty string', 400);
			const user = await db.prepare('UPDATE users SET name = ? WHERE id = ? RETURNING id, name').bind(name, id).first<User>();
			return user ? Response.json(user) : error('User not found', 404);
		}
		case 'DELETE': {
			const { meta } = await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
			return meta.changes > 0 ? new Response(null, { status: 204 }) : error('User not found', 404);
		}
		default:
			return error('Method not allowed', 405);
	}
}

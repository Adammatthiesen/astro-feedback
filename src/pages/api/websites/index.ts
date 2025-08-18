import { AdminUsers, db, eq, Websites } from 'astro:db';
import type { APIRoute } from 'astro';
import { websiteSchema } from '../../../lib/schemas';
import { generateApiKey, generateWebsiteID } from '../../../lib/utils';

export const POST: APIRoute = async ({ request, cookies }) => {
	try {
		// Check admin authentication
		const sessionCookie = cookies.get('admin-session');
		if (!sessionCookie) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		let currentAdmin: typeof AdminUsers.$inferSelect | undefined;
		try {
			const sessionData = JSON.parse(sessionCookie.value);
			currentAdmin = await db
				.select()
				.from(AdminUsers)
				.where(eq(AdminUsers.id, sessionData.adminId))
				.get();

			if (!currentAdmin || !currentAdmin.isActive) {
				return new Response(JSON.stringify({ error: 'Unauthorized' }), {
					status: 401,
					headers: { 'Content-Type': 'application/json' },
				});
			}
		} catch (_error) {
			return new Response(JSON.stringify({ error: 'Invalid session' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		const body = await request.json();

		// Validate request body
		const validationResult = websiteSchema.safeParse(body);
		if (!validationResult.success) {
			return new Response(
				JSON.stringify({
					error: 'Invalid request data',
					details: validationResult.error.errors,
				}),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		const data = validationResult.data;

		// Check if domain already exists
		const existingWebsite = await db
			.select()
			.from(Websites)
			.where(eq(Websites.domain, data.domain))
			.get();

		if (existingWebsite) {
			return new Response(
				JSON.stringify({
					error: 'A website with this domain already exists',
				}),
				{
					status: 409,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		// Generate API key
		const apiKey = generateApiKey();

		// Create website
		const website = await db
			.insert(Websites)
			.values({
				id: generateWebsiteID(),
				name: data.name,
				domain: data.domain,
				apiKey,
				description: data.description || null,
				isActive: true,
				settings: data.settings || null,
			})
			.returning();

		return new Response(
			JSON.stringify({
				success: true,
				data: {
					...website[0],
					// Include API key in response for initial setup
					apiKey,
				},
			}),
			{
				status: 201,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	} catch (error) {
		console.error('Error creating website:', error);
		return new Response(
			JSON.stringify({
				error: 'Internal server error',
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};

export const GET: APIRoute = async ({ cookies }) => {
	try {
		// Check admin authentication
		const sessionCookie = cookies.get('admin-session');
		if (!sessionCookie) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		let currentAdmin: typeof AdminUsers.$inferSelect | undefined;
		try {
			const sessionData = JSON.parse(sessionCookie.value);
			currentAdmin = await db
				.select()
				.from(AdminUsers)
				.where(eq(AdminUsers.id, sessionData.adminId))
				.get();

			if (!currentAdmin || !currentAdmin.isActive) {
				return new Response(JSON.stringify({ error: 'Unauthorized' }), {
					status: 401,
					headers: { 'Content-Type': 'application/json' },
				});
			}
		} catch (_error) {
			return new Response(JSON.stringify({ error: 'Invalid session' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Get all websites (without API keys for security)
		const websites = await db
			.select({
				id: Websites.id,
				name: Websites.name,
				domain: Websites.domain,
				description: Websites.description,
				isActive: Websites.isActive,
				settings: Websites.settings,
				createdAt: Websites.createdAt,
				updatedAt: Websites.updatedAt,
			})
			.from(Websites);

		return new Response(
			JSON.stringify({
				success: true,
				data: websites,
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	} catch (error) {
		console.error('Error fetching websites:', error);
		return new Response(
			JSON.stringify({
				error: 'Internal server error',
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};

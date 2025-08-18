import { AdminUsers, db, eq, Websites } from 'astro:db';
import type { APIRoute } from 'astro';
import { z } from 'astro/zod';

const createWebsiteSchema = z.object({
	name: z.string().min(1),
	domain: z.string().min(1),
	description: z.string().optional(),
	apiKey: z.string().min(1),
	isActive: z.boolean().default(true),
	settings: z.object({
		rateLimit: z.object({
			maxSubmissions: z.number().min(1),
			windowMinutes: z.number().min(1),
		}),
		allowedOrigins: z.array(z.string()),
		moderationRequired: z.boolean(),
		emailNotifications: z.boolean(),
	}),
});

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

		// Parse and validate request body
		const body = await request.json();
		const result = createWebsiteSchema.safeParse(body);

		if (!result.success) {
			return new Response(
				JSON.stringify({
					error: 'Invalid input',
					details: result.error.errors,
				}),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		const { name, domain, description, apiKey, isActive, settings } = result.data;

		// Check if domain already exists
		const existingWebsite = await db
			.select()
			.from(Websites)
			.where(eq(Websites.domain, domain))
			.get();

		if (existingWebsite) {
			return new Response(JSON.stringify({ error: 'Domain already exists' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Create website
		const newWebsite = await db
			.insert(Websites)
			.values({
				name,
				domain,
				description,
				apiKey,
				isActive,
				settings,
				createdAt: new Date(),
			})
			.returning();

		return new Response(
			JSON.stringify({
				success: true,
				website: newWebsite[0],
			}),
			{
				status: 201,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	} catch (error) {
		console.error('Website creation error:', error);
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

export const DELETE: APIRoute = async ({ params, cookies }) => {
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

		// Get website ID from params
		const websiteId = Number.parseInt(params.id as string);
		if (Number.isNaN(websiteId)) {
			return new Response(JSON.stringify({ error: 'Invalid website ID' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Check if website exists
		const existingWebsite = await db
			.select()
			.from(Websites)
			.where(eq(Websites.id, websiteId))
			.get();

		if (!existingWebsite) {
			return new Response(JSON.stringify({ error: 'Website not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Delete website (this will cascade delete related data)
		await db.delete(Websites).where(eq(Websites.id, websiteId));

		return new Response(
			JSON.stringify({
				success: true,
				message: 'Website deleted successfully',
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	} catch (error) {
		console.error('Website deletion error:', error);
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

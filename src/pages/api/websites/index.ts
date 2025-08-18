import { db, eq, Websites } from 'astro:db';
import crypto from 'node:crypto';
import type { APIRoute } from 'astro';
import { websiteSchema } from '../../../lib/schemas';
import { generateWebsiteID } from '../../../lib/utils';

// Generate a secure API key
function generateApiKey(): string {
	return crypto.randomBytes(32).toString('hex');
}

export const POST: APIRoute = async ({ request }) => {
	try {
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

export const GET: APIRoute = async ({ request }) => {
	try {
		const adminKey = request.headers.get('x-admin-key');

		// Basic admin authentication - you should implement proper admin auth
		if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
			return new Response(JSON.stringify({ error: 'Admin access required' }), {
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

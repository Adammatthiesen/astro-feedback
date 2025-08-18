import { and, asc, db, eq, FeedbackCategories, Websites } from 'astro:db';
import type { APIRoute } from 'astro';
import { categorySchema } from '../../../lib/schemas';

async function verifyApiKey(websiteId: number, apiKey: string) {
	const website = await db
		.select()
		.from(Websites)
		.where(and(eq(Websites.id, websiteId), eq(Websites.apiKey, apiKey)))
		.get();

	if (!website || !website.isActive) {
		return null;
	}
	return website;
}

export const GET: APIRoute = async ({ request, url }) => {
	try {
		const searchParams = url.searchParams;
		const websiteId = Number.parseInt(searchParams.get('websiteId') || '0', 10);

		if (!websiteId) {
			return new Response(JSON.stringify({ error: 'Website ID required' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const apiKey = request.headers.get('x-api-key');
		if (!apiKey) {
			return new Response(JSON.stringify({ error: 'API key required' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Verify website and API key
		const website = await verifyApiKey(websiteId, apiKey);
		if (!website) {
			return new Response(JSON.stringify({ error: 'Invalid API key or inactive website' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Get categories for this website
		const categories = await db
			.select()
			.from(FeedbackCategories)
			.where(
				and(eq(FeedbackCategories.websiteId, websiteId), eq(FeedbackCategories.isActive, true))
			)
			.orderBy(asc(FeedbackCategories.sortOrder), asc(FeedbackCategories.name));

		return new Response(
			JSON.stringify({
				success: true,
				data: categories,
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	} catch (error) {
		console.error('Error fetching categories:', error);
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

export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json();

		// Validate request body
		const validationResult = categorySchema.safeParse(body);
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

		const apiKey = request.headers.get('x-api-key');
		if (!apiKey) {
			return new Response(JSON.stringify({ error: 'API key required' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Verify website and API key
		const website = await verifyApiKey(data.websiteId, apiKey);
		if (!website) {
			return new Response(JSON.stringify({ error: 'Invalid API key or inactive website' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Check if slug already exists for this website
		const existingCategory = await db
			.select()
			.from(FeedbackCategories)
			.where(
				and(
					eq(FeedbackCategories.websiteId, data.websiteId),
					eq(FeedbackCategories.slug, data.slug)
				)
			)
			.get();

		if (existingCategory) {
			return new Response(
				JSON.stringify({
					error: 'A category with this slug already exists for this website',
				}),
				{
					status: 409,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		// Create category
		const category = await db
			.insert(FeedbackCategories)
			.values({
				websiteId: data.websiteId,
				name: data.name,
				slug: data.slug,
				description: data.description || null,
				color: data.color || null,
				isActive: true,
				sortOrder: data.sortOrder || 0,
			})
			.returning();

		return new Response(
			JSON.stringify({
				success: true,
				data: category[0],
			}),
			{
				status: 201,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	} catch (error) {
		console.error('Error creating category:', error);
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

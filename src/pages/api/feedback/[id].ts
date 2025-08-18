import { and, db, eq, Feedback, FeedbackCategories, Websites } from 'astro:db';
import type { APIRoute } from 'astro';
import { feedbackUpdateSchema } from '../../../lib/schemas';

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

export const GET: APIRoute = async ({ params, request }) => {
	try {
		const feedbackId = Number.parseInt(params.id as string, 10);

		if (!feedbackId) {
			return new Response(JSON.stringify({ error: 'Invalid feedback ID' }), {
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

		// Get feedback with category info
		const feedback = await db
			.select({
				id: Feedback.id,
				websiteId: Feedback.websiteId,
				categoryId: Feedback.categoryId,
				type: Feedback.type,
				status: Feedback.status,
				priority: Feedback.priority,
				title: Feedback.title,
				description: Feedback.description,
				email: Feedback.email,
				name: Feedback.name,
				url: Feedback.url,
				userAgent: Feedback.userAgent,
				metadata: Feedback.metadata,
				isPublic: Feedback.isPublic,
				upvotes: Feedback.upvotes,
				downvotes: Feedback.downvotes,
				createdAt: Feedback.createdAt,
				updatedAt: Feedback.updatedAt,
				categoryName: FeedbackCategories.name,
				categoryColor: FeedbackCategories.color,
			})
			.from(Feedback)
			.leftJoin(FeedbackCategories, eq(Feedback.categoryId, FeedbackCategories.id))
			.where(eq(Feedback.id, feedbackId))
			.get();

		if (!feedback) {
			return new Response(JSON.stringify({ error: 'Feedback not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Verify API key for this website
		const website = await verifyApiKey(feedback.websiteId, apiKey);
		if (!website) {
			return new Response(JSON.stringify({ error: 'Invalid API key' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response(
			JSON.stringify({
				success: true,
				data: feedback,
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	} catch (error) {
		console.error('Error fetching feedback:', error);
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

export const PATCH: APIRoute = async ({ params, request }) => {
	try {
		const feedbackId = Number.parseInt(params.id as string, 10);

		if (!feedbackId) {
			return new Response(JSON.stringify({ error: 'Invalid feedback ID' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const body = await request.json();

		// Validate request body
		const validationResult = feedbackUpdateSchema.safeParse(body);
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

		const updateData = validationResult.data;

		const apiKey = request.headers.get('x-api-key');
		if (!apiKey) {
			return new Response(JSON.stringify({ error: 'API key required' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Get existing feedback
		const existingFeedback = await db
			.select()
			.from(Feedback)
			.where(eq(Feedback.id, feedbackId))
			.get();

		if (!existingFeedback) {
			return new Response(JSON.stringify({ error: 'Feedback not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Verify API key for this website
		const website = await verifyApiKey(existingFeedback.websiteId, apiKey);
		if (!website) {
			return new Response(JSON.stringify({ error: 'Invalid API key' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Update feedback
		const updatedFeedback = await db
			.update(Feedback)
			.set({
				...updateData,
				updatedAt: new Date(),
			})
			.where(eq(Feedback.id, feedbackId))
			.returning();

		return new Response(
			JSON.stringify({
				success: true,
				data: updatedFeedback[0],
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	} catch (error) {
		console.error('Error updating feedback:', error);
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

export const DELETE: APIRoute = async ({ params, request }) => {
	try {
		const feedbackId = Number.parseInt(params.id as string, 10);

		if (!feedbackId) {
			return new Response(JSON.stringify({ error: 'Invalid feedback ID' }), {
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

		// Get existing feedback
		const existingFeedback = await db
			.select()
			.from(Feedback)
			.where(eq(Feedback.id, feedbackId))
			.get();

		if (!existingFeedback) {
			return new Response(JSON.stringify({ error: 'Feedback not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Verify API key for this website
		const website = await verifyApiKey(existingFeedback.websiteId, apiKey);
		if (!website) {
			return new Response(JSON.stringify({ error: 'Invalid API key' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Delete feedback
		await db.delete(Feedback).where(eq(Feedback.id, feedbackId));

		return new Response(
			JSON.stringify({
				success: true,
				message: 'Feedback deleted successfully',
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	} catch (error) {
		console.error('Error deleting feedback:', error);
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

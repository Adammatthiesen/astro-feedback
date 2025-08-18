import {
	AnalyticsEvents,
	and,
	asc,
	db,
	desc,
	eq,
	Feedback,
	FeedbackCategories,
	sql,
} from 'astro:db';
import type { APIRoute } from 'astro';
import { feedbackQuerySchema, feedbackSubmissionSchema, type Website } from '../../../lib/schemas';
import { getClientInfo, verifyApiKey } from '../../../lib/utils';

export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json();

		// Validate request body
		const validationResult = feedbackSubmissionSchema.safeParse(body);
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

		// Get API key from headers
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

		// Get client info
		const { ipAddress, userAgent } = getClientInfo(request);

		const settings = (website.settings || {}) as Website['settings'];

		// Check rate limiting if configured
		if (settings?.rateLimit) {
			const { maxSubmissions, windowMinutes } = settings.rateLimit;
			const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

			const recentSubmissions = await db
				.select({ count: sql`count(*)` })
				.from(Feedback)
				.where(
					and(
						eq(Feedback.websiteId, data.websiteId),
						eq(Feedback.ipAddress, ipAddress),
						sql`${Feedback.createdAt} > ${windowStart}`
					)
				)
				.get();

			if (recentSubmissions && Number(recentSubmissions.count) >= maxSubmissions) {
				return new Response(
					JSON.stringify({
						error: 'Rate limit exceeded. Please try again later.',
					}),
					{
						status: 429,
						headers: { 'Content-Type': 'application/json' },
					}
				);
			}
		}

		// Insert feedback
		const feedback = await db
			.insert(Feedback)
			.values({
				websiteId: data.websiteId,
				categoryId: data.categoryId || null,
				type: data.type,
				status: 'new',
				priority: 'medium',
				title: data.title,
				description: data.description,
				email: data.email || null,
				name: data.name || null,
				url: data.url || null,
				userAgent,
				ipAddress,
				metadata: data.metadata || null,
				isPublic: false,
				upvotes: 0,
				downvotes: 0,
			})
			.returning();

		// Log analytics event
		await db.insert(AnalyticsEvents).values({
			websiteId: data.websiteId,
			eventType: 'feedback_submitted',
			eventData: {
				feedbackId: feedback[0].id,
				type: data.type,
				hasEmail: !!data.email,
				hasCategory: !!data.categoryId,
			},
			userAgent,
			ipAddress,
		});

		return new Response(
			JSON.stringify({
				success: true,
				data: {
					id: feedback[0].id,
					status: feedback[0].status,
					createdAt: feedback[0].createdAt,
				},
			}),
			{
				status: 201,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	} catch (error) {
		console.error('Error submitting feedback:', error);
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

		// Parse and validate query parameters
		const queryValidation = feedbackQuerySchema.safeParse({
			status: searchParams.get('status') || undefined,
			type: searchParams.get('type') || undefined,
			category: searchParams.get('category') || undefined,
			limit: searchParams.get('limit') || '10',
			offset: searchParams.get('offset') || '0',
			sort: searchParams.get('sort') || 'newest',
			public: searchParams.get('public') || undefined,
		});

		if (!queryValidation.success) {
			return new Response(
				JSON.stringify({
					error: 'Invalid query parameters',
					details: queryValidation.error.errors,
				}),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		const query = queryValidation.data;

		// Build query conditions
		const conditions = [eq(Feedback.websiteId, websiteId)];

		if (query.status) conditions.push(eq(Feedback.status, query.status));
		if (query.type) conditions.push(eq(Feedback.type, query.type));
		if (query.public) conditions.push(eq(Feedback.isPublic, true));

		if (query.category) {
			const categoryRecord = await db
				.select()
				.from(FeedbackCategories)
				.where(
					and(
						eq(FeedbackCategories.websiteId, websiteId),
						eq(FeedbackCategories.slug, query.category)
					)
				)
				.get();

			if (categoryRecord) {
				conditions.push(eq(Feedback.categoryId, categoryRecord.id));
			}
		}

		// Determine sort order
		let orderBy: ReturnType<typeof asc>;
		switch (query.sort) {
			case 'oldest':
				orderBy = asc(Feedback.createdAt);
				break;
			case 'priority':
				orderBy = desc(Feedback.priority);
				break;
			case 'upvotes':
				orderBy = desc(Feedback.upvotes);
				break;
			default:
				orderBy = desc(Feedback.createdAt);
		}

		// Get total count
		const totalResult = await db
			.select({ count: sql`count(*)` })
			.from(Feedback)
			.where(and(...conditions))
			.get();

		const total = Number(totalResult?.count || 0);

		// Get feedback with pagination
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
				isPublic: Feedback.isPublic,
				upvotes: Feedback.upvotes,
				downvotes: Feedback.downvotes,
				createdAt: Feedback.createdAt,
				updatedAt: Feedback.updatedAt,
				categoryName: FeedbackCategories.name,
			})
			.from(Feedback)
			.leftJoin(FeedbackCategories, eq(Feedback.categoryId, FeedbackCategories.id))
			.where(and(...conditions))
			.orderBy(orderBy)
			.limit(query.limit)
			.offset(query.offset);

		const totalPages = Math.ceil(total / query.limit);
		const currentPage = Math.floor(query.offset / query.limit) + 1;

		return new Response(
			JSON.stringify({
				success: true,
				data: feedback,
				pagination: {
					total,
					page: currentPage,
					limit: query.limit,
					totalPages,
				},
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

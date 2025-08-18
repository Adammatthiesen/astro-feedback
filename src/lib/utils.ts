import {
	AnalyticsEvents,
	and,
	db,
	desc,
	eq,
	Feedback,
	FeedbackCategories,
	Websites,
} from 'astro:db';
import crypto from 'node:crypto';

/**
 * Verify API key and get website
 */
export async function verifyApiKey(websiteId: number, apiKey: string) {
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

/**
 * Get client information from request
 */
export function getClientInfo(request: Request) {
	const ipAddress =
		request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
	const userAgent = request.headers.get('user-agent') || 'unknown';
	return { ipAddress, userAgent };
}

/**
 * Log analytics event
 */
export async function logAnalyticsEvent(
	websiteId: number,
	eventType: string,
	// biome-ignore lint/suspicious/noExplicitAny: EventData can have any in its object
	eventData: Record<string, any>,
	request: Request
) {
	const { ipAddress, userAgent } = getClientInfo(request);

	try {
		await db.insert(AnalyticsEvents).values({
			websiteId,
			eventType,
			eventData,
			userAgent,
			ipAddress,
		});
	} catch (error) {
		console.error('Failed to log analytics event:', error);
	}
}

/**
 * Get public feedback for a website
 */
export async function getPublicFeedback(
	websiteId: number,
	options: {
		limit?: number;
		offset?: number;
		type?: string;
		category?: string;
		sort?: 'newest' | 'oldest' | 'upvotes';
	} = {}
) {
	const { limit = 10, offset = 0, type, category, sort = 'newest' } = options;

	const conditions = [eq(Feedback.websiteId, websiteId), eq(Feedback.isPublic, true)];

	if (type) {
		conditions.push(
			eq(
				Feedback.type,
				type as
					| 'bug'
					| 'feature'
					| 'improvement'
					| 'question'
					| 'compliment'
					| 'complaint'
					| 'other'
			)
		);
	}

	if (category) {
		const categoryRecord = await db
			.select()
			.from(FeedbackCategories)
			.where(
				and(eq(FeedbackCategories.websiteId, websiteId), eq(FeedbackCategories.slug, category))
			)
			.get();

		if (categoryRecord) {
			conditions.push(eq(Feedback.categoryId, categoryRecord.id));
		}
	}

	let orderBy: ReturnType<typeof desc>;
	switch (sort) {
		case 'oldest':
			orderBy = desc(Feedback.createdAt);
			break;
		case 'upvotes':
			orderBy = desc(Feedback.upvotes);
			break;
		default:
			orderBy = desc(Feedback.createdAt);
	}

	const feedback = await db
		.select({
			id: Feedback.id,
			type: Feedback.type,
			status: Feedback.status,
			title: Feedback.title,
			description: Feedback.description,
			upvotes: Feedback.upvotes,
			downvotes: Feedback.downvotes,
			createdAt: Feedback.createdAt,
			categoryName: FeedbackCategories.name,
			categoryColor: FeedbackCategories.color,
		})
		.from(Feedback)
		.leftJoin(FeedbackCategories, eq(Feedback.categoryId, FeedbackCategories.id))
		.where(and(...conditions))
		.orderBy(orderBy)
		.limit(limit)
		.offset(offset);

	return feedback;
}

/**
 * Create standard API response
 */
export function createApiResponse<T>(
	success: boolean,
	data?: T,
	error?: string,
	status = 200
): Response {
	// biome-ignore lint/suspicious/noExplicitAny: Allows for any response data
	const response: any = { success };

	if (data !== undefined) {
		response.data = data;
	}

	if (error) {
		response.error = error;
	}

	return new Response(JSON.stringify(response), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

/**
 * Generate API key
 */
export function generateApiKey(): string {
	return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

/**
 * Sanitize HTML content
 */
export function sanitizeHtml(html: string): string {
	// Basic HTML sanitization - you might want to use a proper library like DOMPurify
	return html
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
		.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
		.replace(/javascript:/gi, '')
		.replace(/on\w+\s*=/gi, '');
}

/**
 * Rate limiting check
 */
export async function checkRateLimit(
	websiteId: number,
	ipAddress: string,
	maxRequests: number,
	windowMinutes: number
): Promise<boolean> {
	// TODO Implement this

	const _windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

	// This is a simplified rate limiting check
	// In production, you might want to use Redis or a more sophisticated solution

	const recentRequests = await db
		.select()
		.from(Feedback)
		.where(
			and(
				eq(Feedback.websiteId, websiteId),
				eq(Feedback.ipAddress, ipAddress)
				// Note: You'd need to add a proper date comparison here
			)
		);

	return recentRequests.length < maxRequests;
}

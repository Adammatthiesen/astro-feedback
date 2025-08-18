import { AnalyticsEvents, and, db, desc, eq, Feedback, gte, sql, Websites } from 'astro:db';
import type { APIRoute } from 'astro';

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
		const timeframe = searchParams.get('timeframe') || '30d'; // 7d, 30d, 90d, 1y

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

		// Calculate date range
		const now = new Date();
		let daysBack = 30;

		switch (timeframe) {
			case '7d':
				daysBack = 7;
				break;
			case '30d':
				daysBack = 30;
				break;
			case '90d':
				daysBack = 90;
				break;
			case '1y':
				daysBack = 365;
				break;
		}

		const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

		// Get basic feedback stats
		const feedbackStats = await db
			.select({
				total: sql`count(*)`,
				status: Feedback.status,
				type: Feedback.type,
			})
			.from(Feedback)
			.where(and(eq(Feedback.websiteId, websiteId), gte(Feedback.createdAt, startDate)))
			.groupBy(Feedback.status, Feedback.type);

		// Get feedback over time (daily counts)
		const feedbackOverTime = await db
			.select({
				date: sql`date(${Feedback.createdAt})`,
				count: sql`count(*)`,
			})
			.from(Feedback)
			.where(and(eq(Feedback.websiteId, websiteId), gte(Feedback.createdAt, startDate)))
			.groupBy(sql`date(${Feedback.createdAt})`)
			.orderBy(sql`date(${Feedback.createdAt})`);

		// Get top feedback by votes
		const topFeedback = await db
			.select({
				id: Feedback.id,
				title: Feedback.title,
				type: Feedback.type,
				upvotes: Feedback.upvotes,
				downvotes: Feedback.downvotes,
				createdAt: Feedback.createdAt,
			})
			.from(Feedback)
			.where(and(eq(Feedback.websiteId, websiteId), gte(Feedback.createdAt, startDate)))
			.orderBy(desc(Feedback.upvotes))
			.limit(10);

		// Get analytics events
		const eventStats = await db
			.select({
				eventType: AnalyticsEvents.eventType,
				count: sql`count(*)`,
			})
			.from(AnalyticsEvents)
			.where(
				and(eq(AnalyticsEvents.websiteId, websiteId), gte(AnalyticsEvents.createdAt, startDate))
			)
			.groupBy(AnalyticsEvents.eventType);

		// Aggregate stats by status and type
		const statusCounts: Record<string, number> = {};
		const typeCounts: Record<string, number> = {};
		let totalFeedback = 0;

		feedbackStats.forEach((stat) => {
			const count = Number(stat.total);
			totalFeedback += count;

			if (!statusCounts[stat.status]) {
				statusCounts[stat.status] = 0;
			}
			statusCounts[stat.status] += count;

			if (!typeCounts[stat.type]) {
				typeCounts[stat.type] = 0;
			}
			typeCounts[stat.type] += count;
		});

		return new Response(
			JSON.stringify({
				success: true,
				data: {
					timeframe,
					totalFeedback,
					statusBreakdown: statusCounts,
					typeBreakdown: typeCounts,
					feedbackOverTime: feedbackOverTime.map((item) => ({
						date: item.date,
						count: Number(item.count),
					})),
					topFeedback,
					events: eventStats.map((event) => ({
						type: event.eventType,
						count: Number(event.count),
					})),
				},
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	} catch (error) {
		console.error('Error fetching analytics:', error);
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

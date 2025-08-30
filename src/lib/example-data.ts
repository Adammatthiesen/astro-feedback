import type { FeedbackCategories, Websites } from 'astro:db';
import type { AstroGlobal } from 'astro';

export const sampleWebsite: typeof Websites.$inferSelect = {
	id: 1,
	name: 'My Sample Website',
	domain: 'example.com',
	apiKey: 'sample-api-key-123',
	description: 'A sample website for testing the feedback API',
	isActive: true,
	settings: {
		rateLimit: { maxSubmissions: 10, windowMinutes: 60 },
		allowedOrigins: ['https://example.com', 'http://localhost:4321'],
		moderationRequired: false,
		emailNotifications: true,
	},
	createdAt: new Date('2025-08-18T14:13:38.000Z'),
	updatedAt: new Date('2025-08-18T14:13:38.000Z'),
};

export const categories: (typeof FeedbackCategories.$inferSelect)[] = [
	{
		id: 1,
		websiteId: 1,
		name: 'Bug Report',
		slug: 'bug',
		description: 'Report bugs and technical issues',
		color: '#e74c3c',
		isActive: true,
		sortOrder: 1,
		createdAt: new Date('2025-08-18T14:13:38.000Z'),
	},
	{
		id: 2,
		websiteId: 1,
		name: 'Feature Request',
		slug: 'feature',
		description: 'Suggest new features or improvements',
		color: '#3498db',
		isActive: true,
		sortOrder: 2,
		createdAt: new Date('2025-08-18T14:13:38.000Z'),
	},
	{
		id: 3,
		websiteId: 1,
		name: 'General Feedback',
		slug: 'general',
		description: 'General comments and suggestions',
		color: '#95a5a6',
		isActive: true,
		sortOrder: 3,
		createdAt: new Date('2025-08-18T14:13:38.000Z'),
	},
];

export function buildSnippetSubmit(
	sampleWebsite: typeof Websites.$inferSelect,
	Astro: AstroGlobal
) {
	return `curl -X POST ${Astro.url.origin}/api/feedback \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${sampleWebsite.apiKey}" \\
  -d '${JSON.stringify({
		websiteId: `${sampleWebsite.id}`,
		type: 'bug',
		title: 'Login button not working',
		description: "The login button doesn't respond when clicked",
		email: 'user@example.com',
	})}'`;
}

export function buildSnippetGet(sampleWebsite: typeof Websites.$inferSelect, Astro: AstroGlobal) {
	return `curl "${Astro.url.origin}/api/feedback?websiteId=${sampleWebsite.id}&limit=10" \\
  -H "x-api-key: ${sampleWebsite.apiKey}"`;
}

export function buildSnippetVote(sampleWebsite: typeof Websites.$inferSelect, Astro: AstroGlobal) {
	return `curl -X POST ${Astro.url.origin}/api/feedback/1/vote \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${sampleWebsite.apiKey}" \\
  -d '{"voteType": "up"}'`;
}

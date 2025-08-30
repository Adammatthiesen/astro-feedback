import { AdminUsers, db, Feedback, FeedbackCategories, Websites } from 'astro:db';
import { generateApiKey, generateWebsiteID, hashPassword } from './src/lib/utils';

/**
 * Initial admin user credentials
 *
 * This should be changed for production!
 */
const INITIAL_ADMIN_USER = {
	email: 'admin@example.com',
	password: 'admin123',
	name: 'Admin User',
};

/**
 * Initial website configuration
 *
 * This should be customized for your application.
 */
const INITIAL_WEBSITE = {
	name: 'My Sample Website',
	domain: 'example.com',
	description: 'A sample website for testing the feedback API',
	settings: {
		rateLimit: {
			maxSubmissions: 10,
			windowMinutes: 60,
		},
		allowedOrigins: ['https://example.com', 'http://localhost:4321'],
		moderationRequired: false,
		emailNotifications: false, // Not yet implemented
	},
};

// + ---------------------------- +
// | DO NOT EDIT BEYOND THIS LINE |
// + ---------------------------- +

export default async function seed() {
	console.log('🌱 Seeding database...');

	// Create sample website
	const website = await db
		.insert(Websites)
		.values({
			...INITIAL_WEBSITE,
			id: generateWebsiteID(),
			apiKey: generateApiKey(),
			isActive: true,
		})
		.returning()
		.get();

	const websiteId = website.id;

	// Create sample categories
	const categories = await db
		.insert(FeedbackCategories)
		.values([
			{
				websiteId,
				name: 'Bug Report',
				slug: 'bug',
				description: 'Report bugs and technical issues',
				color: '#e74c3c',
				isActive: true,
				sortOrder: 1,
			},
			{
				websiteId,
				name: 'Feature Request',
				slug: 'feature',
				description: 'Suggest new features or improvements',
				color: '#3498db',
				isActive: true,
				sortOrder: 2,
			},
			{
				websiteId,
				name: 'General Feedback',
				slug: 'general',
				description: 'General comments and suggestions',
				color: '#95a5a6',
				isActive: true,
				sortOrder: 3,
			},
		])
		.returning();

	// Create admin users
	await db.insert(AdminUsers).values([
		{
			email: INITIAL_ADMIN_USER.email,
			password: await hashPassword(INITIAL_ADMIN_USER.password),
			name: INITIAL_ADMIN_USER.name,
			role: 'admin',
			isActive: true,
			createdAt: new Date(),
		},
	]);

	// Create sample feedback entries
	await db.insert(Feedback).values([
		{
			websiteId,
			categoryId: categories[2].id,
			type: 'other',
			status: 'new',
			priority: 'high',
			title: 'Hello World',
			description: 'Welcome to the feedback system! This is a sample feedback entry.',
			email: 'user1@example.com',
			name: 'John Doe',
			url: 'https://example.com/login',
			isPublic: true,
			upvotes: 5,
			downvotes: 0,
		},
	]);

	console.log('✅ Database seeded successfully!');
}

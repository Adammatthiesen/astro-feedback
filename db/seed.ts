import { AdminUsers, db, Feedback, FeedbackCategories, Websites } from 'astro:db';

export default async function seed() {
	console.log('🌱 Seeding database...');

	// Create sample website
	const website = await db
		.insert(Websites)
		.values({
			id: 1,
			name: 'My Sample Website',
			domain: 'example.com',
			apiKey: 'sample-api-key-123',
			description: 'A sample website for testing the feedback API',
			isActive: true,
			settings: {
				rateLimit: {
					maxSubmissions: 10,
					windowMinutes: 60,
				},
				allowedOrigins: ['https://example.com', 'http://localhost:4321'],
				moderationRequired: false,
				emailNotifications: true,
			},
		})
		.returning();

	const websiteId = website[0].id;

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
			email: 'admin@example.com',
			password: 'admin123', // In production: await bcrypt.hash('admin123', 10)
			name: 'Admin User',
			role: 'admin',
			isActive: true,
			createdAt: new Date(),
		},
		{
			email: 'moderator@example.com',
			password: 'mod123', // In production: await bcrypt.hash('mod123', 10)
			name: 'Moderator User',
			role: 'moderator',
			isActive: true,
			createdAt: new Date(),
		},
	]);

	// Create sample feedback entries
	await db.insert(Feedback).values([
		{
			websiteId,
			categoryId: categories[0].id,
			type: 'bug',
			status: 'new',
			priority: 'high',
			title: 'Login button not working on mobile',
			description:
				'When I try to click the login button on mobile devices, nothing happens. This issue occurs on both iOS and Android.',
			email: 'user1@example.com',
			name: 'John Doe',
			url: 'https://example.com/login',
			isPublic: true,
			upvotes: 5,
			downvotes: 0,
		},
		{
			websiteId,
			categoryId: categories[1].id,
			type: 'feature',
			status: 'in_review',
			priority: 'medium',
			title: 'Add dark mode support',
			description:
				'It would be great to have a dark mode option for better user experience during night time browsing.',
			email: 'user2@example.com',
			name: 'Jane Smith',
			url: 'https://example.com',
			isPublic: true,
			upvotes: 12,
			downvotes: 1,
		},
		{
			websiteId,
			categoryId: categories[2].id,
			type: 'compliment',
			status: 'closed',
			priority: 'low',
			title: 'Great website design!',
			description:
				'I love the new design of your website. It looks modern and is very easy to navigate.',
			email: 'user3@example.com',
			name: 'Mike Johnson',
			url: 'https://example.com/about',
			isPublic: true,
			upvotes: 8,
			downvotes: 0,
		},
	]);

	console.log('✅ Database seeded successfully!');
}

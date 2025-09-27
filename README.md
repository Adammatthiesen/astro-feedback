# Astro Feedback API

<img width="2329" height="1174" alt="image" src="https://github.com/user-attachments/assets/5ec51fc1-ba88-4bb2-9d6e-18b204b1cb8d" />

A comprehensive feedback management system built with Astro 5, TypeScript, and Astro DB. This project provides a complete solution for collecting, managing, and analyzing feedback from multiple websites through a RESTful API and an intuitive admin portal.

## 🚀 Features

### Core API Features
- **Multi-website Support**: Manage feedback for multiple websites from a single instance
- **RESTful API**: Complete CRUD operations for feedback management
- **Real-time Analytics**: Track feedback trends, user engagement, and website performance
- **Voting System**: Allow users to upvote/downvote feedback items
- **Comment System**: Enable discussions on feedback items
- **File Attachments**: Support for screenshots and document uploads
- **Rate Limiting**: Configurable rate limiting per website
- **API Key Authentication**: Secure access control for each website

### Admin Portal Features
- **Dashboard**: Overview of statistics, recent activity, and quick actions
- **User Management**: Create and manage admin users with role-based permissions
- **Website Management**: Register websites, manage API keys, and configure settings
- **Feedback Management**: View, filter, sort, and moderate all feedback
- **Analytics Dashboard**: Comprehensive insights with charts and metrics
- **Session-based Authentication**: Secure admin login system

### Database Schema
- **9 Comprehensive Tables**: Websites, Feedback, Categories, Comments, Attachments, Votes, Admin Users, Access Control, and Analytics
- **Robust Relationships**: Foreign key constraints and optimized indexes
- **Type Safety**: Full TypeScript integration with Astro DB

## 🛠️ Tech Stack

- **Framework**: [Astro 5.13.2](https://astro.build/) with SSR
- **Database**: [Astro DB](https://docs.astro.build/en/guides/astro-db/) (SQLite)
- **Runtime**: Node.js with standalone adapter
- **Language**: TypeScript
- **Styling**: Custom CSS (no framework dependencies)
- **Package Manager**: pnpm
- **Code Quality**: Biome for linting and formatting

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd feedback
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up the database**
   ```bash
   pnpm db:push
   ```

4. **Start the development server**
   ```bash
   pnpm dev
   ```

The application will be available at `http://localhost:4321`

## 🗄️ Database Schema

### Core Tables

#### Websites
Stores registered websites that can receive feedback
- `id`, `name`, `domain`, `apiKey`, `description`
- `isActive`, `settings` (JSON), `createdAt`, `updatedAt`

#### Feedback
Main feedback entries with comprehensive metadata
- `id`, `websiteId`, `categoryId`, `type`, `status`, `priority`
- `title`, `description`, `email`, `name`, `userAgent`, `url`
- `ipAddress`, `metadata` (JSON), `isPublic`, `upvotes`, `downvotes`
- `createdAt`, `updatedAt`

#### Admin Users
Admin users with role-based access control
- `id`, `email`, `password`, `name`, `role`, `isActive`
- `lastLogin`, `createdAt`

#### Analytics Events
Track various events for comprehensive analytics
- `id`, `websiteId`, `eventType`, `eventData` (JSON)
- `userAgent`, `ipAddress`, `createdAt`

*Plus 5 additional tables for categories, comments, attachments, votes, and access control*

## 🔌 API Endpoints

### Feedback API

#### Submit Feedback
```bash
POST /api/feedback
Content-Type: application/json
x-api-key: YOUR_API_KEY

{
  "websiteId": 1,
  "type": "bug",
  "title": "Login issue",
  "description": "Cannot login with email",
  "email": "user@example.com",
  "name": "John Doe"
}
```

#### Get Feedback
```bash
GET /api/feedback?websiteId=1&limit=10&status=new
x-api-key: YOUR_API_KEY
```

#### Vote on Feedback
```bash
POST /api/feedback/{id}/vote
Content-Type: application/json
x-api-key: YOUR_API_KEY

{
  "voteType": "up"
}
```

#### Add Comment
```bash
POST /api/feedback/{id}/comments
Content-Type: application/json
x-api-key: YOUR_API_KEY

{
  "content": "Thanks for the feedback!",
  "authorName": "Admin",
  "authorEmail": "admin@example.com"
}
```

### Query Parameters

- `status`: Filter by status (`new`, `in_review`, `in_progress`, `resolved`, `closed`, `spam`)
- `type`: Filter by type (`bug`, `feature`, `improvement`, `question`, `compliment`, `complaint`, `other`)
- `category`: Filter by category slug
- `limit`: Number of results (default: 10)
- `offset`: Pagination offset (default: 0)
- `sort`: Sort order (`newest`, `oldest`, `priority`, `upvotes`)
- `public`: Show only public feedback (`true`/`false`)

## 🔐 Admin Portal

### Access Routes

- **Login**: `/admin/login`
- **Dashboard**: `/admin` (redirects to main dashboard)
- **Websites**: `/admin/websites` - Manage registered websites
- **Users**: `/admin/users` - Manage admin users
- **Feedback**: `/admin/feedback` - View and moderate feedback
- **Analytics**: `/admin/analytics` - View comprehensive analytics

### Default Admin Credentials

The system creates a default admin user during database seeding:
- **Email**: `admin@example.com`
- **Password**: `admin123`

⚠️ **Important**: Change these credentials immediately in production!

### Admin Features

#### Dashboard
- Real-time statistics (total websites, feedback, users)
- Recent activity feed
- Quick action buttons
- Code generation tools for easy API integration

#### Website Management
- Register new websites
- Generate and manage API keys
- Configure rate limiting and security settings
- View website-specific analytics

#### User Management
- Create admin users with different roles (`admin`, `moderator`, `viewer`)
- Manage user permissions and access levels
- Track login activity

#### Feedback Management
- View all feedback with advanced filtering
- Change feedback status and priority
- Add internal comments and notes
- Bulk actions for moderation

#### Analytics Dashboard
- Feedback submission trends over time
- Popular feedback types and categories
- User engagement metrics
- Website performance comparisons

## 🚀 Deployment

### Build for Production

```bash
# Check and build
pnpm build

# Or build with remote database
pnpm build:remote
```

### Database Commands

```bash
# Push schema to local database
pnpm db:push

# Push schema to remote database
pnpm db:push:remote

# Verify database schema
pnpm db:verify

# Push initial production data to remote database
pnpm db:init-prod
```

You should setup your environments defaults using the `./build-prod.ts` file, this file will be used to create the initial database table data.

### Environment Configuration

The application uses Astro DB which can be configured for:
- **Local Development**: SQLite database
- **Production**: Astro DB Cloud or self-hosted solutions

## 🔧 Configuration

### Website Settings

Each website can be configured with:

```json
{
  "rateLimit": {
    "maxSubmissions": 10,
    "windowMinutes": 60
  },
  "allowedOrigins": ["https://example.com"],
  "moderationRequired": false,
  "emailNotifications": true
}
```

### API Key Management

- API keys are automatically generated for new websites
- Keys provide access to specific website data only
- Keys can be regenerated from the admin portal

## 📝 Development

### Project Structure

```
src/
├── layouts/
│   └── Layout.astro          # Base layout component
├── lib/
│   ├── feedback-client.ts    # API client utilities
│   ├── schemas.ts           # Zod validation schemas
│   └── utils.ts             # Helper functions
├── pages/
│   ├── index.astro          # Demo page with API examples
│   ├── admin/               # Admin portal pages
│   │   ├── index.astro      # Dashboard redirect
│   │   ├── login.astro      # Admin authentication
│   │   ├── logout.astro     # Session termination
│   │   ├── websites/        # Website management
│   │   ├── users/           # User management
│   │   ├── feedback/        # Feedback management
│   │   └── analytics/       # Analytics dashboard
│   └── api/                 # API endpoints
│       ├── feedback/        # Feedback CRUD operations
│       ├── categories/      # Category management
│       ├── websites/        # Website operations
│       └── analytics/       # Analytics data
db/
├── config.ts                # Database schema definition
└── seed.ts                  # Sample data seeding
```

### Code Quality

- **TypeScript**: Full type safety throughout the application
- **Biome**: Linting and formatting configured
- **Validation**: Zod schemas for runtime type checking
- **Error Handling**: Comprehensive error handling and logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run quality checks (`pnpm run build`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🗺️ Roadmap

### Planned Feature
- [ ] Email notification system
- [ ] Advanced reporting and exports
- [ ] API rate limiting dashboard
- [ ] Mobile-responsive admin interface improvements
- [ ] Theme customization system
- [ ] Webhook support for external integrations
- [ ] Automated spam detection
- [ ] Advanced user roles and permissions
- [ ] Multi-language support
- [ ] Convert into an integration?

---

Built with ❤️ using [Astro](https://astro.build/)

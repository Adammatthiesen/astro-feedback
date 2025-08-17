# Astro Feedback API

A comprehensive feedback management system built with Astro and `@astrojs/db`. This API allows you to collect, manage, and analyze feedback from multiple websites through a unified interface.

## Features

- 🚀 **Multi-website Support** - Manage feedback for multiple websites from a single API
- 🗃️ **Database-driven** - Built with Astro DB for reliable data storage
- 🔐 **API Key Authentication** - Secure access control per website
- 📊 **Analytics & Insights** - Track feedback trends and user engagement
- 🏷️ **Categorization** - Organize feedback with custom categories
- 👍 **Voting System** - Users can upvote/downvote feedback
- 💬 **Comments** - Internal and public commenting system
- 🔄 **Real-time Updates** - Live feedback submission and updates
- 📱 **Responsive Widget** - Ready-to-use feedback widget for easy integration

## Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd feedback

# Install dependencies
npm install

# Set up the database
npm run db:seed
```

### 2. Environment Setup

Create a `.env` file:

```env
# Admin access key (optional, for admin endpoints)
ADMIN_KEY=your-super-secret-admin-key
```

### 3. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:4321` to see the demo interface.

## API Endpoints

### Authentication

All API requests require an `x-api-key` header with a valid API key for the website.

```bash
curl -H "x-api-key: your-api-key" ...
```

### Feedback Management

#### Submit Feedback
```bash
POST /api/feedback
```

**Request Body:**
```json
{
  "websiteId": 1,
  "type": "bug",
  "title": "Login button not working",
  "description": "Detailed description of the issue",
  "email": "user@example.com",
  "name": "John Doe",
  "categoryId": 1,
  "url": "https://example.com/login",
  "metadata": {
    "browser": "Chrome",
    "version": "91.0"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "status": "new",
    "createdAt": "2023-12-01T10:00:00Z"
  }
}
```

#### Get Feedback List
```bash
GET /api/feedback?websiteId=1&limit=10&offset=0&status=new&type=bug&sort=newest
```

**Query Parameters:**
- `websiteId` (required): Website ID
- `status`: Filter by status (`new`, `in_review`, `in_progress`, `resolved`, `closed`, `spam`)
- `type`: Filter by type (`bug`, `feature`, `improvement`, `question`, `compliment`, `complaint`, `other`)
- `category`: Filter by category slug
- `limit`: Number of results (default: 10, max: 100)
- `offset`: Pagination offset (default: 0)
- `sort`: Sort order (`newest`, `oldest`, `priority`, `upvotes`)
- `public`: Only show public feedback (`true`/`false`)

#### Get Single Feedback
```bash
GET /api/feedback/{id}
```

#### Update Feedback
```bash
PATCH /api/feedback/{id}
```

**Request Body:**
```json
{
  "status": "resolved",
  "priority": "high",
  "isPublic": true
}
```

#### Delete Feedback
```bash
DELETE /api/feedback/{id}
```

### Voting

#### Vote on Feedback
```bash
POST /api/feedback/{id}/vote
```

**Request Body:**
```json
{
  "voteType": "up",
  "voterEmail": "voter@example.com"
}
```

#### Remove Vote
```bash
DELETE /api/feedback/{id}/vote
```

**Headers:**
```
x-voter-email: voter@example.com
```

### Comments

#### Add Comment
```bash
POST /api/feedback/{id}/comments
```

**Request Body:**
```json
{
  "content": "This is a helpful comment",
  "authorName": "Admin User",
  "authorEmail": "admin@example.com",
  "isInternal": false,
  "isFromAdmin": true
}
```

#### Get Comments
```bash
GET /api/feedback/{id}/comments?includeInternal=false
```

### Categories

#### Get Categories
```bash
GET /api/categories?websiteId=1
```

#### Create Category
```bash
POST /api/categories
```

**Request Body:**
```json
{
  "websiteId": 1,
  "name": "Bug Reports",
  "slug": "bugs",
  "description": "Report bugs and technical issues",
  "color": "#e74c3c",
  "sortOrder": 1
}
```

### Analytics

#### Get Analytics Data
```bash
GET /api/analytics?websiteId=1&timeframe=30d
```

**Query Parameters:**
- `websiteId` (required): Website ID
- `timeframe`: Time period (`7d`, `30d`, `90d`, `1y`)

### Website Management

#### Create Website
```bash
POST /api/websites
```

**Request Body:**
```json
{
  "name": "My Website",
  "domain": "example.com",
  "description": "Main company website",
  "settings": {
    "rateLimit": {
      "maxSubmissions": 10,
      "windowMinutes": 60
    },
    "allowedOrigins": ["https://example.com"],
    "moderationRequired": false,
    "emailNotifications": true
  }
}
```

#### Get Websites (Admin Only)
```bash
GET /api/websites
```

**Headers:**
```
x-admin-key: your-admin-key
```

## Client SDK

### Installation

Include the client SDK in your project:

```html
<script type="module" src="/src/lib/feedback-client.ts"></script>
```

### Basic Usage

```javascript
import { FeedbackClient } from './feedback-client.js';

const client = new FeedbackClient({
  baseUrl: 'https://your-feedback-api.com',
  apiKey: 'your-api-key',
  websiteId: 1
});

// Submit feedback
const result = await client.submitFeedback({
  type: 'bug',
  title: 'Button not working',
  description: 'The submit button is not responding',
  email: 'user@example.com'
});

// Get feedback
const feedback = await client.getFeedback({
  limit: 10,
  status: 'new'
});

// Vote on feedback
await client.vote(123, 'up', 'voter@example.com');
```

### Feedback Widget

Add a feedback widget to any website:

```html
<div id="feedback-widget"></div>

<script type="module">
  import { FeedbackWidget } from './feedback-client.js';
  
  new FeedbackWidget({
    baseUrl: 'https://your-feedback-api.com',
    apiKey: 'your-api-key',
    websiteId: 1,
    containerId: 'feedback-widget'
  });
</script>
```

## Database Schema

The system uses the following main tables:

- **Websites** - Registered websites with API keys
- **FeedbackCategories** - Custom categories for organizing feedback
- **Feedback** - Main feedback entries
- **FeedbackComments** - Comments and replies
- **FeedbackVotes** - User votes on feedback
- **FeedbackAttachments** - File attachments (screenshots, etc.)
- **AdminUsers** - Admin user accounts
- **WebsiteAdminAccess** - Admin access permissions
- **AnalyticsEvents** - Event tracking for analytics

## Configuration

### Rate Limiting

Configure per-website rate limiting:

```json
{
  "rateLimit": {
    "maxSubmissions": 10,
    "windowMinutes": 60
  }
}
```

### CORS Settings

Configure allowed origins:

```json
{
  "allowedOrigins": [
    "https://example.com",
    "https://www.example.com"
  ]
}
```

### Moderation

Enable automatic moderation:

```json
{
  "moderationRequired": true,
  "emailNotifications": true
}
```

## Deployment

### Environment Variables

```env
# Database configuration (automatically handled by Astro DB)
# Admin access
ADMIN_KEY=your-super-secret-admin-key

# Optional: Email service configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
```

### Build and Deploy

```bash
# Build for production
npm run build

# Deploy (example with Vercel)
npm run deploy
```

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": [
    {
      "field": "title",
      "message": "Title is required"
    }
  ]
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid API key)
- `403` - Forbidden (inactive website)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `429` - Rate Limited
- `500` - Internal Server Error

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions or issues:
1. Check the documentation
2. Search existing issues
3. Create a new issue with detailed information

---

Built with ❤️ using [Astro](https://astro.build) and [Astro DB](https://docs.astro.build/en/guides/astro-db/)

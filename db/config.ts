import { defineDb, defineTable, column, NOW } from 'astro:db';

// Websites table - Stores registered websites that can receive feedback
const Websites = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text(),
    domain: column.text({ unique: true }),
    apiKey: column.text({ unique: true }),
    description: column.text({ optional: true }),
    isActive: column.boolean({ default: true }),
    settings: column.json({ optional: true }), // JSON settings like rate limits, allowed origins
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
  indexes: [
    { on: ['domain'], unique: true },
    { on: ['apiKey'], unique: true },
    { on: ['isActive'] }
  ]
});

// Feedback Categories table - Different types of feedback (bug, feature, general, etc.)
const FeedbackCategories = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    websiteId: column.number({ references: () => Websites.columns.id }),
    name: column.text(),
    slug: column.text(),
    description: column.text({ optional: true }),
    color: column.text({ optional: true }), // Hex color for UI
    isActive: column.boolean({ default: true }),
    sortOrder: column.number({ default: 0 }),
    createdAt: column.date({ default: NOW }),
  },
  indexes: [
    { on: ['websiteId', 'slug'], unique: true },
    { on: ['websiteId', 'isActive'] },
    { on: ['websiteId', 'sortOrder'] }
  ]
});

// Feedback table - Main feedback entries
const Feedback = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    websiteId: column.number({ references: () => Websites.columns.id }),
    categoryId: column.number({ references: () => FeedbackCategories.columns.id, optional: true }),
    type: column.text({ enum: ['bug', 'feature', 'improvement', 'question', 'compliment', 'complaint', 'other'] }),
    status: column.text({ enum: ['new', 'in_review', 'in_progress', 'resolved', 'closed', 'spam'], default: 'new' }),
    priority: column.text({ enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' }),
    title: column.text(),
    description: column.text(),
    email: column.text({ optional: true }),
    name: column.text({ optional: true }),
    userAgent: column.text({ optional: true }),
    url: column.text({ optional: true }), // URL where feedback was submitted
    ipAddress: column.text({ optional: true }),
    metadata: column.json({ optional: true }), // Additional metadata (browser info, screen size, etc.)
    isPublic: column.boolean({ default: false }),
    upvotes: column.number({ default: 0 }),
    downvotes: column.number({ default: 0 }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
  indexes: [
    { on: ['websiteId', 'status'] },
    { on: ['websiteId', 'type'] },
    { on: ['websiteId', 'priority'] },
    { on: ['websiteId', 'createdAt'] },
    { on: ['categoryId'] },
    { on: ['email'] },
    { on: ['isPublic'] }
  ]
});

// Feedback Comments table - Comments/replies on feedback
const FeedbackComments = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    feedbackId: column.number({ references: () => Feedback.columns.id }),
    authorName: column.text({ optional: true }),
    authorEmail: column.text({ optional: true }),
    content: column.text(),
    isInternal: column.boolean({ default: false }), // Internal comments not visible to users
    isFromAdmin: column.boolean({ default: false }),
    createdAt: column.date({ default: NOW }),
  },
  indexes: [
    { on: ['feedbackId'] },
    { on: ['feedbackId', 'isInternal'] },
    { on: ['feedbackId', 'createdAt'] }
  ]
});

// Feedback Attachments table - File attachments (screenshots, etc.)
const FeedbackAttachments = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    feedbackId: column.number({ references: () => Feedback.columns.id }),
    filename: column.text(),
    originalName: column.text(),
    mimeType: column.text(),
    size: column.number(),
    url: column.text(), // Storage URL or path
    createdAt: column.date({ default: NOW }),
  },
  indexes: [
    { on: ['feedbackId'] }
  ]
});

// Feedback Votes table - Track user votes on feedback
const FeedbackVotes = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    feedbackId: column.number({ references: () => Feedback.columns.id }),
    voterEmail: column.text({ optional: true }),
    voterIp: column.text(),
    voteType: column.text({ enum: ['up', 'down'] }),
    createdAt: column.date({ default: NOW }),
  },
  indexes: [
    { on: ['feedbackId', 'voterIp'], unique: true },
    { on: ['feedbackId', 'voterEmail'], unique: true },
    { on: ['feedbackId'] }
  ]
});

// Admin Users table - Admin users who can manage feedback
const AdminUsers = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    email: column.text({ unique: true }),
    name: column.text(),
    role: column.text({ enum: ['admin', 'moderator', 'viewer'], default: 'viewer' }),
    isActive: column.boolean({ default: true }),
    lastLogin: column.date({ optional: true }),
    createdAt: column.date({ default: NOW }),
  },
  indexes: [
    { on: ['email'], unique: true },
    { on: ['role'] },
    { on: ['isActive'] }
  ]
});

// Website Admin Access table - Many-to-many relationship for admin access to websites
const WebsiteAdminAccess = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    websiteId: column.number({ references: () => Websites.columns.id }),
    adminUserId: column.number({ references: () => AdminUsers.columns.id }),
    permissions: column.json(), // Array of permissions like ['read', 'write', 'delete']
    createdAt: column.date({ default: NOW }),
  },
  indexes: [
    { on: ['websiteId', 'adminUserId'], unique: true },
    { on: ['websiteId'] },
    { on: ['adminUserId'] }
  ]
});

// Analytics Events table - Track various events for analytics
const AnalyticsEvents = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    websiteId: column.number({ references: () => Websites.columns.id }),
    eventType: column.text(), // 'feedback_submitted', 'feedback_viewed', 'vote_cast', etc.
    eventData: column.json({ optional: true }),
    userAgent: column.text({ optional: true }),
    ipAddress: column.text({ optional: true }),
    createdAt: column.date({ default: NOW }),
  },
  indexes: [
    { on: ['websiteId', 'eventType'] },
    { on: ['websiteId', 'createdAt'] },
    { on: ['eventType'] }
  ]
});

export default defineDb({
  tables: {
    Websites,
    FeedbackCategories,
    Feedback,
    FeedbackComments,
    FeedbackAttachments,
    FeedbackVotes,
    AdminUsers,
    WebsiteAdminAccess,
    AnalyticsEvents
  },
});

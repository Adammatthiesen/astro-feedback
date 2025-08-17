import { z } from 'astro/zod';

// Feedback submission schema
export const feedbackSubmissionSchema = z.object({
  websiteId: z.number().positive(),
  categoryId: z.number().positive().optional(),
  type: z.enum(['bug', 'feature', 'improvement', 'question', 'compliment', 'complaint', 'other']),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  metadata: z.record(z.any()).optional()
});

// Feedback update schema
export const feedbackUpdateSchema = z.object({
  status: z.enum(['new', 'in_review', 'in_progress', 'resolved', 'closed', 'spam']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  isPublic: z.boolean().optional()
});

// Comment schema
export const commentSchema = z.object({
  content: z.string().min(1).max(2000),
  authorName: z.string().min(1).max(100).optional(),
  authorEmail: z.string().email().optional(),
  isInternal: z.boolean().default(false),
  isFromAdmin: z.boolean().default(false)
});

// Vote schema
export const voteSchema = z.object({
  voteType: z.enum(['up', 'down']),
  voterEmail: z.string().email().optional()
});

// Website creation schema
export const websiteSchema = z.object({
  name: z.string().min(1).max(100),
  domain: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  settings: z.object({
    rateLimit: z.object({
      maxSubmissions: z.number().positive(),
      windowMinutes: z.number().positive()
    }).optional(),
    allowedOrigins: z.array(z.string().url()).optional(),
    moderationRequired: z.boolean().default(false),
    emailNotifications: z.boolean().default(true)
  }).optional()
});

// Category schema
export const categorySchema = z.object({
  websiteId: z.number().positive(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  sortOrder: z.number().default(0)
});

// Query parameter schemas
export const feedbackQuerySchema = z.object({
  status: z.enum(['new', 'in_review', 'in_progress', 'resolved', 'closed', 'spam']).optional(),
  type: z.enum(['bug', 'feature', 'improvement', 'question', 'compliment', 'complaint', 'other']).optional(),
  category: z.string().optional(),
  limit: z.string().transform(val => parseInt(val) || 10).pipe(z.number().min(1).max(100)),
  offset: z.string().transform(val => parseInt(val) || 0).pipe(z.number().min(0)),
  sort: z.enum(['newest', 'oldest', 'priority', 'upvotes']).default('newest'),
  public: z.string().transform(val => val === 'true').optional()
});

export type FeedbackSubmission = z.infer<typeof feedbackSubmissionSchema>;
export type FeedbackUpdate = z.infer<typeof feedbackUpdateSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type Vote = z.infer<typeof voteSchema>;
export type Website = z.infer<typeof websiteSchema>;
export type Category = z.infer<typeof categorySchema>;
export type FeedbackQuery = z.infer<typeof feedbackQuerySchema>;

// API Request Schemas
export const submitFeedbackSchema = z.object({
  websiteId: z.number(),
  categoryId: z.number().optional(),
  type: z.enum(['bug', 'feature', 'improvement', 'question', 'compliment', 'complaint', 'other']),
  title: z.string().min(1).max(255),
  description: z.string().min(1).max(5000),
  email: z.string().email().optional(),
  name: z.string().max(100).optional(),
  url: z.string().url().optional(),
  metadata: z.record(z.any()).optional()
});

export const updateFeedbackSchema = z.object({
  status: z.enum(['new', 'in_review', 'in_progress', 'resolved', 'closed', 'spam']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  isPublic: z.boolean().optional(),
  categoryId: z.number().optional()
});

export const addCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  authorName: z.string().max(100).optional(),
  authorEmail: z.string().email().optional(),
  isInternal: z.boolean().default(false),
  isFromAdmin: z.boolean().default(false)
});

export const createWebsiteSchema = z.object({
  name: z.string().min(1).max(255),
  domain: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  settings: z.object({
    rateLimit: z.object({
      maxSubmissions: z.number().min(1).max(1000),
      windowMinutes: z.number().min(1).max(1440)
    }).optional(),
    allowedOrigins: z.array(z.string().url()).optional(),
    moderationRequired: z.boolean().optional(),
    emailNotifications: z.boolean().optional()
  }).optional()
});

export const createCategorySchema = z.object({
  websiteId: z.number(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(255).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  sortOrder: z.number().min(0).optional()
});

// Response Types
export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type FeedbackItem = {
  id: number;
  websiteId: number;
  categoryId?: number;
  categoryName?: string;
  type: string;
  status: string;
  priority: string;
  title: string;
  description: string;
  email?: string;
  name?: string;
  url?: string;
  isPublic: boolean;
  upvotes: number;
  downvotes: number;
  createdAt: Date;
  updatedAt: Date;
};

import type { APIRoute } from 'astro';
import { db, Websites, Feedback, FeedbackComments } from 'astro:db';
import { eq, and, desc } from 'astro:db';
import { commentSchema } from '../../../../lib/schemas';

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

export const GET: APIRoute = async ({ params, request, url }) => {
  try {
    const feedbackId = parseInt(params.id as string);
    
    if (!feedbackId) {
      return new Response(JSON.stringify({ error: 'Invalid feedback ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get feedback to verify ownership
    const feedback = await db
      .select()
      .from(Feedback)
      .where(eq(Feedback.id, feedbackId))
      .get();

    if (!feedback) {
      return new Response(JSON.stringify({ error: 'Feedback not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify API key for this website
    const website = await verifyApiKey(feedback.websiteId, apiKey);
    if (!website) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if we should include internal comments
    const includeInternal = url.searchParams.get('includeInternal') === 'true';
    let conditions = [eq(FeedbackComments.feedbackId, feedbackId)];
    
    if (!includeInternal) {
      conditions.push(eq(FeedbackComments.isInternal, false));
    }

    // Get comments
    const comments = await db
      .select()
      .from(FeedbackComments)
      .where(and(...conditions))
      .orderBy(desc(FeedbackComments.createdAt));

    return new Response(JSON.stringify({
      success: true,
      data: comments
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching comments:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const feedbackId = parseInt(params.id as string);
    
    if (!feedbackId) {
      return new Response(JSON.stringify({ error: 'Invalid feedback ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    
    // Validate request body
    const validationResult = commentSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid request data',
        details: validationResult.error.errors
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const commentData = validationResult.data;

    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get feedback to verify ownership
    const feedback = await db
      .select()
      .from(Feedback)
      .where(eq(Feedback.id, feedbackId))
      .get();

    if (!feedback) {
      return new Response(JSON.stringify({ error: 'Feedback not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify API key for this website
    const website = await verifyApiKey(feedback.websiteId, apiKey);
    if (!website) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Insert comment
    const comment = await db.insert(FeedbackComments).values({
      feedbackId,
      authorName: commentData.authorName || null,
      authorEmail: commentData.authorEmail || null,
      content: commentData.content,
      isInternal: commentData.isInternal || false,
      isFromAdmin: commentData.isFromAdmin || false
    }).returning();

    return new Response(JSON.stringify({
      success: true,
      data: comment[0]
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error adding comment:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

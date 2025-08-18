import type { APIRoute } from 'astro';
import { db, Feedback, AdminUsers } from 'astro:db';
import { eq } from 'astro:db';
import { z } from 'astro/zod';

const updateStatusSchema = z.object({
  status: z.enum(['new', 'in_review', 'in_progress', 'resolved', 'closed', 'spam'])
});

export const PATCH: APIRoute = async ({ request, params, cookies }) => {
  try {
    // Check admin authentication
    const sessionCookie = cookies.get('admin-session');
    if (!sessionCookie) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let currentAdmin;
    try {
      const sessionData = JSON.parse(sessionCookie.value);
      currentAdmin = await db
        .select()
        .from(AdminUsers)
        .where(eq(AdminUsers.id, sessionData.adminId))
        .get();
      
      if (!currentAdmin || !currentAdmin.isActive) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get feedback ID from params
    const feedbackId = parseInt(params.id as string);
    if (isNaN(feedbackId)) {
      return new Response(JSON.stringify({ error: 'Invalid feedback ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse and validate request body
    const body = await request.json();
    const result = updateStatusSchema.safeParse(body);
    
    if (!result.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid input',
        details: result.error.errors
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { status } = result.data;

    // Check if feedback exists
    const existingFeedback = await db
      .select()
      .from(Feedback)
      .where(eq(Feedback.id, feedbackId))
      .get();

    if (!existingFeedback) {
      return new Response(JSON.stringify({ error: 'Feedback not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update feedback status
    await db
      .update(Feedback)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(Feedback.id, feedbackId));

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Status updated successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Status update error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

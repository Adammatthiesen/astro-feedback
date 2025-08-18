import type { APIRoute } from 'astro';
import { db, AdminUsers } from 'astro:db';
import { eq } from 'astro:db';
import { z } from 'astro/zod';

const updateStatusSchema = z.object({
  isActive: z.boolean()
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

    // Get user ID from params
    const userId = parseInt(params.id as string);
    if (isNaN(userId)) {
      return new Response(JSON.stringify({ error: 'Invalid user ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prevent self-deactivation
    if (userId === currentAdmin.id) {
      return new Response(JSON.stringify({ error: 'Cannot modify your own status' }), {
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

    const { isActive } = result.data;

    // Check if user exists
    const existingUser = await db
      .select()
      .from(AdminUsers)
      .where(eq(AdminUsers.id, userId))
      .get();

    if (!existingUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update user status
    await db
      .update(AdminUsers)
      .set({ 
        isActive
      })
      .where(eq(AdminUsers.id, userId));

    return new Response(JSON.stringify({ 
      success: true,
      message: 'User status updated successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('User status update error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
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

    // Get user ID from params
    const userId = parseInt(params.id as string);
    if (isNaN(userId)) {
      return new Response(JSON.stringify({ error: 'Invalid user ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prevent self-deletion
    if (userId === currentAdmin.id) {
      return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user exists
    const existingUser = await db
      .select()
      .from(AdminUsers)
      .where(eq(AdminUsers.id, userId))
      .get();

    if (!existingUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete user
    await db
      .delete(AdminUsers)
      .where(eq(AdminUsers.id, userId));

    return new Response(JSON.stringify({ 
      success: true,
      message: 'User deleted successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('User deletion error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

import type { APIRoute } from 'astro';
import { db, Websites, Feedback, FeedbackVotes } from 'astro:db';
import { eq, and } from 'astro:db';
import { voteSchema } from '../../../../lib/schemas';

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

function getClientInfo(request: Request) {
  const ipAddress = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  return { ipAddress, userAgent };
}

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
    const validationResult = voteSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid request data',
        details: validationResult.error.errors
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const voteData = validationResult.data;

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

    const { ipAddress, userAgent } = getClientInfo(request);

    // Check for existing vote from this IP/email
    let existingVoteConditions = [eq(FeedbackVotes.feedbackId, feedbackId)];
    
    if (voteData.voterEmail) {
      existingVoteConditions.push(eq(FeedbackVotes.voterEmail, voteData.voterEmail));
    } else {
      existingVoteConditions.push(eq(FeedbackVotes.voterIp, ipAddress));
    }

    const existingVote = await db
      .select()
      .from(FeedbackVotes)
      .where(and(...existingVoteConditions))
      .get();

    if (existingVote) {
      // Update existing vote if different
      if (existingVote.voteType !== voteData.voteType) {
        await db
          .update(FeedbackVotes)
          .set({
            voteType: voteData.voteType
          })
          .where(eq(FeedbackVotes.id, existingVote.id));

        // Update feedback vote counts
        const upvoteChange = voteData.voteType === 'up' ? 1 : -1;
        const downvoteChange = voteData.voteType === 'down' ? 1 : -1;

        await db
          .update(Feedback)
          .set({
            upvotes: feedback.upvotes + upvoteChange,
            downvotes: feedback.downvotes + downvoteChange,
            updatedAt: new Date()
          })
          .where(eq(Feedback.id, feedbackId));
      }
    } else {
      // Create new vote
      await db.insert(FeedbackVotes).values({
        feedbackId,
        voteType: voteData.voteType,
        voterEmail: voteData.voterEmail || null,
        voterIp: ipAddress
      });

      // Update feedback vote counts
      if (voteData.voteType === 'up') {
        await db
          .update(Feedback)
          .set({
            upvotes: feedback.upvotes + 1,
            updatedAt: new Date()
          })
          .where(eq(Feedback.id, feedbackId));
      } else {
        await db
          .update(Feedback)
          .set({
            downvotes: feedback.downvotes + 1,
            updatedAt: new Date()
          })
          .where(eq(Feedback.id, feedbackId));
      }
    }

    // Get updated feedback
    const updatedFeedback = await db
      .select({
        upvotes: Feedback.upvotes,
        downvotes: Feedback.downvotes
      })
      .from(Feedback)
      .where(eq(Feedback.id, feedbackId))
      .get();

    return new Response(JSON.stringify({
      success: true,
      data: {
        upvotes: updatedFeedback?.upvotes || 0,
        downvotes: updatedFeedback?.downvotes || 0
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error submitting vote:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ params, request }) => {
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

    const { ipAddress } = getClientInfo(request);
    const email = request.headers.get('x-voter-email');

    // Find and remove vote
    let voteConditions = [eq(FeedbackVotes.feedbackId, feedbackId)];
    
    if (email) {
      voteConditions.push(eq(FeedbackVotes.voterEmail, email));
    } else {
      voteConditions.push(eq(FeedbackVotes.voterIp, ipAddress));
    }

    const existingVote = await db
      .select()
      .from(FeedbackVotes)
      .where(and(...voteConditions))
      .get();

    if (!existingVote) {
      return new Response(JSON.stringify({ error: 'Vote not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete vote
    await db.delete(FeedbackVotes).where(eq(FeedbackVotes.id, existingVote.id));

    // Update feedback vote counts
    if (existingVote.voteType === 'up') {
      await db
        .update(Feedback)
        .set({
          upvotes: feedback.upvotes - 1,
          updatedAt: new Date()
        })
        .where(eq(Feedback.id, feedbackId));
    } else {
      await db
        .update(Feedback)
        .set({
          downvotes: feedback.downvotes - 1,
          updatedAt: new Date()
        })
        .where(eq(Feedback.id, feedbackId));
    }

    // Get updated feedback
    const updatedFeedback = await db
      .select({
        upvotes: Feedback.upvotes,
        downvotes: Feedback.downvotes
      })
      .from(Feedback)
      .where(eq(Feedback.id, feedbackId))
      .get();

    return new Response(JSON.stringify({
      success: true,
      data: {
        upvotes: updatedFeedback?.upvotes || 0,
        downvotes: updatedFeedback?.downvotes || 0
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error removing vote:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { saasClients } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// Generate a secure API key for HMAC authentication
function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the current client
    const existingClient = await db
      .select()
      .from(saasClients)
      .where(eq(saasClients.id, id))
      .limit(1);

    if (existingClient.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Client not found'
      }, { status: 404 });
    }

    const client = existingClient[0];

    // Generate new API key
    const newApiKey = generateApiKey();

    // Update the client with new API key
    await db
      .update(saasClients)
      .set({
        apiKey: newApiKey,
        apiStatus: 'active',
        updatedAt: new Date(),
      })
      .where(eq(saasClients.id, id));

    // Fetch the updated client
    const updatedClient = await db
      .select()
      .from(saasClients)
      .where(eq(saasClients.id, id))
      .limit(1);

    if (updatedClient.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update API key'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: updatedClient[0],
      message: 'API key regenerated successfully',
      setupInstructions: {
        apiKey: newApiKey,
        instructions: [
          "🔄 API KEY REGENERATED - Update your client project:",
          "",
          "1. Update your client's .env.local file:",
          `   ADMIN_API_SECRET=${newApiKey}`,
          "",
          "2. Restart your client application to load the new key",
          "",
          "3. The old API key is now invalid",
          "",
          "4. Test the connection from the SaaS Users page",
          "",
          "⚠️  IMPORTANT: Copy this key now - it won't be shown again!"
        ],
        apiBaseUrl: client.apiBaseUrl,
        authType: client.authType
      }
    });

  } catch (error) {
    console.error('Error regenerating API key:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to regenerate API key'
    }, { status: 500 });
  }
}
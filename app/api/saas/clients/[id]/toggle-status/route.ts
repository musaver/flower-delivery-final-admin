import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { saasClients } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// POST - Toggle client status (enable/disable website)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, reason } = body; // action: 'enable' | 'disable' | 'suspend'

    if (!action || !['enable', 'disable', 'suspend'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Must be "enable", "disable", or "suspend"'
      }, { status: 400 });
    }

    // Check if client exists
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

    // Determine new status based on action
    let newStatus: string;
    let newSubscriptionStatus = client.subscriptionStatus;

    switch (action) {
      case 'enable':
        newStatus = 'active';
        if (client.subscriptionStatus === 'cancelled') {
          newSubscriptionStatus = 'active';
        }
        break;
      case 'disable':
        newStatus = 'suspended';
        break;
      case 'suspend':
        newStatus = 'suspended';
        newSubscriptionStatus = 'suspended';
        break;
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }

    // Update client status
    await db
      .update(saasClients)
      .set({
        status: newStatus as any,
        subscriptionStatus: newSubscriptionStatus as any,
        notes: reason ? `${client.notes || ''}\n[${new Date().toISOString()}] ${action.toUpperCase()}: ${reason}`.trim() : client.notes,
        updatedAt: new Date()
      })
      .where(eq(saasClients.id, id));

    // Fetch updated client
    const updatedClient = await db
      .select()
      .from(saasClients)
      .where(eq(saasClients.id, id))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: updatedClient[0],
      message: `Client website ${action}d successfully`
    });

  } catch (error) {
    console.error('Error toggling client status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update client status'
    }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { saasClients } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// GET - Fetch single client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const client = await db
      .select()
      .from(saasClients)
      .where(eq(saasClients.id, id))
      .limit(1);

    if (client.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Client not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: client[0]
    });

  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch client'
    }, { status: 500 });
  }
}

// PUT - Update client
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      companyName,
      contactName,
      contactEmail,
      contactPhone,
      websiteUrl,
      websiteDomain,
      status,
      subscriptionType,
      subscriptionStatus,
      subscriptionEndDate,
      notes
    } = body;

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

    // Check if email is being changed and if new email already exists
    if (contactEmail && contactEmail !== existingClient[0].contactEmail) {
      const emailExists = await db
        .select()
        .from(saasClients)
        .where(eq(saasClients.contactEmail, contactEmail))
        .limit(1);

      if (emailExists.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'Client with this email already exists'
        }, { status: 409 });
      }
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (companyName !== undefined) updateData.companyName = companyName;
    if (contactName !== undefined) updateData.contactName = contactName;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    if (websiteUrl !== undefined) updateData.websiteUrl = websiteUrl;
    if (websiteDomain !== undefined) updateData.websiteDomain = websiteDomain;
    if (status !== undefined) updateData.status = status;
    if (subscriptionType !== undefined) updateData.subscriptionType = subscriptionType;
    if (subscriptionStatus !== undefined) updateData.subscriptionStatus = subscriptionStatus;
    if (subscriptionEndDate !== undefined) updateData.subscriptionEndDate = subscriptionEndDate ? new Date(subscriptionEndDate) : null;
    if (notes !== undefined) updateData.notes = notes;

    // Update client
    await db
      .update(saasClients)
      .set(updateData)
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
      message: 'Client updated successfully'
    });

  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update client'
    }, { status: 500 });
  }
}

// DELETE - Delete client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Delete client (Note: This will also delete related records due to foreign key constraints)
    await db
      .delete(saasClients)
      .where(eq(saasClients.id, id));

    return NextResponse.json({
      success: true,
      message: 'Client deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete client'
    }, { status: 500 });
  }
}
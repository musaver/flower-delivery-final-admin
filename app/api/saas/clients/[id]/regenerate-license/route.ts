import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { saasClients } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// Generate a secure license key
function generateLicenseKey(): string {
  const prefix = 'LIC';
  const randomPart = crypto.randomBytes(12).toString('hex').toUpperCase();
  // Format as LIC-XXXX-XXXX-XXXX-XXXX-XXXX
  const formatted = randomPart.match(/.{1,4}/g)?.join('-') || randomPart;
  return `${prefix}-${formatted}`;
}

// POST - Regenerate license key for client
 export async function POST(
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

    const client = existingClient[0];
    const oldLicenseKey = client.licenseKey;

    // Generate new unique license key
    let newLicenseKey: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      newLicenseKey = generateLicenseKey();
      
      const existingLicense = await db
        .select()
        .from(saasClients)
        .where(eq(saasClients.licenseKey, newLicenseKey))
        .limit(1);
      
      if (existingLicense.length === 0) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return NextResponse.json({
        success: false,
        error: 'Failed to generate unique license key'
      }, { status: 500 });
    }

    // Update client with new license key
    await db
      .update(saasClients)
      .set({
        licenseKey: newLicenseKey!,
        notes: `${client.notes || ''}\n[${new Date().toISOString()}] License key regenerated. Old key: ${oldLicenseKey}`.trim(),
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
      data: {
        ...updatedClient[0],
        oldLicenseKey
      },
      message: 'License key regenerated successfully'
    });

  } catch (error) {
    console.error('Error regenerating license key:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to regenerate license key'
    }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { saasClients } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Helper function to extract domain from URL
function extractDomain(url: string): string {
  try {
    const parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsedUrl.hostname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain } = body;

    console.log('Admin panel: Checking license by domain:', domain);

    if (!domain) {
      return NextResponse.json({
        valid: false,
        error: 'Domain is required'
      }, { status: 400, headers: corsHeaders });
    }

    const requestDomain = extractDomain(domain);

    // Find the client with this domain
    const client = await db
      .select({
        id: saasClients.id,
        licenseKey: saasClients.licenseKey,
        companyName: saasClients.companyName,
        status: saasClients.status,
        subscriptionStatus: saasClients.subscriptionStatus,
        subscriptionEndDate: saasClients.subscriptionEndDate,
        websiteDomain: saasClients.websiteDomain,
        licenseVerified: saasClients.licenseVerified,
      })
      .from(saasClients)
      .where(eq(saasClients.websiteDomain, requestDomain))
      .limit(1);

    if (client.length === 0) {
      return NextResponse.json({
        valid: false,
        error: 'No license found for this domain'
      }, { status: 404, headers: corsHeaders });
    }

    const clientData = client[0];

    // Check if client is suspended or cancelled
    if (clientData.status !== 'active') {
      return NextResponse.json({
        valid: false,
        error: `License is ${clientData.status}`
      }, { status: 403, headers: corsHeaders });
    }

    // Check subscription status and expiry
    if (clientData.subscriptionStatus !== 'active') {
      return NextResponse.json({
        valid: false,
        error: `Subscription is ${clientData.subscriptionStatus}`
      }, { status: 402, headers: corsHeaders });
    }

    // Check subscription expiry (skip check if lifetime subscription)
    if (clientData.subscriptionEndDate) {
      const now = new Date();
      const expiryDate = new Date(clientData.subscriptionEndDate);
      
      if (now > expiryDate) {
        return NextResponse.json({
          valid: false,
          error: 'Subscription has expired'
        }, { status: 402, headers: corsHeaders });
      }
    }

    // Check if license has been globally verified
    const isGloballyVerified = clientData.licenseVerified === 'yes';

    return NextResponse.json({
      valid: true,
      globallyVerified: isGloballyVerified,
      licenseKey: clientData.licenseKey, // Return the license key
      client: {
        id: clientData.id,
        companyName: clientData.companyName,
        subscriptionStatus: clientData.subscriptionStatus,
        subscriptionEndDate: clientData.subscriptionEndDate,
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Admin panel: Domain license check error:', error);
    
    return NextResponse.json({
      valid: false,
      error: 'Internal server error during license verification'
    }, { status: 500, headers: corsHeaders });
  }
}
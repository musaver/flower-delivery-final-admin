import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { saasClients } from '@/lib/schema';
import { eq, or, like } from 'drizzle-orm';

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

    if (!domain) {
      return NextResponse.json({
        exists: false,
        error: 'Domain is required'
      }, { status: 400, headers: corsHeaders });
    }

    const normalizedDomain = extractDomain(domain);
    console.log('Checking domain in database:', normalizedDomain);

    // Search for clients with this domain
    const clients = await db
      .select({
        id: saasClients.id,
        companyName: saasClients.companyName,
        contactEmail: saasClients.contactEmail,
        websiteDomain: saasClients.websiteDomain,
        websiteUrl: saasClients.websiteUrl,
        status: saasClients.status,
        subscriptionStatus: saasClients.subscriptionStatus,
        subscriptionType: saasClients.subscriptionType,
        subscriptionEndDate: saasClients.subscriptionEndDate,
        licenseKey: saasClients.licenseKey,
        createdAt: saasClients.createdAt,
        lastAccessDate: saasClients.lastAccessDate,
        lastVerificationDate: saasClients.lastVerificationDate
      })
      .from(saasClients)
      .where(
        or(
          eq(saasClients.websiteDomain, normalizedDomain),
          like(saasClients.websiteDomain, `%${normalizedDomain}%`),
          like(saasClients.websiteUrl, `%${normalizedDomain}%`)
        )
      );

    if (clients.length === 0) {
      return NextResponse.json({
        exists: false,
        domain: normalizedDomain,
        message: 'Domain not found in SAAS clients database'
      }, { headers: corsHeaders });
    }

    // Find exact match first, then partial matches
    const exactMatch = clients.find(client => 
      extractDomain(client.websiteDomain) === normalizedDomain
    );

    const primaryClient = exactMatch || clients[0];

    return NextResponse.json({
      exists: true,
      domain: normalizedDomain,
      client: {
        id: primaryClient.id,
        companyName: primaryClient.companyName,
        contactEmail: primaryClient.contactEmail,
        websiteDomain: primaryClient.websiteDomain,
        websiteUrl: primaryClient.websiteUrl,
        status: primaryClient.status,
        subscriptionStatus: primaryClient.subscriptionStatus,
        subscriptionType: primaryClient.subscriptionType,
        subscriptionEndDate: primaryClient.subscriptionEndDate,
        licenseKey: primaryClient.licenseKey ? `${primaryClient.licenseKey.substring(0, 10)}...` : null,
        createdAt: primaryClient.createdAt,
        lastAccessDate: primaryClient.lastAccessDate,
        lastVerificationDate: primaryClient.lastVerificationDate
      },
      allMatches: clients.length,
      exactMatch: !!exactMatch
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Domain check error:', error);
    
    return NextResponse.json({
      exists: false,
      error: 'Internal server error during domain check'
    }, { status: 500, headers: corsHeaders });
  }
}

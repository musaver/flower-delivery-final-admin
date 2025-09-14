import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { saasClients, licenseVerificationLogs } from '@/lib/schema';
import { eq, and, isNull, or, gte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

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

// Helper function to get client IP
function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] || 
         request.headers.get('x-real-ip') || 
         'unknown';
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { licenseKey, domain } = body;

    if (!licenseKey || !domain) {
      return NextResponse.json({
        valid: false,
        error: 'License key and domain are required'
      }, { status: 400, headers: corsHeaders });
    }

    const requestDomain = extractDomain(domain);
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Find the client with this license key
    const client = await db
      .select()
      .from(saasClients)
      .where(eq(saasClients.licenseKey, licenseKey))
      .limit(1);

    if (client.length === 0) {
      // Log failed verification
      await db.insert(licenseVerificationLogs).values({
        id: uuidv4(),
        clientId: 'unknown',
        licenseKey,
        requestDomain,
        requestIp: clientIP,
        userAgent,
        verificationStatus: 'invalid',
        errorMessage: 'License key not found',
        responseTime: Date.now() - startTime,
      });

      return NextResponse.json({
        valid: false,
        error: 'Invalid license key'
      }, { status: 401, headers: corsHeaders });
    }

    const clientData = client[0];

    // Check if client is suspended or cancelled
    if (clientData.status !== 'active') {
      await db.insert(licenseVerificationLogs).values({
        id: uuidv4(),
        clientId: clientData.id,
        licenseKey,
        requestDomain,
        requestIp: clientIP,
        userAgent,
        verificationStatus: 'suspended',
        errorMessage: `Client status: ${clientData.status}`,
        responseTime: Date.now() - startTime,
      });

      return NextResponse.json({
        valid: false,
        error: `License is ${clientData.status}`
      }, { status: 403, headers: corsHeaders });
    }

    // Check domain match (strict - no subdomains allowed)
    const clientDomain = extractDomain(clientData.websiteDomain);
    console.log('Domain validation:', { requestDomain, clientDomain, match: requestDomain === clientDomain });
    
    if (requestDomain !== clientDomain) {
      await db.insert(licenseVerificationLogs).values({
        id: uuidv4(),
        clientId: clientData.id,
        licenseKey,
        requestDomain,
        requestIp: clientIP,
        userAgent,
        verificationStatus: 'invalid',
        errorMessage: `Domain mismatch: ${requestDomain} not authorized for ${clientDomain}`,
        responseTime: Date.now() - startTime,
      });

      return NextResponse.json({
        valid: false,
        error: `Domain not authorized for this license. Expected: ${clientDomain}, Got: ${requestDomain}`
      }, { status: 403, headers: corsHeaders });
    }

    // Check subscription status and expiry
    if (clientData.subscriptionStatus !== 'active') {
      await db.insert(licenseVerificationLogs).values({
        id: uuidv4(),
        clientId: clientData.id,
        licenseKey,
        requestDomain,
        requestIp: clientIP,
        userAgent,
        verificationStatus: 'expired',
        errorMessage: `Subscription status: ${clientData.subscriptionStatus}`,
        responseTime: Date.now() - startTime,
      });

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
        // Update subscription status to expired
        await db
          .update(saasClients)
          .set({ 
            subscriptionStatus: 'expired',
            updatedAt: new Date()
          })
          .where(eq(saasClients.id, clientData.id));

        await db.insert(licenseVerificationLogs).values({
          id: uuidv4(),
          clientId: clientData.id,
          licenseKey,
          requestDomain,
          requestIp: clientIP,
          userAgent,
          verificationStatus: 'expired',
          errorMessage: 'Subscription expired',
          responseTime: Date.now() - startTime,
        });

        return NextResponse.json({
          valid: false,
          error: 'Subscription has expired'
        }, { status: 402, headers: corsHeaders });
      }
    }

    // License is valid - update last access and verification dates
    await db
      .update(saasClients)
      .set({ 
        lastAccessDate: new Date(),
        lastVerificationDate: new Date(),
        updatedAt: new Date()
      })
      .where(eq(saasClients.id, clientData.id));

    // Log successful verification
    await db.insert(licenseVerificationLogs).values({
      id: uuidv4(),
      clientId: clientData.id,
      licenseKey,
      requestDomain,
      requestIp: clientIP,
      userAgent,
      verificationStatus: 'valid',
      errorMessage: null,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json({
      valid: true,
      client: {
        id: clientData.id,
        companyName: clientData.companyName,
        subscriptionType: clientData.subscriptionType,
        subscriptionEndDate: clientData.subscriptionEndDate,
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('License verification error:', error);
    
    return NextResponse.json({
      valid: false,
      error: 'Internal server error during license verification'
    }, { status: 500, headers: corsHeaders });
  }
}

// GET endpoint for checking license status (lighter version)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const licenseKey = searchParams.get('license');
    const domain = searchParams.get('domain');

    if (!licenseKey || !domain) {
      return NextResponse.json({
        valid: false,
        error: 'License key and domain are required'
      }, { status: 400, headers: corsHeaders });
    }

    const requestDomain = extractDomain(domain);

    // Find the client with this license key
    const client = await db
      .select({
        id: saasClients.id,
        status: saasClients.status,
        subscriptionStatus: saasClients.subscriptionStatus,
        subscriptionEndDate: saasClients.subscriptionEndDate,
        websiteDomain: saasClients.websiteDomain,
      })
      .from(saasClients)
      .where(eq(saasClients.licenseKey, licenseKey))
      .limit(1);

    if (client.length === 0) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid license key'
      }, { status: 401, headers: corsHeaders });
    }

    const clientData = client[0];

    // Quick checks without logging
    if (clientData.status !== 'active') {
      return NextResponse.json({
        valid: false,
        error: `License is ${clientData.status}`
      }, { status: 403, headers: corsHeaders });
    }

    if (clientData.subscriptionStatus !== 'active') {
      return NextResponse.json({
        valid: false,
        error: `Subscription is ${clientData.subscriptionStatus}`
      }, { status: 402, headers: corsHeaders });
    }

    // Check domain match (strict - no subdomains allowed)
    const clientDomain = extractDomain(clientData.websiteDomain);
    console.log('GET Domain validation:', { requestDomain, clientDomain, match: requestDomain === clientDomain });
    
    if (requestDomain !== clientDomain) {
      return NextResponse.json({
        valid: false,
        error: `Domain not authorized. Expected: ${clientDomain}, Got: ${requestDomain}`
      }, { status: 403, headers: corsHeaders });
    }

    // Check subscription expiry
    if (clientData.subscriptionEndDate) {
      const now = new Date();
      const expiryDate = new Date(clientData.subscriptionEndDate);
      
      if (now > expiryDate) {
        return NextResponse.json({
          valid: false,
          error: 'Subscription expired'
        }, { status: 402, headers: corsHeaders });
      }
    }

    return NextResponse.json({
      valid: true,
      expiresAt: clientData.subscriptionEndDate
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('License check error:', error);
    
    return NextResponse.json({
      valid: false,
      error: 'Internal server error'
    }, { status: 500, headers: corsHeaders });
  }
}
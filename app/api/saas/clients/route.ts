import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { saasClients } from '@/lib/schema';
import { eq, and, desc, SQL } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Generate a secure license key
function generateLicenseKey(): string {
  const prefix = 'LIC';
  const randomPart = crypto.randomBytes(12).toString('hex').toUpperCase();
  // Format as LIC-XXXX-XXXX-XXXX-XXXX-XXXX
  const formatted = randomPart.match(/.{1,4}/g)?.join('-') || randomPart;
  return `${prefix}-${formatted}`;
}

// Generate a secure API key for HMAC authentication
function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

// GET - Fetch all clients
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const subscriptionStatus = searchParams.get('subscriptionStatus');

    // Build the query based on filters
    let clients;
    
    if (status && subscriptionStatus) {
      clients = await db
        .select()
        .from(saasClients)
        .where(and(
          eq(saasClients.status, status as any),
          eq(saasClients.subscriptionStatus, subscriptionStatus as any)
        ))
        .orderBy(desc(saasClients.createdAt));
    } else if (status) {
      clients = await db
        .select()
        .from(saasClients)
        .where(eq(saasClients.status, status as any))
        .orderBy(desc(saasClients.createdAt));
    } else if (subscriptionStatus) {
      clients = await db
        .select()
        .from(saasClients)
        .where(eq(saasClients.subscriptionStatus, subscriptionStatus as any))
        .orderBy(desc(saasClients.createdAt));
    } else {
      clients = await db
        .select()
        .from(saasClients)
        .orderBy(desc(saasClients.createdAt));
    }

    return NextResponse.json({
      success: true,
      data: clients,
      total: clients.length
    });

  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch clients'
    }, { status: 500 });
  }
}

// POST - Create new client
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      companyName,
      contactName,
      contactEmail,
      contactPhone,
      websiteUrl,
      websiteDomain,
      subscriptionType = 'monthly',
      subscriptionEndDate,
      notes
    } = body;

    // Validate required fields
    if (!companyName || !contactName || !contactEmail || !websiteUrl || !websiteDomain) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: companyName, contactName, contactEmail, websiteUrl, websiteDomain'
      }, { status: 400 });
    }

    // Check if email already exists
    const existingClient = await db
      .select()
      .from(saasClients)
      .where(eq(saasClients.contactEmail, contactEmail))
      .limit(1);

    if (existingClient.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Client with this email already exists'
      }, { status: 409 });
    }

    // Generate license key
    let licenseKey: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      licenseKey = generateLicenseKey();
      
      const existingLicense = await db
        .select()
        .from(saasClients)
        .where(eq(saasClients.licenseKey, licenseKey))
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

    // Calculate subscription end date if not provided
    let calculatedEndDate = subscriptionEndDate;
    if (!calculatedEndDate && subscriptionType !== 'lifetime') {
      const now = new Date();
      if (subscriptionType === 'monthly') {
        calculatedEndDate = new Date(now.setMonth(now.getMonth() + 1));
      } else if (subscriptionType === 'yearly') {
        calculatedEndDate = new Date(now.setFullYear(now.getFullYear() + 1));
      }
    }

    // Generate API key for federated user access
    const apiKey = generateApiKey();

    // Prepare API Base URL - ensure it's a valid URL format
    let apiBaseUrl = websiteUrl;
    if (!apiBaseUrl.startsWith('http://') && !apiBaseUrl.startsWith('https://')) {
      apiBaseUrl = `https://${apiBaseUrl}`;
    }
    // Remove trailing slash if present
    apiBaseUrl = apiBaseUrl.replace(/\/$/, '');

    // Create new client
    const newClient = {
      id: uuidv4(),
      companyName,
      contactName,
      contactEmail,
      contactPhone: contactPhone || null,
      websiteUrl,
      websiteDomain,
      licenseKey: licenseKey!,
      status: 'active' as const,
      subscriptionType,
      subscriptionStatus: 'active' as const,
      subscriptionStartDate: new Date(),
      subscriptionEndDate: calculatedEndDate || null,
      lastAccessDate: null,
      lastVerificationDate: null,
      licenseVerified: 'no' as const,
      notes: notes || null,
      
      // API federation fields - all properly initialized
      apiBaseUrl: apiBaseUrl, // Formatted website URL for API access
      authType: 'HMAC' as const, // Default authentication method
      apiKey: apiKey, // Generated secure API key
      publicKey: null, // Reserved for future JWT/OAuth support
      apiStatus: 'active' as const, // API is ready to use
      lastSeenAt: null, // Will be updated on first successful API call
      
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(saasClients).values(newClient);

    return NextResponse.json({
      success: true,
      data: newClient,
      message: 'Client created successfully - API federation configured automatically',
      setupInstructions: {
        licenseKey: licenseKey!,
        apiKey: apiKey,
        apiBaseUrl: apiBaseUrl,
        authType: 'HMAC',
        instructions: [
          "🎉 SaaS Client Created Successfully!",
          "",
          "📋 API Federation has been configured automatically:",
          `   ✅ License Key: ${licenseKey!}`,
          `   ✅ API Key: ${apiKey}`,
          `   ✅ API Base URL: ${apiBaseUrl}`,
          `   ✅ Auth Type: HMAC`,
          `   ✅ API Status: Active`,
          "",
          "🔧 CLIENT SETUP REQUIRED:",
          "",
          "1. Add this to your client's .env.local file:",
          `   ADMIN_API_SECRET=${apiKey}`,
          "",
          "2. Restart your client application to load the new environment variable",
          "",
          "3. The admin API endpoint is already implemented at:",
          "   📁 /api/admin/users/route.ts",
          "",
          "4. Verify your API Base URL is accessible:",
          `   🌐 ${apiBaseUrl}/api/admin/users`,
          "",
          "5. Test the connection:",
          "   👀 Go to SaaS Users → View Users",
          "",
          "⚠️  IMPORTANT: Save this API key securely - it's required for admin access to your user data!",
          "",
          "📚 Need help? Check the SAAS_API_FEDERATION_SETUP.md guide"
        ]
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create client'
    }, { status: 500 });
  }
}
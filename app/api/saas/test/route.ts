import { NextRequest, NextResponse } from 'next/server';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: 'SAAS Admin Panel is operational',
      timestamp: new Date().toISOString(),
      server: 'SAAS Admin Panel',
      version: '1.0.0',
      endpoints: {
        licenseVerification: '/api/saas/verify-license',
        clientManagement: '/api/saas/clients',
        ping: '/api/test/ping'
      }
    }, { headers: corsHeaders });
    
  } catch (error) {
    console.error('SAAS test endpoint error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500, headers: corsHeaders });
  }
}
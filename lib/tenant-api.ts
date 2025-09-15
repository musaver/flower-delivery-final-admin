import 'server-only';
import crypto from 'crypto';

export interface TenantApiResponse<T = any> {
  data: T[];
  nextCursor?: string | null | undefined;
  pagination?: {
    limit: number;
    hasMore: boolean;
  };
}

export interface TenantUser {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  city?: string;
  address?: string;
  state?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantClient {
  id: string;
  companyName: string;
  apiBaseUrl: string | null;
  authType: string;
  apiKey?: string | null;
  publicKey?: string | null;
  apiStatus: string | null;
}

export function createHmacSignature(
  secret: string,
  timestamp: string,
  path: string,
  search: string,
  body: string = ''
): string {
  const toSign = `${timestamp}:${path}:${search}:${body}`;
  return crypto.createHmac('sha256', secret).update(toSign).digest('hex');
}

export async function fetchTenantUsers(
  tenant: TenantClient,
  options: {
    limit?: number;
    cursor?: string;
    q?: string;
    updatedSince?: string;
  } = {}
): Promise<TenantApiResponse<TenantUser>> {
  if (tenant.apiStatus !== 'active') {
    throw new Error(`Tenant API is ${tenant.apiStatus || 'inactive'}`);
  }

  if (!tenant.apiBaseUrl) {
    throw new Error('Tenant API base URL is not configured');
  }

  if (tenant.authType !== 'HMAC' || !tenant.apiKey) {
    throw new Error('Only HMAC authentication is currently supported and API key is required');
  }

  try {
    const url = new URL('/api/admin/users', tenant.apiBaseUrl);
    
    // Add query parameters
    if (options.limit) url.searchParams.set('limit', String(options.limit));
    if (options.cursor) url.searchParams.set('cursor', options.cursor);
    if (options.q) url.searchParams.set('q', options.q);
    if (options.updatedSince) url.searchParams.set('updated_since', options.updatedSince);

    const timestamp = String(Date.now());
    const signature = createHmacSignature(
      tenant.apiKey,
      timestamp,
      url.pathname,
      url.search
    );

    console.log('Fetching from tenant API:', {
      url: url.toString(),
      tenantId: tenant.id,
      timestamp
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-timestamp': timestamp,
        'x-signature': signature,
        'User-Agent': 'Admin-Panel/1.0',
      },
      // Configure fetch options for server-to-server communication
      cache: 'no-store',
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Tenant API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: url.toString()
      });
      throw new Error(`Tenant API error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Tenant API response:', {
      tenantId: tenant.id,
      userCount: data.data?.length || 0,
      hasMore: data.pagination?.hasMore
    });

    return data;
  } catch (error) {
    console.error('Error fetching tenant users:', {
      tenantId: tenant.id,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function testTenantConnection(tenant: TenantClient): Promise<boolean> {
  try {
    await fetchTenantUsers(tenant, { limit: 1 });
    return true;
  } catch (error) {
    console.error('Tenant connection test failed:', {
      tenantId: tenant.id,
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
}
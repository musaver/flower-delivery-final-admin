import 'server-only';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { saasClients } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { fetchTenantUsers, type TenantUser, type TenantClient } from '@/lib/tenant-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Users, Mail, Phone, MapPin, Calendar } from 'lucide-react';

interface PageProps {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ 
    cursor?: string;
    limit?: string;
    q?: string;
  }>;
}

async function getTenantFromDB(tenantId: string): Promise<TenantClient | null> {
  try {
    const result = await db
      .select({
        id: saasClients.id,
        companyName: saasClients.companyName,
        apiBaseUrl: saasClients.apiBaseUrl,
        authType: saasClients.authType,
        apiKey: saasClients.apiKey,
        publicKey: saasClients.publicKey,
        apiStatus: saasClients.apiStatus,
      })
      .from(saasClients)
      .where(eq(saasClients.id, tenantId))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error('Error fetching tenant from database:', error);
    return null;
  }
}

export default async function TenantUsersPage({ params, searchParams }: PageProps) {
  const { tenantId } = await params;
  const { cursor, limit = '50', q } = await searchParams;

  const tenant = await getTenantFromDB(tenantId);
  
  if (!tenant) {
    notFound();
  }

  // Check if tenant is properly configured for API access
  if (!tenant || tenant.apiStatus !== 'active' || !tenant.apiBaseUrl || !tenant.apiKey) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/saas-users">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to SaaS Users
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{tenant.companyName} - Users</h1>
            <p className="text-muted-foreground mt-2">
              Tenant API not configured or inactive
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Users className="h-5 w-5" />
              API Configuration Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>This tenant's API is not properly configured for user access:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                {tenant.apiStatus !== 'active' && (
                  <li>API status is "{tenant.apiStatus || 'not set'}" (must be "active")</li>
                )}
                {!tenant.apiBaseUrl && (
                  <li>API Base URL is not configured</li>
                )}
                {!tenant.apiKey && (
                  <li>API authentication key is not set</li>
                )}
              </ul>
              <div className="mt-6">
                <Link href={`/saas-clients/${tenantId}/edit`}>
                  <Button>Configure API Settings</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  let users: TenantUser[] = [];
  let nextCursor: string | null | undefined = null;
  let error: string | null = null;

  try {
    const response = await fetchTenantUsers(tenant, {
      limit: parseInt(limit),
      cursor,
      q,
    });
    users = response.data;
    nextCursor = response.nextCursor;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to fetch users';
    console.error('Error fetching tenant users:', err);
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const buildSearchUrl = (newParams: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    
    // Keep existing parameters
    if (cursor && !newParams.cursor) params.set('cursor', cursor);
    if (limit && !newParams.limit) params.set('limit', limit);
    if (q && !newParams.q) params.set('q', q);
    
    // Add new parameters
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    
    return `?${params.toString()}`;
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/saas-users">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to SaaS Users
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{tenant.companyName} - Users</h1>
          <p className="text-muted-foreground mt-2">
            Managing users from {tenant.apiBaseUrl}
          </p>
        </div>
      </div>

      {/* Stats and Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            {nextCursor && (
              <p className="text-xs text-muted-foreground mt-1">
                More users available
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-green-100 text-green-800">Connected</Badge>
            <p className="text-xs text-muted-foreground mt-1">
              Auth: {tenant.authType}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Page</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cursor ? 'Page 2+' : 'Page 1'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Limit: {limit} users
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form method="GET" className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                name="q"
                placeholder="Search users by email..."
                defaultValue={q}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <input type="hidden" name="limit" value={limit} />
            <Button type="submit">Search</Button>
            {q && (
              <Link href={buildSearchUrl({ q: undefined })}>
                <Button variant="outline">Clear</Button>
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">API Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please check the tenant's API configuration and try again.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({users.length})</CardTitle>
          {q && (
            <p className="text-sm text-muted-foreground">
              Filtered by: "{q}"
            </p>
          )}
        </CardHeader>
        <CardContent>
          {users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A'}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ID: {user.id}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {user.phone && (
                          <div className="text-sm flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {user.phone}
                          </div>
                        )}
                        {!user.phone && (
                          <div className="text-sm text-muted-foreground">
                            No phone
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {user.city || user.state || user.country ? (
                          <div className="text-sm flex items-start gap-1">
                            <MapPin className="h-3 w-3 mt-0.5" />
                            <div>
                              {[user.city, user.state, user.country]
                                .filter(Boolean)
                                .join(', ')}
                              {user.address && (
                                <div className="text-xs text-muted-foreground">
                                  {user.address}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No location
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {formatDate(user.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {formatDateTime(user.updatedAt)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : !error ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No users found.</p>
              {q && (
                <p className="text-sm text-muted-foreground mt-2">
                  Try adjusting your search criteria.
                </p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Pagination */}
      {(users.length > 0 || cursor) && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Showing {users.length} users
                {cursor && ' (page 2+)'}
              </div>
              <div className="flex gap-2">
                {cursor && (
                  <Link href={buildSearchUrl({ cursor: undefined })}>
                    <Button variant="outline" size="sm">
                      First Page
                    </Button>
                  </Link>
                )}
                {nextCursor && (
                  <Link href={buildSearchUrl({ cursor: nextCursor })}>
                    <Button size="sm">
                      Load More Users
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
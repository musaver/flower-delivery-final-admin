'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Users, Eye, AlertCircle } from 'lucide-react';

interface SaasClient {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  websiteUrl: string;
  websiteDomain: string;
  licenseKey: string;
  status: 'active' | 'suspended' | 'cancelled';
  apiBaseUrl: string | null;
  authType: string | null;
  apiStatus: string | null;
  lastSeenAt: string | null;
  createdAt: string;
}

const statusColors = {
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  paused: 'bg-orange-100 text-orange-800',
};

export default function SaasUsersPage() {
  const [clients, setClients] = useState<SaasClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/saas/clients');
      const data = await response.json();
      
      if (data.success) {
        setClients(data.data);
      } else {
        console.error('Failed to fetch clients:', data.error);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.contactEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.websiteDomain.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || client.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getApiStatusBadge = (client: SaasClient) => {
    if (client.status !== 'active') {
      return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
    }
    
    if (client.apiStatus === 'paused') {
      return <Badge className="bg-orange-100 text-orange-800">API Paused</Badge>;
    }
    
    if (!client.apiBaseUrl || !client.apiStatus) {
      return <Badge className="bg-red-100 text-red-800">Not Configured</Badge>;
    }
    
    return <Badge className={statusColors.active}>API Ready</Badge>;
  };

  const canViewUsers = (client: SaasClient) => {
    return client.status === 'active' && 
           client.apiStatus === 'active' && 
           !!client.apiBaseUrl;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading clients...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">SaaS Users Management</h1>
          <p className="text-muted-foreground mt-2">
            View and manage users from your SaaS clients' databases
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Ready</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {clients.filter(c => canViewUsers(c)).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {clients.filter(c => c.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Issues</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {clients.filter(c => c.status === 'active' && (!c.apiBaseUrl || !c.apiStatus || c.apiStatus === 'paused')).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>SaaS Clients - User Management ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>API Endpoint</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>API Status</TableHead>
                <TableHead>Last API Check</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{client.companyName}</div>
                      <div className="text-sm text-muted-foreground">
                        {client.websiteDomain}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{client.contactName}</div>
                      <div className="text-sm text-muted-foreground">
                        {client.contactEmail}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-mono text-sm">
                        {client.apiBaseUrl || 'Not configured'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Auth: {client.authType || 'HMAC'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[client.status]}>
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getApiStatusBadge(client)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDateTime(client.lastSeenAt)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      {canViewUsers(client) ? (
                        <Link href={`/saas-users/${client.id}`}>
                          <Button size="sm" variant="outline">
                            <Eye className="mr-2 h-4 w-4" />
                            View Users
                          </Button>
                        </Link>
                      ) : (
                        <Button size="sm" variant="outline" disabled>
                          <AlertCircle className="mr-2 h-4 w-4" />
                          Configure API
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredClients.length === 0 && (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No clients found.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Help */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            API Configuration Help
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>To enable user viewing for a client:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Ensure the client status is "Active"</li>
              <li>Configure the API Base URL (e.g., https://client-domain.com)</li>
              <li>Set up HMAC authentication with a shared API key</li>
              <li>Ensure the API status is "Active" (not paused)</li>
              <li>The client must have implemented the /api/admin/users endpoint</li>
            </ol>
            <p className="mt-4 text-muted-foreground">
              Contact the client to ensure they have implemented the admin API endpoint with HMAC authentication.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Edit, 
  Power, 
  PowerOff, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Copy,
  ExternalLink,
  Calendar,
  Globe,
  Mail,
  Phone,
  Building
} from 'lucide-react';

interface SaasClient {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  websiteUrl: string;
  websiteDomain: string;
  licenseKey: string;
  status: 'active' | 'suspended' | 'cancelled';
  subscriptionStatus: 'active' | 'expired' | 'cancelled' | 'suspended';
  subscriptionType: string;
  subscriptionStartDate: string;
  subscriptionEndDate: string | null;
  lastAccessDate: string | null;
  lastVerificationDate: string | null;
  notes: string | null;
  
  // API federation fields
  apiBaseUrl: string;
  authType: 'HMAC' | 'OAUTH' | 'MTLS';
  apiKey?: string;
  publicKey?: string | null;
  apiStatus: 'active' | 'paused';
  lastSeenAt: string | null;
  
  createdAt: string;
  updatedAt: string;
}

const statusColors = {
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  expired: 'bg-red-100 text-red-800',
};

export default function ClientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<SaasClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLicenseKey, setShowLicenseKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [setupInstructions, setSetupInstructions] = useState<string[] | null>(null);

  useEffect(() => {
    fetchClient();
  }, [clientId]);

  const fetchClient = async () => {
    try {
      const response = await fetch(`/api/saas/clients/${clientId}`);
      const data = await response.json();
      
      if (data.success) {
        setClient(data.data);
      } else {
        console.error('Failed to fetch client:', data.error);
        router.push('/saas-clients');
      }
    } catch (error) {
      console.error('Error fetching client:', error);
      router.push('/saas-clients');
    } finally {
      setLoading(false);
    }
  };

  const toggleClientStatus = async (action: 'enable' | 'disable') => {
    if (!client) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/saas/clients/${clientId}/toggle-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action,
          reason: `${action === 'enable' ? 'Enabled' : 'Disabled'} from client details page`
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setClient(data.data);
      } else {
        alert('Failed to update client status: ' + data.error);
      }
    } catch (error) {
      console.error('Error toggling client status:', error);
      alert('Error updating client status');
    } finally {
      setActionLoading(false);
    }
  };

  const regenerateLicense = async () => {
    if (!client) return;
    
    if (!confirm('Are you sure you want to regenerate the license key? The old key will stop working immediately.')) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/saas/clients/${clientId}/regenerate-license`, {
        method: 'POST',
      });

      const data = await response.json();
      
      if (data.success) {
        setClient(data.data);
        alert(`License key regenerated successfully!\nOld key: ${data.data.oldLicenseKey}\nNew key: ${data.data.licenseKey}`);
      } else {
        alert('Failed to regenerate license: ' + data.error);
      }
    } catch (error) {
      console.error('Error regenerating license:', error);
      alert('Error regenerating license');
    } finally {
      setActionLoading(false);
    }
  };

  const regenerateApiKey = async () => {
    if (!client) return;
    
    if (!confirm('Are you sure you want to regenerate the API key? The client will need to update their environment variables immediately.')) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/saas/clients/${clientId}/regenerate-api-key`, {
        method: 'POST',
      });

      const data = await response.json();
      
      if (data.success) {
        setClient(data.data);
        setSetupInstructions(data.setupInstructions.instructions);
        setShowApiKey(true);
        alert('API key regenerated successfully! Check the setup instructions below.');
      } else {
        alert('Failed to regenerate API key: ' + data.error);
      }
    } catch (error) {
      console.error('Error regenerating API key:', error);
      alert('Error regenerating API key');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const formatDateOnly = (dateString: string | null) => {
    if (!dateString) return 'No expiry (Lifetime)';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading client details...</div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Client Not Found</h1>
          <Link href="/saas-clients">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Clients
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/saas-clients">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Clients
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{client.companyName}</h1>
              <p className="text-muted-foreground mt-1">
                Client ID: {client.id}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/saas-clients/${client.id}/edit`}>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Button
              onClick={() => toggleClientStatus(client.status === 'active' ? 'disable' : 'enable')}
              disabled={actionLoading}
              variant={client.status === 'active' ? 'destructive' : 'default'}
            >
              {client.status === 'active' ? (
                <>
                  <PowerOff className="mr-2 h-4 w-4" />
                  Disable
                </>
              ) : (
                <>
                  <Power className="mr-2 h-4 w-4" />
                  Enable
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Account Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={statusColors[client.status]}>
                {client.status}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-sm capitalize">{client.subscriptionType}</div>
                <Badge className={statusColors[client.subscriptionStatus as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
                  {client.subscriptionStatus}
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Access</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {formatDate(client.lastAccessDate)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Contact Person</div>
                  <div className="font-medium">{client.contactName}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Email</div>
                  <div className="font-medium">{client.contactEmail}</div>
                </div>
              </div>
              {client.contactPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Phone</div>
                    <div className="font-medium">{client.contactPhone}</div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Website</div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{client.websiteDomain}</span>
                    <a 
                      href={client.websiteUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* License Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                License Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">License Key</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowLicenseKey(!showLicenseKey)}
                  >
                    {showLicenseKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-gray-100 px-3 py-2 rounded text-sm font-mono flex-1">
                    {showLicenseKey ? client.licenseKey : client.licenseKey.substring(0, 8) + '*'.repeat(Math.max(0, client.licenseKey.length - 8))}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(client.licenseKey)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Last Verification</div>
                <div className="font-medium">{formatDate(client.lastVerificationDate)}</div>
              </div>

              <Button
                onClick={regenerateLicense}
                disabled={actionLoading}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate License Key
              </Button>
            </CardContent>
          </Card>

          {/* API Federation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                API Federation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">API Base URL</div>
                <div className="font-medium font-mono text-sm bg-gray-50 p-2 rounded">
                  {client.apiBaseUrl || 'Not configured'}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Auth Type</div>
                  <div className="font-medium">{client.authType}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">API Status</div>
                  <Badge className={client.apiStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                    {client.apiStatus}
                  </Badge>
                </div>
              </div>

              {client.apiKey && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">API Key</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="bg-gray-100 px-3 py-2 rounded text-sm font-mono flex-1">
                      {showApiKey ? client.apiKey : client.apiKey.substring(0, 8) + '*'.repeat(Math.max(0, client.apiKey.length - 8))}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(client.apiKey!)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <div className="text-sm text-muted-foreground">Last API Check</div>
                <div className="font-medium">{formatDate(client.lastSeenAt)}</div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={regenerateApiKey}
                  disabled={actionLoading}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate API Key
                </Button>
                <Link href={`/saas-users/${client.id}`}>
                  <Button 
                    variant="default" 
                    className="w-full"
                    disabled={!client.apiKey || client.apiStatus !== 'active'}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Users
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Subscription Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Type</div>
                  <div className="font-medium capitalize">{client.subscriptionType}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <Badge className={statusColors[client.subscriptionStatus as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
                    {client.subscriptionStatus}
                  </Badge>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Started</div>
                <div className="font-medium">{formatDateOnly(client.subscriptionStartDate)}</div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Expires</div>
                <div className="font-medium">{formatDateOnly(client.subscriptionEndDate)}</div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {client.notes ? (
                <div className="whitespace-pre-wrap text-sm">{client.notes}</div>
              ) : (
                <div className="text-muted-foreground text-sm">No notes available</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Setup Instructions */}
        {setupInstructions && (
          <Card className="mt-8 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <RefreshCw className="w-5 h-5" />
                Setup Instructions for Client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white p-4 rounded border">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {setupInstructions.join('\n')}
                </pre>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  onClick={() => copyToClipboard(setupInstructions.join('\n'))}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Instructions
                </Button>
                <Button
                  onClick={() => setSetupInstructions(null)}
                  variant="ghost"
                  size="sm"
                >
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timestamps */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Created:</span>
                <span className="ml-2 font-medium">{formatDate(client.createdAt)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="ml-2 font-medium">{formatDate(client.updatedAt)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
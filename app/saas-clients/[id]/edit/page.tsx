'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

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
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function EditClientPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<SaasClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    websiteUrl: '',
    websiteDomain: '',
    status: 'active',
    subscriptionType: 'monthly',
    subscriptionStatus: 'active',
    subscriptionEndDate: '',
    notes: ''
  });

  useEffect(() => {
    fetchClient();
  }, [clientId]);

  useEffect(() => {
    if (client) {
      setFormData({
        companyName: client.companyName,
        contactName: client.contactName,
        contactEmail: client.contactEmail,
        contactPhone: client.contactPhone || '',
        websiteUrl: client.websiteUrl,
        websiteDomain: client.websiteDomain,
        status: client.status,
        subscriptionType: client.subscriptionType,
        subscriptionStatus: client.subscriptionStatus,
        subscriptionEndDate: client.subscriptionEndDate ? 
          new Date(client.subscriptionEndDate).toISOString().slice(0, 16) : '',
        notes: client.notes || ''
      });
    }
  }, [client]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updateData = {
        ...formData,
        subscriptionEndDate: formData.subscriptionEndDate || null
      };

      const response = await fetch(`/api/saas/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/saas-clients/${clientId}`);
      } else {
        alert('Error updating client: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating client:', error);
      alert('Error updating client. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading client...</div>
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
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/saas-clients/${client.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Details
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Edit Client</h1>
            <p className="text-muted-foreground mt-2">
              Update {client.companyName} information
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Company Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    placeholder="Enter company name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name *</Label>
                  <Input
                    id="contactName"
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleInputChange}
                    placeholder="Enter contact person name"
                    required
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email *</Label>
                  <Input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    placeholder="Enter email address"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              {/* Website Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website URL *</Label>
                  <Input
                    id="websiteUrl"
                    name="websiteUrl"
                    value={formData.websiteUrl}
                    onChange={handleInputChange}
                    placeholder="https://example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="websiteDomain">Website Domain *</Label>
                  <Input
                    id="websiteDomain"
                    name="websiteDomain"
                    value={formData.websiteDomain}
                    onChange={handleInputChange}
                    placeholder="example.com"
                    required
                  />
                </div>
              </div>

              {/* Status Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Account Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => handleSelectChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subscriptionStatus">Subscription Status</Label>
                  <Select 
                    value={formData.subscriptionStatus} 
                    onValueChange={(value) => handleSelectChange('subscriptionStatus', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subscription status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Subscription Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subscriptionType">Subscription Type</Label>
                  <Select 
                    value={formData.subscriptionType} 
                    onValueChange={(value) => handleSelectChange('subscriptionType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subscription type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="lifetime">Lifetime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.subscriptionType !== 'lifetime' && (
                  <div className="space-y-2">
                    <Label htmlFor="subscriptionEndDate">Subscription End Date</Label>
                    <Input
                      id="subscriptionEndDate"
                      name="subscriptionEndDate"
                      type="datetime-local"
                      value={formData.subscriptionEndDate}
                      onChange={handleInputChange}
                    />
                  </div>
                )}
              </div>

              {/* License Key Display */}
              <div className="space-y-2">
                <Label>License Key</Label>
                <div className="bg-gray-50 p-3 rounded border">
                  <code className="text-sm font-mono">{client.licenseKey}</code>
                  <p className="text-xs text-muted-foreground mt-1">
                    License key cannot be edited directly. Use "Regenerate License Key" button in client details.
                  </p>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Add any additional notes about the client"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 mt-6">
            <Link href={`/saas-clients/${client.id}`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
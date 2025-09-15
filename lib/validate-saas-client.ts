// Validation utilities for SaaS client API federation setup

export interface SaasClientValidation {
  isValid: boolean;
  issues: string[];
  readyForAPI: boolean;
  setupInstructions: string[];
}

export interface SaasClientData {
  id: string;
  companyName: string;
  status: string;
  apiBaseUrl?: string;
  authType?: string;
  apiKey?: string;
  apiStatus?: string;
  lastSeenAt?: string | null;
}

export function validateSaasClient(client: SaasClientData): SaasClientValidation {
  const issues: string[] = [];
  const setupInstructions: string[] = [];

  // Check basic client status
  if (client.status !== 'active') {
    issues.push(`Client status is "${client.status}" (must be "active")`);
    setupInstructions.push(`• Enable client status in admin panel`);
  }

  // Check API Base URL
  if (!client.apiBaseUrl) {
    issues.push('API Base URL is not configured');
    setupInstructions.push('• Set API Base URL in client settings');
  } else {
    try {
      new URL(client.apiBaseUrl);
      if (!client.apiBaseUrl.startsWith('https://') && !client.apiBaseUrl.startsWith('http://')) {
        issues.push('API Base URL should include protocol (https:// or http://)');
        setupInstructions.push('• Update API Base URL to include https:// protocol');
      }
    } catch (error) {
      issues.push('API Base URL is not a valid URL format');
      setupInstructions.push('• Fix API Base URL format (e.g., https://client-domain.com)');
    }
  }

  // Check authentication configuration
  if (!client.authType) {
    issues.push('Authentication type is not set');
    setupInstructions.push('• Set authentication type (default: HMAC)');
  } else if (client.authType !== 'HMAC') {
    issues.push(`Authentication type "${client.authType}" is not yet supported`);
    setupInstructions.push('• Only HMAC authentication is currently supported');
  }

  // Check API key
  if (!client.apiKey) {
    issues.push('API key is not generated');
    setupInstructions.push('• Generate API key using "Regenerate API Key" button');
  } else if (client.apiKey.length < 32) {
    issues.push('API key appears to be too short (security concern)');
    setupInstructions.push('• Regenerate API key for better security');
  }

  // Check API status
  if (client.apiStatus !== 'active') {
    issues.push(`API status is "${client.apiStatus}" (must be "active")`);
    setupInstructions.push('• Enable API access in client settings');
  }

  // Determine if ready for API access
  const readyForAPI = client.status === 'active' && 
                     !!client.apiBaseUrl && 
                     client.authType === 'HMAC' && 
                     !!client.apiKey && 
                     client.apiStatus === 'active';

  // Add client-side setup instructions if API is configured
  if (readyForAPI) {
    setupInstructions.push('• Add ADMIN_API_SECRET to client .env.local file');
    setupInstructions.push('• Restart client application');
    setupInstructions.push('• Test connection from SaaS Users page');
  }

  return {
    isValid: issues.length === 0,
    issues,
    readyForAPI,
    setupInstructions
  };
}

export function generateClientSetupInstructions(client: SaasClientData): string[] {
  const instructions = [
    '🔧 CLIENT SETUP INSTRUCTIONS',
    '',
    '1. Add this environment variable to your .env.local file:',
    `   ADMIN_API_SECRET=${client.apiKey || 'YOUR_API_KEY_HERE'}`,
    '',
    '2. Restart your application to load the environment variable',
    '',
    '3. Verify the admin API endpoint exists:',
    `   📁 src/app/api/admin/users/route.ts`,
    '',
    '4. Test the API endpoint is accessible:',
    `   🌐 ${client.apiBaseUrl || 'YOUR_DOMAIN'}/api/admin/users`,
    '',
    '5. Check the connection from admin panel:',
    '   👀 Admin Panel → SaaS Users → View Users',
    '',
    '📋 API Configuration Summary:',
    `   • API Base URL: ${client.apiBaseUrl || 'Not configured'}`,
    `   • Auth Type: ${client.authType || 'HMAC'}`,
    `   • API Status: ${client.apiStatus || 'active'}`,
    `   • Last Check: ${client.lastSeenAt ? new Date(client.lastSeenAt).toLocaleString() : 'Never'}`,
  ];

  return instructions;
}

export function formatValidationReport(validation: SaasClientValidation): string {
  const lines = [];
  
  if (validation.isValid) {
    lines.push('✅ SaaS Client API Federation - All checks passed!');
  } else {
    lines.push('❌ SaaS Client API Federation - Issues found:');
    validation.issues.forEach(issue => lines.push(`   • ${issue}`));
  }
  
  if (validation.readyForAPI) {
    lines.push('', '🎉 Ready for API access!');
  } else {
    lines.push('', '⚠️  Not ready for API access');
  }
  
  if (validation.setupInstructions.length > 0) {
    lines.push('', '📋 Next steps:');
    validation.setupInstructions.forEach(instruction => lines.push(`   ${instruction}`));
  }
  
  return lines.join('\n');
}
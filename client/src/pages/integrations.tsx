import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Settings, 
  Link, 
  Instagram,
  Globe,
  Mail,
  MessageSquare,
  Phone,
  Webhook,
  Key,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Plus,
  Trash2,
  RefreshCw
} from "lucide-react";

interface Integration {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  lastSync?: string;
  status: 'connected' | 'disconnected' | 'error';
  description: string;
  icon: React.ReactNode;
  color: string;
}

export default function Integrations() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [configData, setConfigData] = useState<Record<string, string>>({});

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Mock integrations data (in real app, this would come from API)
  const integrations: Integration[] = [
    {
      id: "instagram",
      name: "Instagram Business",
      type: "social",
      isActive: true,
      lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      status: "connected",
      description: "Automatically capture leads from Instagram comments and DMs",
      icon: <Instagram className="w-6 h-6" />,
      color: "from-pink-500 to-rose-500"
    },
    {
      id: "website",
      name: "Website Forms",
      type: "web",
      isActive: true,
      lastSync: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      status: "connected",
      description: "Collect leads from contact forms and landing pages",
      icon: <Globe className="w-6 h-6" />,
      color: "bg-blue-500"
    },
    {
      id: "email",
      name: "Email Marketing",
      type: "email",
      isActive: false,
      status: "disconnected",
      description: "Sync with email marketing platforms for lead nurturing",
      icon: <Mail className="w-6 h-6" />,
      color: "bg-green-500"
    },
    {
      id: "whatsapp",
      name: "WhatsApp Business",
      type: "messaging",
      isActive: false,
      status: "disconnected",
      description: "Manage customer conversations through WhatsApp",
      icon: <MessageSquare className="w-6 h-6" />,
      color: "bg-emerald-500"
    },
    {
      id: "zapier",
      name: "Zapier",
      type: "automation",
      isActive: false,
      status: "disconnected",
      description: "Connect with 5000+ apps through Zapier automation",
      icon: <Webhook className="w-6 h-6" />,
      color: "bg-orange-500"
    },
    {
      id: "google",
      name: "Google My Business",
      type: "local",
      isActive: false,
      status: "disconnected",
      description: "Sync reviews and messages from Google My Business",
      icon: <Globe className="w-6 h-6" />,
      color: "bg-red-500"
    }
  ];

  // Toggle integration mutation
  const toggleIntegrationMutation = useMutation({
    mutationFn: async ({ integrationId, enabled }: { integrationId: string; enabled: boolean }) => {
      // In real app, this would call the API
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: (_, { integrationId, enabled }) => {
      toast({
        title: enabled ? "Integration activated" : "Integration deactivated",
        description: `${integrations.find(i => i.id === integrationId)?.name} has been ${enabled ? 'connected' : 'disconnected'}.`,
      });
      // In real app, invalidate queries
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update integration",
        variant: "destructive",
      });
    },
  });

  const handleToggleIntegration = (integrationId: string, enabled: boolean) => {
    toggleIntegrationMutation.mutate({ integrationId, enabled });
  };

  const handleConfigureIntegration = (integration: Integration) => {
    setSelectedIntegration(integration);
    setConfigData({});
    setIsConfigDialogOpen(true);
  };

  const handleSaveConfig = () => {
    toast({
      title: "Configuration saved",
      description: `${selectedIntegration?.name} has been configured successfully.`,
    });
    setIsConfigDialogOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-beauty-gray flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-r from-rose-gold to-deep-rose rounded-lg flex items-center justify-center mx-auto mb-4">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-charcoal" data-testid="text-integrations-title">Integrations</h2>
              <p className="text-sm text-gray-500">Connect your favorite tools and automate lead generation</p>
            </div>
            <Button 
              className="bg-gradient-to-r from-rose-gold to-deep-rose text-white hover:shadow-md transition-shadow"
              data-testid="button-add-integration"
            >
              <Plus className="w-4 h-4 mr-2" />
              Custom Integration
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Connected</p>
                    <p className="text-3xl font-bold text-charcoal mt-2" data-testid="text-connected-count">
                      {integrations.filter(i => i.status === 'connected').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Link className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Available</p>
                    <p className="text-3xl font-bold text-charcoal mt-2" data-testid="text-available-count">
                      {integrations.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Settings className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Last Sync</p>
                    <p className="text-lg font-bold text-charcoal mt-2" data-testid="text-last-sync">
                      2h ago
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Leads Today</p>
                    <p className="text-3xl font-bold text-charcoal mt-2" data-testid="text-leads-today">
                      12
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-rose-gold/20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-deep-rose" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Integrations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations.map((integration) => (
              <Card 
                key={integration.id} 
                className="hover:shadow-md transition-shadow" 
                data-testid={`card-integration-${integration.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white ${
                        integration.color.startsWith('bg-') ? integration.color : `bg-gradient-to-r ${integration.color}`
                      }`}>
                        {integration.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-charcoal" data-testid={`text-integration-name-${integration.id}`}>
                          {integration.name}
                        </h3>
                        <p className="text-sm text-gray-600 capitalize">{integration.type}</p>
                      </div>
                    </div>
                    
                    <Switch
                      checked={integration.isActive}
                      onCheckedChange={(checked) => handleToggleIntegration(integration.id, checked)}
                      disabled={toggleIntegrationMutation.isPending}
                      data-testid={`switch-integration-${integration.id}`}
                    />
                  </div>

                  <p className="text-sm text-gray-600 mb-4" data-testid={`text-integration-description-${integration.id}`}>
                    {integration.description}
                  </p>

                  <div className="flex items-center justify-between mb-4">
                    <Badge 
                      className={getStatusColor(integration.status)}
                      data-testid={`badge-integration-status-${integration.id}`}
                    >
                      {getStatusIcon(integration.status)}
                      <span className="ml-2 capitalize">{integration.status}</span>
                    </Badge>
                    
                    {integration.lastSync && (
                      <span className="text-xs text-gray-500" data-testid={`text-integration-sync-${integration.id}`}>
                        Synced {new Date(integration.lastSync).toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleConfigureIntegration(integration)}
                      data-testid={`button-configure-${integration.id}`}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Configure
                    </Button>
                    
                    {integration.isActive && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        data-testid={`button-test-${integration.id}`}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Test
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Setup Guide */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-charcoal">Quick Setup Guide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-charcoal">Popular Integrations</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 bg-soft-pink rounded-lg">
                      <Instagram className="w-5 h-5 text-pink-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Instagram Business Account</p>
                        <p className="text-xs text-gray-600">Connect to capture leads from posts and stories</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                      <Globe className="w-5 h-5 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Website Forms</p>
                        <p className="text-xs text-gray-600">Add tracking code to your website forms</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                      <MessageSquare className="w-5 h-5 text-green-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">WhatsApp Business</p>
                        <p className="text-xs text-gray-600">Manage customer conversations in one place</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium text-charcoal">Setup Tips</h4>
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <p>Start with Instagram Business for immediate lead capture</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <p>Add website tracking code to your contact forms</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <p>Test each integration after setup to ensure data flows correctly</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <p>Enable automatic lead assignment to team members</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Configuration Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Configure {selectedIntegration?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {selectedIntegration?.id === 'instagram' && (
              <>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="instagram-token" data-testid="label-instagram-token">Instagram Access Token</Label>
                    <Input
                      id="instagram-token"
                      type="password"
                      placeholder="Enter your Instagram Business API access token"
                      value={configData.token || ''}
                      onChange={(e) => setConfigData({...configData, token: e.target.value})}
                      data-testid="input-instagram-token"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Get your token from Facebook Developer Console
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="instagram-account" data-testid="label-instagram-account">Instagram Account ID</Label>
                    <Input
                      id="instagram-account"
                      placeholder="Enter your Instagram Business Account ID"
                      value={configData.accountId || ''}
                      onChange={(e) => setConfigData({...configData, accountId: e.target.value})}
                      data-testid="input-instagram-account"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="instagram-keywords" data-testid="label-instagram-keywords">Keywords to Track</Label>
                    <Textarea
                      id="instagram-keywords"
                      placeholder="beauty, skincare, makeup (comma separated)"
                      value={configData.keywords || ''}
                      onChange={(e) => setConfigData({...configData, keywords: e.target.value})}
                      data-testid="textarea-instagram-keywords"
                    />
                  </div>
                </div>
              </>
            )}

            {selectedIntegration?.id === 'website' && (
              <>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="website-url" data-testid="label-website-url">Website URL</Label>
                    <Input
                      id="website-url"
                      placeholder="https://yourwebsite.com"
                      value={configData.url || ''}
                      onChange={(e) => setConfigData({...configData, url: e.target.value})}
                      data-testid="input-website-url"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="webhook-url" data-testid="label-webhook-url">Webhook URL</Label>
                    <Input
                      id="webhook-url"
                      placeholder="https://api.beautycrm.com/webhook/leads"
                      value={configData.webhook || ''}
                      onChange={(e) => setConfigData({...configData, webhook: e.target.value})}
                      data-testid="input-webhook-url"
                      readOnly
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use this URL in your website forms
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="form-selectors" data-testid="label-form-selectors">Form Selectors</Label>
                    <Textarea
                      id="form-selectors"
                      placeholder="#contact-form, .lead-form, [data-form='contact']"
                      value={configData.selectors || ''}
                      onChange={(e) => setConfigData({...configData, selectors: e.target.value})}
                      data-testid="textarea-form-selectors"
                    />
                  </div>
                </div>
              </>
            )}

            <Separator />
            
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => setIsConfigDialogOpen(false)}
                data-testid="button-cancel-config"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveConfig}
                className="bg-gradient-to-r from-rose-gold to-deep-rose text-white"
                data-testid="button-save-config"
              >
                <Key className="w-4 h-4 mr-2" />
                Save Configuration
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

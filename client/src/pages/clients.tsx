import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import ClientForm from "@/components/client-form";
import StatusProgressionVisualizer from "@/components/StatusProgressionVisualizer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Users, 
  Plus, 
  Search, 
  Filter,
  MoreHorizontal,
  Mail,
  Phone,
  Building,
  Calendar,
  Edit,
  Trash2,
  MessageSquare,
  Crown,
  Star,
  Heart,
  AlertCircle,
  Clock,
  TrendingUp,
  Instagram,
  BarChart2
} from "lucide-react";

export default function Clients() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [instagramTimeFilter, setInstagramTimeFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [groupingView, setGroupingView] = useState("status"); // status, source, engagement, pipeline
  const [showPipelineView, setShowPipelineView] = useState(false);

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

  // Fetch clients
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Auto-open edit dialog from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    
    if (editId && clients.length > 0) {
      const clientToEdit = clients.find((c: any) => c.id === editId);
      if (clientToEdit) {
        setEditingClient(clientToEdit);
        setIsFormOpen(true);
        
        // Clear URL parameter after opening dialog
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('edit');
        window.history.replaceState(null, '', newUrl.toString());
      }
    }
  }, [clients]);

  // Fetch employees to get current user's employee record
  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
    retry: false,
    enabled: isAuthenticated,
  }) as { data: any[] };

  // Find current user's employee record
  const currentEmployee = (employees as any[]).find((emp: any) => emp.userId === user?.id);

  // РОЛЕВАЯ ПОЛИТИКА: Проверка прав пользователя
  const canManageClient = (client: any) => {
    if (!user) return false;
    const isAdminOrDirector = user.role === 'admin' || user.role === 'director';
    const isOwnClient = client.assignedTo === user.id;
    return isAdminOrDirector || isOwnClient;
  };

  const canViewAllClients = () => {
    return user?.role === 'admin' || user?.role === 'director';
  };

  // Delete client mutation
  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      await apiRequest("DELETE", `/api/clients/${clientId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Client deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
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
        description: "Failed to delete client",
        variant: "destructive",
      });
    },
  });

  // Update client status mutation
  const updateClientStatusMutation = useMutation({
    mutationFn: async ({ clientId, status }: { clientId: string; status: string }) => {
      await apiRequest("PATCH", `/api/clients/${clientId}`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Client status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
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
        description: "Failed to update client status",
        variant: "destructive",
      });
    },
  });

  const handleEditClient = (client: any) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };

  const handleDeleteClient = (clientId: string) => {
    if (confirm("Are you sure you want to delete this client?")) {
      deleteClientMutation.mutate(clientId);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingClient(null);
  };

  const handleStatusChange = (clientId: string, newStatus: string) => {
    updateClientStatusMutation.mutate({ clientId, status: newStatus });
  };

  // РОЛЕВАЯ ПОЛИТИКА: Фильтруем клиентов по правам доступа
  let accessibleClients = clients as any[];
  if (!canViewAllClients()) {
    accessibleClients = accessibleClients.filter((client: any) => client.assignedTo === user?.id);
  }

  // Filter clients
  const filteredClients = accessibleClients.filter((client: any) => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    const matchesSource = sourceFilter === "all" || client.source === sourceFilter;
    
    // Instagram time filtering
    let matchesInstagramTime = true;
    if (client.source === 'instagram' && instagramTimeFilter !== 'all') {
      const clientDate = client.createdAt ? new Date(client.createdAt) : new Date(client.lastContact || Date.now());
      const now = new Date();
      
      switch (instagramTimeFilter) {
        case 'today':
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          matchesInstagramTime = clientDate >= today;
          break;
        case '7days':
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          matchesInstagramTime = clientDate >= weekAgo;
          break;
        case '30days':
          const monthAgo = new Date();
          monthAgo.setDate(monthAgo.getDate() - 30);
          matchesInstagramTime = clientDate >= monthAgo;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesSource && matchesInstagramTime;
  });

  // Group clients by source for visualization
  const groupedClientsBySource = filteredClients.reduce((groups: any, client: any) => {
    const source = client.source || 'other';
    if (!groups[source]) {
      groups[source] = [];
    }
    groups[source].push(client);
    return groups;
  }, {});

  // Source configurations with icons and colors
  const sourceConfig = {
    instagram: {
      icon: '📸',
      label: 'Instagram',
      color: 'from-pink-500 to-purple-600',
      bgColor: 'bg-gradient-to-r from-pink-50 to-purple-50',
      borderColor: 'border-pink-200'
    },
    telegram: {
      icon: '📱',
      label: 'Telegram Bot',
      color: 'from-blue-500 to-cyan-600',
      bgColor: 'bg-gradient-to-r from-blue-50 to-cyan-50',
      borderColor: 'border-blue-200'
    },
    website: {
      icon: '🌐',
      label: 'Website',
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-gradient-to-r from-green-50 to-emerald-50',
      borderColor: 'border-green-200'
    },
    referral: {
      icon: '👥',
      label: 'Referral',
      color: 'from-orange-500 to-red-600',
      bgColor: 'bg-gradient-to-r from-orange-50 to-red-50',
      borderColor: 'border-orange-200'
    },
    other: {
      icon: '📋',
      label: 'Other Sources',
      color: 'from-gray-500 to-slate-600',
      bgColor: 'bg-gradient-to-r from-gray-50 to-slate-50',
      borderColor: 'border-gray-200'
    }
  };

  // Group clients by different business logic principles
  const clientGroups = {
    byStatus: {
      new: filteredClients.filter((c: any) => c.status === 'new' || !c.status),
      contacted: filteredClients.filter((c: any) => c.status === 'contacted'),
      qualified: filteredClients.filter((c: any) => c.status === 'qualified'),
      opportunity: filteredClients.filter((c: any) => c.status === 'opportunity'), 
      customer: filteredClients.filter((c: any) => c.status === 'customer'),
      inactive: filteredClients.filter((c: any) => c.status === 'inactive')
    },
    bySource: {
      instagram: filteredClients.filter((c: any) => c.source === 'instagram'),
      website: filteredClients.filter((c: any) => c.source === 'website'),
      email: filteredClients.filter((c: any) => c.source === 'email'),
      phone: filteredClients.filter((c: any) => c.source === 'phone'),
      referral: filteredClients.filter((c: any) => c.source === 'referral'),
      other: filteredClients.filter((c: any) => c.source === 'other' || !c.source)
    },
    byEngagement: {
      active: filteredClients.filter((c: any) => {
        if (!c.lastContactDate) return false;
        const lastContact = new Date(c.lastContactDate);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return lastContact > weekAgo;
      }),
      needFollowUp: filteredClients.filter((c: any) => {
        if (!c.lastContactDate) return true;
        const lastContact = new Date(c.lastContactDate);
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        return lastContact < twoWeeksAgo && c.status !== 'customer' && c.status !== 'inactive';
      }),
      vip: filteredClients.filter((c: any) => c.notes?.toLowerCase().includes('vip') || c.notes?.toLowerCase().includes('приоритет'))
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-amber-100 text-amber-800';
      case 'qualified': return 'bg-purple-100 text-purple-800';
      case 'opportunity': return 'bg-green-100 text-green-800';
      case 'customer': return 'bg-emerald-100 text-emerald-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'instagram': return '📷';
      case 'website': return '🌐';
      case 'referral': return '👥';
      case 'email': return '📧';
      case 'phone': return '📞';
      default: return '📝';
    }
  };

  // Client Card Component
  const ClientCard = ({ client, onEdit, onDelete, isVip = false, needsAttention = false }: any) => (
    <Card className={`hover:shadow-md transition-shadow ${isVip ? 'ring-2 ring-yellow-400' : ''} ${needsAttention ? 'ring-2 ring-orange-400' : ''}`} data-testid={`card-client-${client.id}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarFallback className="bg-gradient-to-r from-rose-gold to-deep-rose text-white">
                {client.name.split(' ').map((n: string) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-charcoal" data-testid={`text-client-name-${client.id}`}>
                  {client.name}
                </h3>
                {isVip && <Crown className="w-4 h-4 text-yellow-500" />}
                {needsAttention && <AlertCircle className="w-4 h-4 text-orange-500" />}
              </div>
              {client.company && (
                <p className="text-sm text-gray-600" data-testid={`text-client-company-${client.id}`}>
                  {client.company}
                </p>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" data-testid={`button-client-menu-${client.id}`}>
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(client)} data-testid={`button-edit-client-${client.id}`}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(client.id)}
                className="text-red-600"
                data-testid={`button-delete-client-${client.id}`}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge className={getStatusColor(client.status)} data-testid={`badge-client-status-${client.id}`}>
              {client.status}
            </Badge>
            <span className="text-sm text-gray-500" data-testid={`text-client-source-${client.id}`}>
              {getSourceIcon(client.source)} {client.source}
            </span>
          </div>

          {client.email && (
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="w-4 h-4 mr-2" />
              <span data-testid={`text-client-email-${client.id}`}>{client.email}</span>
            </div>
          )}

          {client.phone && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-2" />
                <span data-testid={`text-client-phone-${client.id}`}>{client.phone}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                  onClick={() => window.open(`tel:${client.phone}`, '_self')}
                  data-testid={`button-call-${client.id}`}
                >
                  <span className="text-sm">📞 Звонить</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                  onClick={() => window.open(`https://wa.me/${client.phone?.replace(/\D/g, '')}`, '_blank')}
                  data-testid={`button-whatsapp-${client.id}`}
                >
                  <span className="text-sm">📱 WhatsApp</span>
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="w-4 h-4 mr-2" />
            <span data-testid={`text-client-created-${client.id}`}>
              Added {new Date(client.createdAt).toLocaleDateString()}
            </span>
          </div>

          {client.lastContactDate && (
            <div className="flex items-center text-sm text-gray-500">
              <MessageSquare className="w-4 h-4 mr-2" />
              <span data-testid={`text-client-contact-${client.id}`}>
                Last contact: {new Date(client.lastContactDate).toLocaleDateString()}
              </span>
            </div>
          )}

          {client.notes && (
            <p className="text-sm text-gray-600 border-t pt-3" data-testid={`text-client-notes-${client.id}`}>
              {client.notes.length > 100 ? client.notes.substring(0, 100) + '...' : client.notes}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

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
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-charcoal" data-testid="text-clients-title">Clients</h2>
              <p className="text-sm text-gray-500">Manage your beauty industry clients</p>
            </div>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-gradient-to-r from-rose-gold to-deep-rose text-white hover:shadow-md transition-shadow"
                  data-testid="button-add-client"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Client
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
                  <DialogDescription>
                    {editingClient ? 'Update client information and contact details.' : 'Fill in the details to add a new client to your CRM.'}
                  </DialogDescription>
                </DialogHeader>
                <ClientForm 
                  client={editingClient} 
                  onSuccess={handleFormClose}
                  onCancel={handleFormClose}
                />
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-clients"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40" data-testid="select-status-filter">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="opportunity">Opportunity</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-40" data-testid="select-source-filter">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="telegram">Telegram</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>

                {sourceFilter === 'instagram' && (
                  <Select value={instagramTimeFilter} onValueChange={(value: any) => setInstagramTimeFilter(value)}>
                    <SelectTrigger className="w-36" data-testid="select-instagram-time-filter">
                      <SelectValue placeholder="Период" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все время</SelectItem>
                      <SelectItem value="today">Сегодня</SelectItem>
                      <SelectItem value="7days">7 дней</SelectItem>
                      <SelectItem value="30days">30 дней</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                <Select value={groupingView} onValueChange={setGroupingView}>
                  <SelectTrigger className="w-40" data-testid="select-grouping-view">
                    <SelectValue placeholder="Group by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status">By Status</SelectItem>
                    <SelectItem value="source">By Source</SelectItem>
                    <SelectItem value="engagement">By Engagement</SelectItem>
                    <SelectItem value="pipeline">Pipeline View</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Clients Grid */}
          {clientsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div>
                          <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-20"></div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredClients.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2" data-testid="text-no-clients">
                  {searchTerm || statusFilter !== "all" || sourceFilter !== "all" 
                    ? "No clients match your filters" 
                    : "No clients yet"
                  }
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || statusFilter !== "all" || sourceFilter !== "all"
                    ? "Try adjusting your search criteria"
                    : "Start building your client base by adding your first client"
                  }
                </p>
                {!searchTerm && statusFilter === "all" && sourceFilter === "all" && (
                  <Button 
                    onClick={() => setIsFormOpen(true)}
                    className="bg-gradient-to-r from-rose-gold to-deep-rose text-white"
                    data-testid="button-add-first-client"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Client
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {groupingView === "status" && (
                <div className="space-y-6" data-testid="clients-grouped-by-status">
                  {/* VIP Clients */}
                  {clientGroups.byEngagement.vip.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <Crown className="w-5 h-5 text-yellow-500" />
                        <h3 className="text-lg font-semibold text-charcoal">VIP Clients ({clientGroups.byEngagement.vip.length})</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {clientGroups.byEngagement.vip.map((client: any) => (
                          <ClientCard key={client.id} client={client} onEdit={handleEditClient} onDelete={handleDeleteClient} isVip={true} canManage={canManageClient(client)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New Leads */}
                  {clientGroups.byStatus.new.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <h3 className="text-lg font-semibold text-charcoal">New Leads ({clientGroups.byStatus.new.length})</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {clientGroups.byStatus.new.map((client: any) => (
                          <ClientCard key={client.id} client={client} onEdit={handleEditClient} onDelete={handleDeleteClient} canManage={canManageClient(client)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Active Pipeline */}
                  {(clientGroups.byStatus.contacted.length > 0 || clientGroups.byStatus.qualified.length > 0 || clientGroups.byStatus.opportunity.length > 0) && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <TrendingUp className="w-5 h-5 text-purple-500" />
                        <h3 className="text-lg font-semibold text-charcoal">Active Pipeline ({clientGroups.byStatus.contacted.length + clientGroups.byStatus.qualified.length + clientGroups.byStatus.opportunity.length})</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...clientGroups.byStatus.contacted, ...clientGroups.byStatus.qualified, ...clientGroups.byStatus.opportunity].map((client: any) => (
                          <ClientCard key={client.id} client={client} onEdit={handleEditClient} onDelete={handleDeleteClient} canManage={canManageClient(client)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customers */}
                  {clientGroups.byStatus.customer.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <Heart className="w-5 h-5 text-emerald-500" />
                        <h3 className="text-lg font-semibold text-charcoal">Customers ({clientGroups.byStatus.customer.length})</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {clientGroups.byStatus.customer.map((client: any) => (
                          <ClientCard key={client.id} client={client} onEdit={handleEditClient} onDelete={handleDeleteClient} canManage={canManageClient(client)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Need Follow-up */}
                  {clientGroups.byEngagement.needFollowUp.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="w-5 h-5 text-orange-500" />
                        <h3 className="text-lg font-semibold text-charcoal">Need Follow-up ({clientGroups.byEngagement.needFollowUp.length})</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {clientGroups.byEngagement.needFollowUp.map((client: any) => (
                          <ClientCard key={client.id} client={client} onEdit={handleEditClient} onDelete={handleDeleteClient} needsAttention={true} canManage={canManageClient(client)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inactive */}
                  {clientGroups.byStatus.inactive.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <Clock className="w-5 h-5 text-gray-500" />
                        <h3 className="text-lg font-semibold text-charcoal">Inactive ({clientGroups.byStatus.inactive.length})</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {clientGroups.byStatus.inactive.map((client: any) => (
                          <ClientCard key={client.id} client={client} onEdit={handleEditClient} onDelete={handleDeleteClient} canManage={canManageClient(client)} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {groupingView === "source" && (
                <div className="space-y-8" data-testid="clients-grouped-by-source">
                  {Object.entries(groupedClientsBySource).map(([source, clients]: [string, any[]]) => {
                    const config = sourceConfig[source as keyof typeof sourceConfig] || sourceConfig.other;
                    return clients.length > 0 ? (
                      <div key={source} className={`${config.bgColor} ${config.borderColor} border-2 rounded-2xl p-6 shadow-lg`}>
                        <div className="flex items-center gap-4 mb-6">
                          <div className={`w-12 h-12 bg-gradient-to-r ${config.color} rounded-xl flex items-center justify-center text-2xl shadow-lg`}>
                            {config.icon}
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-gray-800">
                              {config.label}
                            </h3>
                            <p className="text-gray-600 text-sm">
                              {clients.length} {clients.length === 1 ? 'клиент' : 'клиентов'}
                            </p>
                          </div>
                          {source === 'other' && (
                            <Badge className="ml-auto bg-blue-100 text-blue-800">
                              Telegram Боты
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {clients.map((client: any) => (
                            <div key={client.id} className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/40 hover:shadow-md transition-all">
                              <ClientCard client={client} onEdit={handleEditClient} onDelete={handleDeleteClient} canManage={canManageClient(client)} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              )}

              {groupingView === "engagement" && (
                <div className="space-y-6" data-testid="clients-grouped-by-engagement">
                  {/* VIP Clients */}
                  {clientGroups.byEngagement.vip.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <Crown className="w-5 h-5 text-yellow-500" />
                        <h3 className="text-lg font-semibold text-charcoal">VIP Clients ({clientGroups.byEngagement.vip.length})</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {clientGroups.byEngagement.vip.map((client: any) => (
                          <ClientCard key={client.id} client={client} onEdit={handleEditClient} onDelete={handleDeleteClient} isVip={true} canManage={canManageClient(client)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recently Active */}
                  {clientGroups.byEngagement.active.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <h3 className="text-lg font-semibold text-charcoal">Recently Active ({clientGroups.byEngagement.active.length})</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {clientGroups.byEngagement.active.map((client: any) => (
                          <ClientCard key={client.id} client={client} onEdit={handleEditClient} onDelete={handleDeleteClient} canManage={canManageClient(client)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Need Follow-up */}
                  {clientGroups.byEngagement.needFollowUp.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="w-5 h-5 text-orange-500" />
                        <h3 className="text-lg font-semibold text-charcoal">Need Follow-up ({clientGroups.byEngagement.needFollowUp.length})</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {clientGroups.byEngagement.needFollowUp.map((client: any) => (
                          <ClientCard key={client.id} client={client} onEdit={handleEditClient} onDelete={handleDeleteClient} needsAttention={true} canManage={canManageClient(client)} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {groupingView === "pipeline" && (
                <div data-testid="clients-pipeline-view">
                  <StatusProgressionVisualizer 
                    clients={filteredClients}
                    onStatusChange={handleStatusChange}
                  />
                </div>
              )}
            </div>
          )}
        </main>
      </div>
  );
}

// ClientCard component
interface ClientCardProps {
  client: any;
  onEdit: (client: any) => void;
  onDelete: (clientId: string) => void;
  isVip?: boolean;
  needsAttention?: boolean;
  canManage?: boolean; // РОЛЕВАЯ ПОЛИТИКА: Может ли пользователь управлять клиентом
}

function ClientCard({ client, onEdit, onDelete, isVip, needsAttention, canManage = true }: ClientCardProps) {
  const [showInstagramDialog, setShowInstagramDialog] = useState(false);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'qualified': return 'bg-purple-100 text-purple-800';
      case 'opportunity': return 'bg-orange-100 text-orange-800';
      case 'customer': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'instagram': return '📱';
      case 'website': return '🌐';
      case 'referral': return '👥';
      case 'email': return '📧';
      case 'phone': return '📞';
      default: return '📋';
    }
  };

  const handleInstagramClick = () => {
    if (client.instagramUsername) {
      setShowInstagramDialog(true);
    } else {
      // Open edit form to add Instagram username
      onEdit(client);
    }
  };

  return (
    <>
      <Card className={`hover:shadow-lg transition-shadow ${isVip ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50' : ''} ${needsAttention ? 'border-orange-300 bg-gradient-to-br from-orange-50 to-red-50' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="text-sm">
                  {client.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-semibold text-charcoal text-sm">
                  {client.name}
                  {isVip && <Crown className="inline-block w-4 h-4 ml-1 text-yellow-500" />}
                  {needsAttention && <AlertCircle className="inline-block w-4 h-4 ml-1 text-orange-500" />}
                </h4>
                {client.company && (
                  <p className="text-xs text-sage-green">{client.company}</p>
                )}
              </div>
            </div>
            
            {/* РОЛЕВАЯ ПОЛИТИКА: Показываем кнопки только тем кто может управлять клиентом */}
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(client)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  {client.instagramUsername && (
                    <DropdownMenuItem onClick={handleInstagramClick}>
                      <Instagram className="w-4 h-4 mr-2" />
                      Message on Instagram
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => onDelete(client.id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge className={`text-xs ${getStatusBadgeColor(client.status)}`}>
                {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
              </Badge>
              <div className="flex items-center gap-2">
                <span className="text-sm">{getSourceIcon(client.source)}</span>
                {client.instagramUsername && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleInstagramClick}
                    className="h-7 px-2 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600"
                    data-testid={`button-instagram-${client.id}`}
                  >
                    <Instagram className="w-3 h-3 mr-1" />
                    IG
                  </Button>
                )}
              </div>
            </div>
            
            <div className="space-y-1">
              {client.email && (
                <div className="flex items-center text-xs text-charcoal">
                  <Mail className="w-3 h-3 mr-2 text-sage-green" />
                  <span className="truncate">{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center text-xs text-charcoal">
                  <Phone className="w-3 h-3 mr-2 text-sage-green" />
                  <span>{client.phone}</span>
                </div>
              )}
              {client.instagramUsername && (
                <div className="flex items-center text-xs text-charcoal">
                  <Instagram className="w-3 h-3 mr-2 text-purple-500" />
                  <span>@{client.instagramUsername}</span>
                </div>
              )}
            </div>

            {client.lastContactDate && (
              <div className="flex items-center text-xs text-sage-green">
                <Calendar className="w-3 h-3 mr-2" />
                <span>Last contact: {new Date(client.lastContactDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instagram Dialog Placeholder */}
      <Dialog open={showInstagramDialog} onOpenChange={setShowInstagramDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>📱 Send Instagram Message</DialogTitle>
            <DialogDescription>
              Connect with your client through Instagram direct messaging.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="text-center mb-4">
              <Avatar className="w-16 h-16 mx-auto mb-3">
                <AvatarFallback className="text-lg">
                  {client.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h4 className="font-semibold">{client.name}</h4>
              <p className="text-sm text-gray-500">@{client.instagramUsername}</p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <Instagram className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <p className="text-sm text-blue-700 mb-3">
                Instagram messaging will be available when you provide a token with message permissions.
              </p>
              <Button 
                onClick={() => setShowInstagramDialog(false)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
              >
                Got it!
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

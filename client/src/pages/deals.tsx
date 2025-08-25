import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import DealForm from "@/components/deal-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  HandHeart, 
  Plus, 
  Search, 
  DollarSign,
  Calendar,
  User,
  MoreHorizontal,
  Edit,
  Trash2,
  TrendingUp,
  Clock
} from "lucide-react";

export default function Deals() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

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

  // Fetch deals
  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ["/api/deals"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Fetch clients for the form
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Fetch employees to get current user's name
  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Find current user's employee record
  const currentEmployee = employees.find(emp => emp.userId === user?.id);
  const currentEmployeeName = currentEmployee ? `${currentEmployee.firstName} ${currentEmployee.lastName}` : "";

  // РОЛЕВАЯ ПОЛИТИКА: Проверка прав пользователя
  const canManageDeal = (deal: any) => {
    if (!user) return false;
    const isAdminOrDirector = user.role === 'admin' || user.role === 'director';
    const isOwnDeal = deal.assignedTo === currentEmployee?.id;
    return isAdminOrDirector || isOwnDeal;
  };

  const canViewAllDeals = () => {
    return user?.role === 'admin' || user?.role === 'director';
  };

  // Delete deal mutation
  const deleteDealMutation = useMutation({
    mutationFn: async (dealId: string) => {
      await apiRequest("DELETE", `/api/deals/${dealId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Deal deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
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
        description: "Failed to delete deal",
        variant: "destructive",
      });
    },
  });

  // Update deal stage mutation
  const updateDealStageMutation = useMutation({
    mutationFn: async ({ dealId, stage }: { dealId: string; stage: string }) => {
      await apiRequest("PATCH", `/api/deals/${dealId}`, { stage });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
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
        description: "Failed to update deal",
        variant: "destructive",
      });
    },
  });

  const handleEditDeal = (deal: any) => {
    setEditingDeal(deal);
    setIsFormOpen(true);
  };

  const handleDeleteDeal = (dealId: string) => {
    if (confirm("Are you sure you want to delete this deal?")) {
      deleteDealMutation.mutate(dealId);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingDeal(null);
  };

  const handleStageChange = (dealId: string, newStage: string) => {
    updateDealStageMutation.mutate({ dealId, stage: newStage });
  };

  // РОЛЕВАЯ ПОЛИТИКА: Фильтруем сделки по правам доступа
  let accessibleDeals = deals as any[];
  if (!canViewAllDeals()) {
    accessibleDeals = accessibleDeals.filter((deal: any) => deal.assignedTo === currentEmployee?.id);
  }

  // Filter deals
  const filteredDeals = accessibleDeals.filter((deal: any) => {
    const matchesSearch = deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (deal.description && deal.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStage = stageFilter === "all" || deal.stage === stageFilter;
    const matchesPriority = priorityFilter === "all" || deal.priority === priorityFilter;
    
    return matchesSearch && matchesStage && matchesPriority;
  });

  // Group deals by different business logic principles
  const groupedDeals = {
    byStage: {
      new: filteredDeals.filter((deal: any) => deal.stage === 'new'),
      contacted: filteredDeals.filter((deal: any) => deal.stage === 'contacted'),
      qualified: filteredDeals.filter((deal: any) => deal.stage === 'qualified'),
      proposal: filteredDeals.filter((deal: any) => deal.stage === 'proposal'),
      negotiation: filteredDeals.filter((deal: any) => deal.stage === 'negotiation'),
      discovery: filteredDeals.filter((deal: any) => deal.stage === 'discovery'),
      won: filteredDeals.filter((deal: any) => deal.stage === 'won'),
      lost: filteredDeals.filter((deal: any) => deal.stage === 'lost'),
    },
    byValue: {
      highValue: filteredDeals.filter((deal: any) => Number(deal.value) >= 5000),
      mediumValue: filteredDeals.filter((deal: any) => Number(deal.value) >= 1000 && Number(deal.value) < 5000),
      lowValue: filteredDeals.filter((deal: any) => Number(deal.value) < 1000),
      noValue: filteredDeals.filter((deal: any) => !deal.value || Number(deal.value) === 0)
    },
    byProbability: {
      hot: filteredDeals.filter((deal: any) => Number(deal.probability) >= 80),
      warm: filteredDeals.filter((deal: any) => Number(deal.probability) >= 50 && Number(deal.probability) < 80),
      cold: filteredDeals.filter((deal: any) => Number(deal.probability) < 50),
      unscored: filteredDeals.filter((deal: any) => !deal.probability)
    },
    byActivity: {
      recentActivity: filteredDeals.filter((deal: any) => {
        if (!deal.updatedAt) return false;
        const updated = new Date(deal.updatedAt);
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        return updated > threeDaysAgo;
      }),
      stale: filteredDeals.filter((deal: any) => {
        if (!deal.updatedAt) return true;
        const updated = new Date(deal.updatedAt);
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        return updated < twoWeeksAgo && deal.stage !== 'won' && deal.stage !== 'lost';
      })
    }
  };

  // Legacy support for existing kanban view
  const dealsByStage = groupedDeals.byStage;

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'new': return 'bg-blue-100 text-blue-800 border-blue-500';
      case 'contacted': return 'bg-yellow-100 text-yellow-800 border-yellow-500';
      case 'qualified': return 'bg-purple-100 text-purple-800 border-purple-500';
      case 'proposal': return 'bg-indigo-100 text-indigo-800 border-indigo-500';
      case 'negotiation': return 'bg-orange-100 text-orange-800 border-orange-500';
      case 'won': return 'bg-green-100 text-green-800 border-green-500';
      case 'lost': return 'bg-red-100 text-red-800 border-red-500';
      default: return 'bg-gray-100 text-gray-800 border-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getClient = (clientId: string) => {
    return (clients as any[]).find((client: any) => client.id === clientId);
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
              <h2 className="text-2xl font-bold text-charcoal" data-testid="text-deals-title">Deals</h2>
              <p className="text-sm text-gray-500">Manage your sales pipeline</p>
            </div>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-gradient-to-r from-rose-gold to-deep-rose text-white hover:shadow-md transition-shadow"
                  data-testid="button-add-deal"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Deal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingDeal ? 'Edit Deal' : `Add Deal for ${currentEmployeeName}`}</DialogTitle>
                  <DialogDescription>
                    {editingDeal ? 'Update deal information and track sales progress.' : 'Create a new sales opportunity and assign it to team members.'}
                  </DialogDescription>
                </DialogHeader>
                <DealForm 
                  deal={editingDeal} 
                  clients={clients as any[]}
                  onSuccess={handleFormClose}
                  onCancel={handleFormClose}
                />
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          
          {/* Sales Analytics Dashboard */}
          <div className="space-y-6 mb-8">
            
            {/* Pipeline Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {Object.entries(groupedDeals.byStage).map(([stage, stageDeals]) => {
                const stageColors = {
                  new: 'bg-blue-100 border-blue-300 text-blue-800',
                  contacted: 'bg-yellow-100 border-yellow-300 text-yellow-800',
                  qualified: 'bg-purple-100 border-purple-300 text-purple-800',
                  proposal: 'bg-indigo-100 border-indigo-300 text-indigo-800',
                  negotiation: 'bg-orange-100 border-orange-300 text-orange-800',
                  discovery: 'bg-teal-100 border-teal-300 text-teal-800',
                  won: 'bg-green-100 border-green-300 text-green-800',
                  lost: 'bg-red-100 border-red-300 text-red-800'
                };
                const stageNames = {
                  new: 'New',
                  contacted: 'Contact',
                  qualified: 'Qualified',
                  proposal: 'Proposal',
                  negotiation: 'Negotiation',
                  discovery: 'Discovery',
                  won: 'Won',
                  lost: 'Lost'
                };
                const value = (stageDeals as any[]).reduce((sum, deal) => sum + (Number(deal.value) || 0), 0);
                
                return (
                  <div key={stage} className={`p-3 rounded-lg border-2 ${stageColors[stage as keyof typeof stageColors]}`}>
                    <div className="text-xs font-semibold uppercase">{stageNames[stage as keyof typeof stageNames]}</div>
                    <div className="text-lg font-bold">{(stageDeals as any[]).length}</div>
                    <div className="text-xs opacity-80">${value.toLocaleString()}</div>
                  </div>
                );
              })}
            </div>

            {/* Value & Probability Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Value Groups */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                    Value Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(groupedDeals.byValue).map(([category, deals]) => {
                      const categoryNames = {
                        highValue: 'High Value Deals (≥$5,000)',
                        mediumValue: 'Medium Value Deals ($1,000-$5,000)',
                        lowValue: 'Low Value Deals (<$1,000)',
                        noValue: 'No Value Specified'
                      };
                      const categoryColors = {
                        highValue: 'bg-emerald-100 text-emerald-800',
                        mediumValue: 'bg-blue-100 text-blue-800', 
                        lowValue: 'bg-amber-100 text-amber-800',
                        noValue: 'bg-gray-100 text-gray-800'
                      };
                      const totalValue = (deals as any[]).reduce((sum, deal) => sum + (Number(deal.value) || 0), 0);
                      
                      return (
                        <div key={category} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                          <div>
                            <div className="text-sm font-medium">{categoryNames[category as keyof typeof categoryNames]}</div>
                            <div className="text-xs text-gray-600">${totalValue.toLocaleString()} total value</div>
                          </div>
                          <Badge className={`${categoryColors[category as keyof typeof categoryColors]}`}>
                            {(deals as any[]).length}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Probability Groups */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-orange-600" />
                    Probability Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(groupedDeals.byProbability).map(([category, deals]) => {
                      const categoryNames = {
                        hot: 'Hot Leads (≥80%)',
                        warm: 'Warm Leads (50-79%)',
                        cold: 'Cold Leads (<50%)',
                        unscored: 'No Probability Score'
                      };
                      const categoryColors = {
                        hot: 'bg-red-100 text-red-800',
                        warm: 'bg-orange-100 text-orange-800',
                        cold: 'bg-blue-100 text-blue-800',
                        unscored: 'bg-gray-100 text-gray-800'
                      };
                      
                      return (
                        <div key={category} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                          <div className="text-sm font-medium">{categoryNames[category as keyof typeof categoryNames]}</div>
                          <Badge className={`${categoryColors[category as keyof typeof categoryColors]}`}>
                            {(deals as any[]).length}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Activity Status */}
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-orange-800 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Require Attention - Stale Deals ({groupedDeals.byActivity.stale.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto">
                  {groupedDeals.byActivity.stale.slice(0, 6).map((deal: any) => (
                    <div key={deal.id} className="p-3 bg-white rounded border border-orange-200">
                      <div className="font-medium text-sm">{deal.title}</div>
                      <div className="text-xs text-orange-600">
                        Stage: {deal.stage} | ${Number(deal.value).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {deal.updatedAt ? `Updated: ${new Date(deal.updatedAt).toLocaleDateString()}` : 'Not updated recently'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search deals..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-deals"
                  />
                </div>
                
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="w-40" data-testid="select-stage-filter">
                    <SelectValue placeholder="Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="negotiation">Negotiation</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-40" data-testid="select-priority-filter">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Kanban Pipeline */}
          {dealsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6">
              {[...Array(7)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[...Array(3)].map((_, j) => (
                        <div key={j} className="h-20 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6">
              {Object.entries(dealsByStage).map(([stage, stageDeals]) => (
                <Card key={stage} className="bg-gray-50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-gray-700 capitalize">
                        {stage === 'new' ? 'New Leads' : stage}
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs" data-testid={`badge-${stage}-count`}>
                        {stageDeals.length}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {stageDeals.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <HandHeart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No deals</p>
                      </div>
                    ) : (
                      stageDeals.map((deal: any) => {
                        const client = getClient(deal.clientId);
                        return (
                          <Card 
                            key={deal.id} 
                            className={`bg-white border-l-4 ${getStageColor(deal.stage)} hover:shadow-md transition-shadow cursor-pointer`}
                            data-testid={`card-deal-${deal.id}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <h4 className="font-medium text-sm text-charcoal" data-testid={`text-deal-title-${deal.id}`}>
                                  {deal.title}
                                </h4>
                                {/* РОЛЕВАЯ ПОЛИТИКА: Показываем кнопки только тем кто может управлять сделкой */}
                                {canManageDeal(deal) && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" data-testid={`button-deal-menu-${deal.id}`}>
                                        <MoreHorizontal className="w-3 h-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleEditDeal(deal)} data-testid={`button-edit-deal-${deal.id}`}>
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      {stage !== 'won' && stage !== 'lost' && (
                                        <>
                                          {stage !== 'negotiation' && (
                                            <DropdownMenuItem onClick={() => handleStageChange(deal.id, 'negotiation')}>
                                              <TrendingUp className="w-4 h-4 mr-2" />
                                              Move to Negotiation
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuItem onClick={() => handleStageChange(deal.id, 'won')}>
                                            <TrendingUp className="w-4 h-4 mr-2" />
                                            Mark as Won
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                      <DropdownMenuItem 
                                        onClick={() => handleDeleteDeal(deal.id)}
                                        className="text-red-600"
                                        data-testid={`button-delete-deal-${deal.id}`}
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>

                              {client && (
                                <div className="flex items-center text-xs text-gray-600 mb-2">
                                  <User className="w-3 h-3 mr-1" />
                                  <span data-testid={`text-deal-client-${deal.id}`}>{client.name}</span>
                                </div>
                              )}

                              {deal.value && (
                                <div className="flex items-center text-xs text-gray-600 mb-2">
                                  <DollarSign className="w-3 h-3 mr-1" />
                                  <span className="font-medium" data-testid={`text-deal-value-${deal.id}`}>
                                    ₺{deal.value.toLocaleString()}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center justify-between">
                                <Badge className={getPriorityColor(deal.priority)} data-testid={`badge-deal-priority-${deal.id}`}>
                                  {deal.priority}
                                </Badge>
                                {deal.expectedCloseDate && (
                                  <div className="flex items-center text-xs text-gray-500">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    <span data-testid={`text-deal-close-date-${deal.id}`}>
                                      {new Date(deal.expectedCloseDate).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {deal.description && (
                                <p className="text-xs text-gray-600 mt-2 border-t pt-2" data-testid={`text-deal-description-${deal.id}`}>
                                  {deal.description.length > 80 ? deal.description.substring(0, 80) + '...' : deal.description}
                                </p>
                              )}

                              <div className="flex items-center text-xs text-gray-500 mt-2">
                                <Clock className="w-3 h-3 mr-1" />
                                <span data-testid={`text-deal-updated-${deal.id}`}>
                                  {new Date(deal.updatedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!dealsLoading && filteredDeals.length === 0 && (
            <Card className="mt-6">
              <CardContent className="p-12 text-center">
                <HandHeart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2" data-testid="text-no-deals">
                  {searchTerm || stageFilter !== "all" || priorityFilter !== "all" 
                    ? "No deals match your filters" 
                    : "No deals yet"
                  }
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || stageFilter !== "all" || priorityFilter !== "all"
                    ? "Try adjusting your search criteria"
                    : "Start building your sales pipeline by creating your first deal"
                  }
                </p>
                {!searchTerm && stageFilter === "all" && priorityFilter === "all" && (
                  <Button 
                    onClick={() => setIsFormOpen(true)}
                    className="bg-gradient-to-r from-rose-gold to-deep-rose text-white"
                    data-testid="button-add-first-deal"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Deal
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Users, 
  HandHeart, 
  DollarSign, 
  Percent, 
  Plus, 
  Bell,
  TriangleAlert,
  Phone,
  Mail,
  Calendar,
  BarChart3,
  UserPlus,
  FileText,
  Bot,
  ChevronDown,
  Briefcase,
  ClipboardList,
  LogOut,
  RefreshCw
} from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { DemoBanner } from "@/components/demo-banner";
import type { Client, Deal, Task } from "@shared/schema";
import { useEffect } from "react";


export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

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

  // Fetch KPIs
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["/api/analytics/kpis"],
    retry: false,
  });

  // Fetch recent clients
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
    retry: false,
  });

  // Fetch recent deals
  const { data: deals, isLoading: dealsLoading } = useQuery({
    queryKey: ["/api/deals"],
    retry: false,
  });

  // Fetch recent tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks"],
    retry: false,
  });

  // Fetch lead sources
  const { data: leadSources } = useQuery({
    queryKey: ["/api/analytics/lead-sources"],
    retry: false,
  });

  // Handle unauthorized errors
  const handleUnauthorizedError = (error: Error) => {
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
  };

  // Refresh dashboard data
  const handleRefresh = async () => {
    try {
      // Invalidate all dashboard-related queries
      await queryClient.invalidateQueries({ queryKey: ["/api/analytics/kpis"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/analytics/lead-sources"] });
      
      toast({
        title: "Data updated",
        description: "Dashboard has been refreshed with latest data",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Unable to refresh dashboard data",
        variant: "destructive",
      });
    }
  };

  // Quick add options
  const quickAddOptions = [
    { 
      label: "Add Client", 
      icon: <UserPlus className="w-4 h-4" />, 
      action: () => window.location.href = "/clients" 
    },
    { 
      label: "Create Deal", 
      icon: <Briefcase className="w-4 h-4" />, 
      action: () => window.location.href = "/deals" 
    },
    { 
      label: "New Task", 
      icon: <ClipboardList className="w-4 h-4" />, 
      action: () => window.location.href = "/tasks" 
    },
    { 
      label: "Schedule Call", 
      icon: <Phone className="w-4 h-4" />, 
      action: () => console.log("Schedule call") 
    },
  ];

  const getMotivationMessage = () => {
    const hour = new Date().getHours();
    const clientCount = (kpis as any)?.leadsCount || 0;
    const dealValue = (kpis as any)?.dealsValue || 0;
    
    if (hour < 12) {
      return "Good morning! A new day brings new opportunities for success";
    } else if (hour < 18) {
      if (clientCount > 5) {
        return "Great work! You have many active clients";
      } else {
        return "Time for new connections! Every client is an opportunity";
      }
    } else {
      if (dealValue > 10000) {
        return "Wonderful day! Your deals are bringing excellent results";
      } else {
        return "Ending the day productively! Tomorrow will be even better";
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
      <div className="p-4 lg:p-6">
        <DemoBanner />
          {/* Welcome Header with Controls */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/20 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-2" data-testid="text-dashboard-title">
                  Welcome, {(user as any)?.firstName || 'User'}!
                </h1>
                <div className="flex items-center gap-4">
                  <p className="text-gray-600">
                    {(user as any)?.email && 'Beauty Manager'} • Customer Relationship Management
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Refresh Button */}
                <Button 
                  variant="outline" 
                  onClick={handleRefresh}
                  className="bg-white/50 border-white/20 hover:bg-white/70 shadow-md"
                  data-testid="button-refresh-dashboard"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Обновить
                </Button>

                {/* Quick Add Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-lg"
                      data-testid="button-quick-add"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Quick Add
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-white/95 backdrop-blur-sm border border-white/20">
                    <DropdownMenuItem className="cursor-pointer hover:bg-purple-50" data-testid="menu-add-client">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Client
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer hover:bg-pink-50" data-testid="menu-add-deal">
                      <Briefcase className="w-4 h-4 mr-2" />
                      Add Deal
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer hover:bg-blue-50" data-testid="menu-add-task">
                      <ClipboardList className="w-4 h-4 mr-2" />
                      Add Task
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-3 px-4 py-3 hover:bg-white/50 rounded-xl border border-white/20" data-testid="button-user-menu">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm">
                          {(user as any)?.firstName?.[0] || 'U'}{(user as any)?.lastName?.[0] || ''}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <div className="text-sm font-medium text-gray-700">{(user as any)?.firstName || ''} {(user as any)?.lastName || ''}</div>
                        <div className="text-xs text-gray-500">{(user as any)?.email || ''}</div>
                        <div className="text-xs font-medium text-purple-600 capitalize">{(user as any)?.role || 'user'}</div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-white/95 backdrop-blur-sm border border-white/20">
                    <DropdownMenuItem 
                      onClick={() => window.location.href = "/api/logout"} 
                      className="text-red-600 focus:text-red-600 hover:bg-red-50"
                      data-testid="button-logout"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-100">Leads</CardTitle>
                <Users className="h-5 w-5 text-purple-200" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-leads-count">
                  {kpisLoading ? "-" : (kpis as any)?.leadsCount || 0}
                </div>
                <p className="text-xs text-purple-200 mt-1">
                  total active leads
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-pink-100">Deals</CardTitle>
                <HandHeart className="h-5 w-5 text-pink-200" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-deals-count">
                  {kpisLoading ? "-" : (kpis as any)?.dealsCount || 0}
                </div>
                <p className="text-xs text-pink-200 mt-1">
                  active deals
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-100">Revenue</CardTitle>
                <DollarSign className="h-5 w-5 text-blue-200" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-revenue">
                  ₺{kpisLoading ? "-" : ((kpis as any)?.dealsValue || 0).toLocaleString()}
                </div>
                <p className="text-xs text-blue-200 mt-1">
                  total value
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-indigo-100">Conversion</CardTitle>
                <Percent className="h-5 w-5 text-indigo-200" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-conversion">
                  {kpisLoading ? "-" : Math.round((kpis as any)?.conversionRate || 0)}%
                </div>
                <p className="text-xs text-indigo-200 mt-1">
                  conversion rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Business Intelligence Dashboard */}
          <div className="space-y-8">
            
            {/* Clients Overview - Grouped by Status & Priority */}
            <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-800 flex items-center">
                  <Users className="w-6 h-6 mr-3 text-purple-600" />
                  Clients — Status & Priority Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {clientsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* New Clients */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-green-700 flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                        New Clients ({(clients as any)?.filter((c: Client) => c.status === 'new' || !c.status).length || 0})
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {(clients as any)?.filter((c: Client) => c.status === 'new' || !c.status).slice(0, 4).map((client: Client) => (
                          <div key={client.id} className="p-3 rounded-lg bg-green-50 border border-green-200">
                            <div className="font-medium text-sm">{client.name}</div>
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <span>{client.phone || client.email}</span>
                              {client.phone && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => window.open(`tel:${client.phone}`, '_self')}
                                    className="text-blue-600 hover:text-blue-800 text-xs"
                                    title="Call"
                                  >
                                    📞
                                  </button>
                                  <button
                                    onClick={() => window.open(`https://wa.me/${client.phone?.replace(/\D/g, '')}`, '_blank')}
                                    className="text-green-600 hover:text-green-800 text-xs"
                                    title="Open WhatsApp"
                                  >
                                    📱
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-green-600 mt-1">
                              {client.source && <Badge variant="secondary" className="text-xs">{client.source}</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Active Clients */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-blue-700 flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                        Active Clients ({(clients as any)?.filter((c: Client) => c.status === 'customer').length || 0})
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {(clients as any)?.filter((c: Client) => c.status === 'customer').slice(0, 4).map((client: Client) => (
                          <div key={client.id} className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                            <div className="font-medium text-sm">{client.name}</div>
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <span>{client.phone || client.email}</span>
                              {client.phone && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => window.open(`tel:${client.phone}`, '_self')}
                                    className="text-blue-600 hover:text-blue-800 text-xs"
                                    title="Call"
                                  >
                                    📞
                                  </button>
                                  <button
                                    onClick={() => window.open(`https://wa.me/${client.phone?.replace(/\D/g, '')}`, '_blank')}
                                    className="text-green-600 hover:text-green-800 text-xs"
                                    title="Open WhatsApp"
                                  >
                                    📱
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-blue-600 mt-1">
                              {client.lastContactDate && (
                                <span>Last contact: {new Date(client.lastContactDate).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* VIP/High Value Clients */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-amber-700 flex items-center">
                        <div className="w-3 h-3 bg-amber-500 rounded-full mr-2"></div>
                        VIP Clients ({(clients as any)?.filter((c: Client) => c.notes?.toLowerCase().includes('vip') || c.notes?.toLowerCase().includes('приоритет')).length || 0})
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {(clients as any)?.filter((c: Client) => c.notes?.toLowerCase().includes('vip') || c.notes?.toLowerCase().includes('приоритет')).slice(0, 4).map((client: Client) => (
                          <div key={client.id} className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                            <div className="font-medium text-sm">{client.name}</div>
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <span>{client.phone || client.email}</span>
                              {client.phone && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => window.open(`tel:${client.phone}`, '_self')}
                                    className="text-blue-600 hover:text-blue-800 text-xs"
                                    title="Call"
                                  >
                                    📞
                                  </button>
                                  <button
                                    onClick={() => window.open(`https://wa.me/${client.phone?.replace(/\D/g, '')}`, '_blank')}
                                    className="text-green-600 hover:text-green-800 text-xs"
                                    title="Open WhatsApp"
                                  >
                                    📱
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-amber-600 mt-1 flex gap-1">
                              {client.notes?.toLowerCase().includes('vip') && <Badge variant="secondary" className="text-xs bg-yellow-100">VIP</Badge>}
                              {client.notes?.toLowerCase().includes('приоритет') && <Badge variant="secondary" className="text-xs bg-red-100">High Priority</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Deals Pipeline - Grouped by Stage & Value */}
            <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-800 flex items-center">
                  <Briefcase className="w-6 h-6 mr-3 text-pink-600" />
                  Sales Pipeline — Grouping by Stages & Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dealsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Pipeline Overview */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                      {['proposal', 'negotiation', 'won', 'lost', 'discovery'].map((stage) => {
                        const stageDeals = (deals as any)?.filter((d: Deal) => d.stage === stage) || [];
                        const stageValue = stageDeals.reduce((sum: number, deal: Deal) => sum + (Number(deal.value) || 0), 0);
                        const stageColors = {
                          proposal: 'bg-yellow-100 border-yellow-300 text-yellow-800',
                          negotiation: 'bg-orange-100 border-orange-300 text-orange-800',
                          discovery: 'bg-blue-100 border-blue-300 text-blue-800',
                          won: 'bg-green-100 border-green-300 text-green-800',
                          lost: 'bg-red-100 border-red-300 text-red-800'
                        };
                        const stageNames = {
                          proposal: 'Proposal',
                          negotiation: 'Negotiation',
                          discovery: 'Discovery',
                          won: 'Won',
                          lost: 'Lost'
                        };
                        
                        return (
                          <div key={stage} className={`p-4 rounded-lg border-2 ${stageColors[stage as keyof typeof stageColors]}`}>
                            <div className="text-sm font-semibold">{stageNames[stage as keyof typeof stageNames]}</div>
                            <div className="text-lg font-bold">{stageDeals.length}</div>
                            <div className="text-xs">${stageValue.toLocaleString()}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* High Value Deals */}
                    <div className="border-t pt-6">
                      <h4 className="font-semibold text-green-700 mb-4 flex items-center">
                        <DollarSign className="w-4 h-4 mr-2" />
                        High Value Deals (&gt;$1000)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(deals as any)?.filter((d: Deal) => Number(d.value) > 1000).slice(0, 4).map((deal: Deal) => (
                          <div key={deal.id} className="p-4 rounded-lg bg-green-50 border border-green-200">
                            <div className="font-semibold text-sm">{deal.title}</div>
                            <div className="text-lg font-bold text-green-600">${Number(deal.value).toLocaleString()}</div>
                            <div className="text-xs text-gray-600">
                              Stage: {deal.stage} | Probability: {deal.probability}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tasks Management - Grouped by Priority & Due Date */}
            <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-800 flex items-center">
                  <ClipboardList className="w-6 h-6 mr-3 text-blue-600" />
                  Task Management — By Priority & Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* High Priority Tasks */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-red-700 flex items-center">
                        <TriangleAlert className="w-4 h-4 mr-2" />
                        High Priority ({(tasks as any)?.filter((t: Task) => t.priority === 'high' && t.status !== 'completed').length || 0})
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {(tasks as any)?.filter((t: Task) => t.priority === 'high' && t.status !== 'completed').slice(0, 5).map((task: Task) => (
                          <div key={task.id} className="p-3 rounded-lg bg-red-50 border border-red-200">
                            <div className="font-medium text-sm">{task.title}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              {task.dueDate && (
                                <span className="text-red-600">
                                  Due: {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <Badge variant="destructive" className="text-xs mt-1">{task.status}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Due Today/Overdue */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-orange-700 flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        Due Today & Overdue ({(tasks as any)?.filter((t: Task) => {
                          if (!t.dueDate || t.status === 'completed') return false;
                          const today = new Date();
                          const dueDate = new Date(t.dueDate);
                          return dueDate <= today;
                        }).length || 0})
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {(tasks as any)?.filter((t: Task) => {
                          if (!t.dueDate || t.status === 'completed') return false;
                          const today = new Date();
                          const dueDate = new Date(t.dueDate);
                          return dueDate <= today;
                        }).slice(0, 5).map((task: Task) => (
                          <div key={task.id} className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                            <div className="font-medium text-sm">{task.title}</div>
                            <div className="text-xs text-orange-600 mt-1">
                              {task.dueDate && (
                                <span>
                                  {new Date(task.dueDate) < new Date() ? 'Overdue: ' : 'Today: '}
                                  {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-xs mt-1">{task.status}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recently Completed */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-green-700 flex items-center">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Недавно выполнено ({(tasks as any)?.filter((t: Task) => t.status === 'completed').length || 0})
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {(tasks as any)?.filter((t: Task) => t.status === 'completed').slice(0, 5).map((task: Task) => (
                          <div key={task.id} className="p-3 rounded-lg bg-green-50 border border-green-200">
                            <div className="font-medium text-sm">{task.title}</div>
                            <div className="text-xs text-green-600 mt-1">
                              Выполнено: {task.updatedAt ? new Date(task.updatedAt).toLocaleDateString() : 'Недавно'}
                            </div>
                            <Badge variant="default" className="text-xs mt-1 bg-green-100 text-green-800">Завершено</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lead Sources & Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-gray-800 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
                    Источники лидов
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {leadSources && (leadSources as any).map((source: any, index: number) => (
                      <div key={source.source} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${
                            index === 0 ? 'from-purple-400 to-purple-600' :
                            index === 1 ? 'from-pink-400 to-pink-600' :
                            index === 2 ? 'from-blue-400 to-blue-600' :
                            'from-gray-400 to-gray-600'
                          }`}></div>
                          <span className="text-sm font-medium capitalize">{source.source}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold">{source.count}</div>
                          <div className="text-xs text-gray-500">{source.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-gray-800 flex items-center">
                    <Bot className="w-5 h-5 mr-2 text-purple-600" />
                    Мотивационное сообщение
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {getMotivationMessage()}
                    </p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">{(clients as any)?.length || 0}</div>
                      <div className="text-xs text-blue-500">Всего клиентов</div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        {(deals as any)?.filter((d: Deal) => d.stage === 'won').length || 0}
                      </div>
                      <div className="text-xs text-green-500">Выигранных сделок</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
      </div>
  );
}
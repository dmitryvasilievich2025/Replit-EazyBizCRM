import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  HandHeart, 
  DollarSign, 
  Percent,
  Target,
  Calendar,
  Clock,
  Award
} from "lucide-react";
import { useState } from "react";

export default function Analytics() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [timeRange, setTimeRange] = useState("30");

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

  // Calculate date range
  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(timeRange));
    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  // Fetch KPIs
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["/api/analytics/kpis", `?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`],
    retry: false,
    enabled: isAuthenticated,
  });

  // Fetch lead source stats
  const { data: leadSources = [], isLoading: leadSourcesLoading } = useQuery({
    queryKey: ["/api/analytics/lead-sources"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Fetch deals for analysis
  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ["/api/deals"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Fetch clients for analysis
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Calculate deal stage distribution
  const dealStageData = [
    { name: 'New', value: deals.filter((d: any) => d.stage === 'new').length, color: '#3B82F6' },
    { name: 'Contacted', value: deals.filter((d: any) => d.stage === 'contacted').length, color: '#F59E0B' },
    { name: 'Qualified', value: deals.filter((d: any) => d.stage === 'qualified').length, color: '#8B5CF6' },
    { name: 'Proposal', value: deals.filter((d: any) => d.stage === 'proposal').length, color: '#06B6D4' },
    { name: 'Negotiation', value: deals.filter((d: any) => d.stage === 'negotiation').length, color: '#F97316' },
    { name: 'Won', value: deals.filter((d: any) => d.stage === 'won').length, color: '#10B981' },
    { name: 'Lost', value: deals.filter((d: any) => d.stage === 'lost').length, color: '#EF4444' },
  ];

  // Calculate monthly performance (last 6 months)
  const getMonthlyData = () => {
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthDeals = deals.filter((deal: any) => {
        const dealDate = new Date(deal.createdAt);
        return dealDate >= monthStart && dealDate <= monthEnd;
      });
      
      const monthClients = clients.filter((client: any) => {
        const clientDate = new Date(client.createdAt);
        return clientDate >= monthStart && clientDate <= monthEnd;
      });
      
      const wonDeals = monthDeals.filter((deal: any) => deal.stage === 'won');
      const totalValue = wonDeals.reduce((sum: number, deal: any) => sum + (deal.value || 0), 0);
      
      monthlyData.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        leads: monthClients.length,
        deals: monthDeals.length,
        revenue: totalValue,
        conversionRate: monthClients.length > 0 ? (wonDeals.length / monthClients.length) * 100 : 0,
      });
    }
    return monthlyData;
  };

  const monthlyData = getMonthlyData();

  // Lead source chart colors
  const COLORS = ['#E8B4B8', '#C4899D', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

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
              <h2 className="text-2xl font-bold text-charcoal" data-testid="text-analytics-title">Analytics</h2>
              <p className="text-sm text-gray-500">Performance insights and trends</p>
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40" data-testid="select-time-range">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* KPI Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Leads</p>
                    <p className="text-3xl font-bold text-charcoal mt-2" data-testid="text-total-leads">
                      {kpisLoading ? '...' : kpis?.leadsCount || 0}
                    </p>
                    <p className="text-sm text-green-600 mt-1 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +12% vs last period
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Deals</p>
                    <p className="text-3xl font-bold text-charcoal mt-2" data-testid="text-active-deals">
                      {dealsLoading ? '...' : kpis?.dealsCount || 0}
                    </p>
                    <p className="text-sm text-red-600 mt-1 flex items-center">
                      <TrendingDown className="w-3 h-3 mr-1" />
                      -3% vs last period
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-rose-gold/20 rounded-lg flex items-center justify-center">
                    <HandHeart className="w-6 h-6 text-deep-rose" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Revenue</p>
                    <p className="text-3xl font-bold text-charcoal mt-2" data-testid="text-total-revenue">
                      {kpisLoading ? '...' : `$${kpis?.dealsValue ? (kpis.dealsValue / 1000).toFixed(1) + 'K' : '0'}`}
                    </p>
                    <p className="text-sm text-green-600 mt-1 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +25% vs last period
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                    <p className="text-3xl font-bold text-charcoal mt-2" data-testid="text-conversion-rate">
                      {kpisLoading ? '...' : `${kpis?.conversionRate ? kpis.conversionRate.toFixed(1) : '0'}%`}
                    </p>
                    <p className="text-sm text-green-600 mt-1 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +5% vs last period
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Percent className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-charcoal">Monthly Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stackId="1"
                      stroke="hsl(var(--rose-gold))"
                      fill="hsl(var(--rose-gold))"
                      name="Revenue ($)"
                    />
                    <Area
                      type="monotone"
                      dataKey="deals"
                      stackId="2"
                      stroke="hsl(var(--deep-rose))"
                      fill="hsl(var(--deep-rose))"
                      name="Deals"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Lead Sources */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-charcoal">Lead Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={leadSources}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {leadSources.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Deal Pipeline Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Deal Stage Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-charcoal">Deal Stage Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dealStageData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--rose-gold))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Conversion Funnel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-charcoal">Conversion Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dealStageData.filter(stage => stage.value > 0).map((stage, index) => {
                    const maxValue = Math.max(...dealStageData.map(s => s.value));
                    const percentage = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
                    
                    return (
                      <div key={stage.name} className="space-y-2" data-testid={`funnel-stage-${stage.name.toLowerCase()}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-charcoal">{stage.name}</span>
                          <span className="text-sm text-gray-600">{stage.value} deals</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="h-3 rounded-full transition-all duration-300"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: stage.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-charcoal flex items-center">
                  <Target className="w-5 h-5 mr-2 text-blue-600" />
                  Goals Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Monthly Leads Goal</span>
                      <span className="text-sm text-gray-600">75/100</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full w-3/4"></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Revenue Goal</span>
                      <span className="text-sm text-gray-600">$45K/$50K</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full w-4/5"></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Conversion Rate Goal</span>
                      <span className="text-sm text-gray-600">28%/30%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: '93%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-charcoal flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-amber-600" />
                  Time Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Avg. Deal Cycle</span>
                    <span className="font-medium">14 days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Response Time</span>
                    <span className="font-medium">2.5 hours</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Follow-up Rate</span>
                    <span className="font-medium">85%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Work Hours/Day</span>
                    <span className="font-medium">{kpis?.workHours ? (kpis.workHours / 30).toFixed(1) : '0'} hrs</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-charcoal flex items-center">
                  <Award className="w-5 h-5 mr-2 text-rose-gold" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Award className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Deal Closer</p>
                      <p className="text-xs text-gray-600">Closed 10+ deals this month</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Lead Magnet</p>
                      <p className="text-xs text-gray-600">Generated 50+ leads</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Rising Star</p>
                      <p className="text-xs text-gray-600">30% improvement this month</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

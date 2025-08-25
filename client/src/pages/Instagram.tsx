import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Instagram,
  Search,
  Bot,
  Target,
  TrendingUp,
  Hash,
  Eye,
  Play,
  Pause,
  Settings,
  Users,
  Heart,
  MessageCircle,
  Share,
  Filter,
  RefreshCw,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Activity,
  Zap,
  Star,
  UserCheck,
  UserPlus,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  User,
  BarChart3,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";

interface ParsingConfig {
  enabled: boolean;
  interval: number;
  hashtags: string[];
  competitors: string[];
  brandMentions: string[];
  autoCreateLeads: boolean;
  minEngagementScore: number;
}

interface ParsedContent {
  id: string;
  type: 'post' | 'comment' | 'mention';
  username: string;
  content: string;
  likes: number;
  comments: number;
  engagement_score: number;
  created_at: string;
  source_url: string;
  is_lead_candidate: boolean;
  hashtags: string[];
}

interface CompetitorData {
  username: string;
  followers: number;
  following: number;
  posts: number;
  engagement_rate: number;
  last_post: string;
  avg_likes: number;
  avg_comments: number;
  growth_rate: number;
}

export default function InstagramPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isParsingActive, setIsParsingActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTimeRange, setSelectedTimeRange] = useState("24h");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [editingHashtag, setEditingHashtag] = useState<string | null>(null);
  const [editingCompetitor, setEditingCompetitor] = useState<string | null>(null);
  const [newHashtag, setNewHashtag] = useState("");
  const [newCompetitor, setNewCompetitor] = useState("");
  const [newBrandMention, setNewBrandMention] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'timestamp' | 'username'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const itemsPerPage = 6;

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Default parsing configuration
  const [parsingConfig, setParsingConfig] = useState<ParsingConfig>({
    enabled: false,
    interval: 3600,
    hashtags: ['#lashextension', '#eyelashextension', '#lashlifting', '#magicLash'],
    competitors: ['@lash_academy_istanbul', '@beauty_studio_tr'],
    brandMentions: ['Magic Lash', 'InLei', 'MagicLash'],
    autoCreateLeads: true,
    minEngagementScore: 50
  });

  // Fetch Instagram clients
  const { data: instagramClients = [], isLoading: clientsLoading, refetch: refetchClients } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await fetch("/api/clients");
      if (!response.ok) throw new Error('Failed to fetch clients');
      const clients = await response.json();
      // Показываем клиентов с Instagram username ИЛИ источником Instagram/Instagram parsing
      return clients.filter((client: any) => 
        client.instagram_username || 
        client.instagramUsername || 
        client.source === 'instagram' || 
        client.source === 'instagram_parsing'
      );
    },
    retry: false,
  });

  // Fetch deals for Instagram analytics
  const { data: allDeals = [] } = useQuery({
    queryKey: ["/api/deals"],
    retry: false,
  });

  // Fetch parsing configuration
  const { data: configData } = useQuery({
    queryKey: ["/api/instagram/parsing/config"],
    retry: false,
  });

  // Fetch Instagram leads from Telegram Bot (NEW)
  const { data: instagramLeads = [], isLoading: leadsLoading, refetch: refetchLeads } = useQuery({
    queryKey: ["/api/instagram/leads"],
    queryFn: async () => {
      const response = await fetch('/api/instagram/leads');
      if (!response.ok) throw new Error('Failed to fetch Instagram leads');
      return response.json();
    },
    retry: false,
  });

  // Fetch parsed content (OLD - backup)
  const { data: parsedContent = [], isLoading: contentLoading, refetch: refetchContent } = useQuery({
    queryKey: ["/api/instagram/parsing/content", selectedTimeRange],
    queryFn: async () => {
      const response = await fetch(`/api/instagram/parsing/content?timeRange=${selectedTimeRange}`);
      if (!response.ok) throw new Error('Failed to fetch parsed content');
      return response.json();
    },
    retry: false,
  });

  // Fetch competitor data
  const { data: competitorData = [], refetch: refetchCompetitors } = useQuery({
    queryKey: ["/api/instagram/parsing/competitors"],
    retry: false,
  }) as { data: any[]; refetch: () => void };

  // Fetch hashtag analytics
  const { data: hashtagAnalytics = [], refetch: refetchHashtags } = useQuery({
    queryKey: ["/api/instagram/parsing/hashtags"],
    retry: false,
  }) as { data: any[]; refetch: () => void };

  // Start parsing mutation
  const startParsingMutation = useMutation({
    mutationFn: async (config: ParsingConfig) => {
      const response = await fetch('/api/instagram/parsing/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!response.ok) throw new Error('Failed to start parsing');
      return response.json();
    },
    onSuccess: () => {
      setIsParsingActive(true);
      toast({
        title: "Парсинг запущен",
        description: "Instagram парсинг успешно активирован",
        variant: "default",
      });
      refetchContent();
    }
  });

  // Stop parsing mutation
  const stopParsingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/instagram/parsing/stop', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to stop parsing');
      return response.json();
    },
    onSuccess: () => {
      setIsParsingActive(false);
      toast({
        title: "Парсинг остановлен",
        description: "Instagram парсинг деактивирован",
        variant: "default",
      });
    }
  });

  // Fetch current user for role-based permissions
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Check if user can manage leads (admin, director, manager)
  const canManageLeads = currentUser?.role && ['admin', 'director', 'manager'].includes(currentUser.role);

  // Claim Instagram lead
  const claimLeadMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const response = await fetch(`/api/instagram/leads/${leadId}/claim`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to claim lead');
      return response.json();
    },
    onSuccess: (updatedLead) => {
      toast({
        title: "Лид присвоен",
        description: `@${updatedLead.instagramUsername} теперь назначен вам`,
        variant: "default",
      });
      refetchLeads();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось присвоить лид",
        variant: "destructive",
      });
    }
  });

  // Convert lead to client (manual process with manager approval)
  const convertLeadToClientMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const response = await fetch(`/api/instagram/leads/${leadId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to convert lead');
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Лид конвертирован",
        description: `@${result.lead.instagramUsername} успешно добавлен в CRM как клиент`,
        variant: "default",
      });
      refetchClients();
      refetchLeads();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось конвертировать лид в клиента",
        variant: "destructive",
      });
    }
  });

  // Create lead from parsed content
  const createLeadMutation = useMutation({
    mutationFn: async (contentId: string) => {
      const response = await fetch('/api/instagram/parsing/create-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId })
      });
      if (!response.ok) throw new Error('Failed to create lead');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Лид создан",
        description: "Новый лид успешно создан из Instagram",
        variant: "default",
      });
      refetchContent();
      refetchClients();
    }
  });

  const instagramDeals = (allDeals as any[]).filter((deal: any) => {
    const client = (instagramClients as any[]).find((c: any) => c.id === deal.client_id);
    return client && client.instagram_username;
  });

  // Calculate summary stats
  const summaryStats = {
    totalClients: (instagramClients as any[]).length || 0,
    totalConversions: (instagramClients as any[]).filter((c: any) => c.status === 'customer').length || 0,
    totalParsed: (parsedContent as ParsedContent[]).length,
    potentialLeads: (parsedContent as ParsedContent[]).filter((item: ParsedContent) => item.is_lead_candidate).length,
    avgEngagement: (parsedContent as ParsedContent[]).length > 0 
      ? Math.round((parsedContent as ParsedContent[]).reduce((sum: number, item: ParsedContent) => sum + (item.engagement_score || 0), 0) / (parsedContent as ParsedContent[]).length)
      : 0,
    totalRevenue: instagramDeals.reduce((sum: number, deal: any) => sum + (deal.value || 0), 0),
    competitorsMonitored: competitorData.length
  };

  const conversionRate = summaryStats.totalClients > 0 ? 
    ((summaryStats.totalConversions / summaryStats.totalClients) * 100).toFixed(1) : '0';

  // CRUD functions for hashtags
  const addHashtag = () => {
    if (newHashtag.trim() && !parsingConfig.hashtags.includes(newHashtag.trim())) {
      setParsingConfig({
        ...parsingConfig,
        hashtags: [...parsingConfig.hashtags, newHashtag.trim()]
      });
      setNewHashtag("");
      toast({ title: "Хештег добавлен", variant: "default" });
    }
  };

  const removeHashtag = (hashtag: string) => {
    setParsingConfig({
      ...parsingConfig,
      hashtags: parsingConfig.hashtags.filter(h => h !== hashtag)
    });
    toast({ title: "Хештег удален", variant: "default" });
  };

  // CRUD functions for competitors
  const addCompetitor = () => {
    if (newCompetitor.trim() && !parsingConfig.competitors.includes(newCompetitor.trim())) {
      setParsingConfig({
        ...parsingConfig,
        competitors: [...parsingConfig.competitors, newCompetitor.trim()]
      });
      setNewCompetitor("");
      toast({ title: "Конкурент добавлен", variant: "default" });
    }
  };

  const removeCompetitor = (competitor: string) => {
    setParsingConfig({
      ...parsingConfig,
      competitors: parsingConfig.competitors.filter(c => c !== competitor)
    });
    toast({ title: "Конкурент удален", variant: "default" });
  };

  // CRUD functions for brand mentions
  const addBrandMention = () => {
    if (newBrandMention.trim() && !parsingConfig.brandMentions.includes(newBrandMention.trim())) {
      setParsingConfig({
        ...parsingConfig,
        brandMentions: [...parsingConfig.brandMentions, newBrandMention.trim()]
      });
      setNewBrandMention("");
      toast({ title: "Упоминание бренда добавлено", variant: "default" });
    }
  };

  const removeBrandMention = (mention: string) => {
    setParsingConfig({
      ...parsingConfig,
      brandMentions: parsingConfig.brandMentions.filter(m => m !== mention)
    });
    toast({ title: "Упоминание бренда удалено", variant: "default" });
  };

  const handleStartParsing = () => {
    startParsingMutation.mutate(parsingConfig);
  };

  const handleStopParsing = () => {
    stopParsingMutation.mutate();
  };

  const handleCreateLead = (contentId: string) => {
    createLeadMutation.mutate(contentId);
  };

  // Handle claiming Instagram lead
  const handleClaimLead = async (leadId: string) => {
    claimLeadMutation.mutate(leadId);
  };

  // Handle converting lead to client
  const handleConvertLead = async (leadId: string) => {
    convertLeadToClientMutation.mutate(leadId);
  };

  // Handle editing client  
  const handleEditClient = (client: any) => {
    // Navigate to main clients page with edit parameter
    window.location.href = `/clients?edit=${client.id}`;
  };

  // Handle deleting client
  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete client');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Клиент удален",
        description: "Клиент успешно удален из системы",
        variant: "default",
      });
      refetchClients();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить клиента",
        variant: "destructive",
      });
    }
  });

  const handleDeleteClient = (clientId: string) => {
    if (confirm('Вы уверены, что хотите удалить этого клиента?')) {
      deleteClientMutation.mutate(clientId);
    }
  };

  const filteredClients = (instagramClients as any[]).filter((client: any) =>
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.instagram_username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Show Instagram leads from Telegram Bot (NEW) with sorting and pagination
  const filteredLeads = (instagramLeads as any[])
    .filter((lead: any) =>
      lead.instagramUsername?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.message?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a: any, b: any) => {
      if (sortBy === 'timestamp') {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else if (sortBy === 'username') {
        const usernameA = a.instagramUsername || '';
        const usernameB = b.instagramUsername || '';
        return sortOrder === 'desc' 
          ? usernameB.localeCompare(usernameA) 
          : usernameA.localeCompare(usernameB);
      }
      return 0;
    });

  // Pagination logic
  const totalLeads = filteredLeads.length;
  const totalPages = Math.ceil(totalLeads / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

  // Reset to first page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortOrder]);

  const filteredContent = (parsedContent as ParsedContent[]).filter((item: ParsedContent) =>
    item.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl text-white">
                <Instagram className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Instagram CRM</h1>
                <p className="text-gray-500 mt-1">Полное управление Instagram: клиенты, парсинг, аналитика</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Period Selector */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Период парсинга" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1 час</SelectItem>
                    <SelectItem value="24h">24 часа</SelectItem>
                    <SelectItem value="7d">7 дней</SelectItem>
                    <SelectItem value="30d">30 дней</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                isParsingActive ? 'bg-green-100 border-green-300' : 'bg-gray-100 border-gray-300'
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  isParsingActive ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
                <span className={`text-sm font-medium ${
                  isParsingActive ? 'text-green-800' : 'text-gray-600'
                }`}>
                  {isParsingActive ? 'Парсинг активен' : 'Парсинг остановлен'}
                </span>
              </div>
              
              {isParsingActive ? (
                <Button 
                  variant="outline" 
                  onClick={handleStopParsing}
                  disabled={stopParsingMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Pause className="w-4 h-4" />
                  Остановить
                </Button>
              ) : (
                <Button 
                  onClick={handleStartParsing}
                  disabled={startParsingMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Запустить
                </Button>
              )}
              
              <Button 
                variant="outline" 
                onClick={() => {
                  refetchClients();
                  refetchContent();
                  refetchCompetitors();
                  refetchHashtags();
                }}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Обновить
              </Button>
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Instagram клиенты</p>
                    <p className="text-3xl font-bold text-blue-900">{summaryStats.totalClients}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Конверсии</p>
                    <p className="text-3xl font-bold text-green-900">{summaryStats.totalConversions}</p>
                  </div>
                  <Target className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">% Конверсии</p>
                    <p className="text-3xl font-bold text-purple-900">{conversionRate}%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">Спарсено</p>
                    <p className="text-3xl font-bold text-orange-900">{summaryStats.totalParsed}</p>
                  </div>
                  <Activity className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-pink-600">Потенц. лиды</p>
                    <p className="text-3xl font-bold text-pink-900">{summaryStats.potentialLeads}</p>
                  </div>
                  <Star className="w-8 h-8 text-pink-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-indigo-600">Доходы</p>
                    <p className="text-3xl font-bold text-indigo-900">{summaryStats.totalRevenue.toLocaleString('ru-RU')}₺</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-indigo-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="dashboard">📊 Дашборд</TabsTrigger>
              <TabsTrigger value="clients">👥 Клиенты</TabsTrigger>
              <TabsTrigger value="parsing">🤖 Парсинг</TabsTrigger>
              <TabsTrigger value="competitors">👁️ Конкуренты</TabsTrigger>
              <TabsTrigger value="hashtags"># Хештеги</TabsTrigger>
              <TabsTrigger value="settings">⚙️ Настройки</TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Ежедневная активность
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">Сегодня</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-blue-500" />
                            <span>{(instagramClients as any[]).filter((c: any) => c.status === 'new').length}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Target className="w-4 h-4 text-green-500" />
                            <span>{(instagramClients as any[]).filter((c: any) => c.status === 'customer').length}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Instagram className="w-4 h-4 text-pink-500" />
                          <span className="font-medium">Instagram доходы</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-green-500" />
                            <span>{summaryStats.totalRevenue.toLocaleString('ru-RU')} ₺</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Target className="w-4 h-4 text-purple-500" />
                            <span>{instagramDeals.length} сделок</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Эффективность парсинга
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Потенциальные лиды</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {summaryStats.potentialLeads} из {summaryStats.totalParsed}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Средний engagement</span>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          {summaryStats.avgEngagement}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Конверсия в клиентов</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ width: `${parseFloat(conversionRate)}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium w-12 text-right">{conversionRate}%</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Активных хештегов</span>
                          <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-purple-500" />
                            <span className="text-xs font-medium">{parsingConfig.hashtags.length}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Clients Tab */}
            <TabsContent value="clients" className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Поиск клиентов..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
                <Button variant="outline" className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Добавить клиента
                </Button>
              </div>

              <div className="grid gap-4">
                {clientsLoading ? (
                  <div className="text-center py-12 text-gray-500">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                    <p>Загрузка клиентов...</p>
                  </div>
                ) : filteredClients.length === 0 ? (
                  <Card className="text-center py-12">
                    <Instagram className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">Instagram клиенты не найдены</p>
                  </Card>
                ) : (
                  filteredClients.map((client: any) => (
                    <Card key={client.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {client.name?.charAt(0)?.toUpperCase() || 'K'}
                          </div>
                          <div>
                            <h3 className="font-semibold">{client.name || 'Неизвестный клиент'}</h3>
                            <p className="text-sm text-gray-500">@{client.instagram_username}</p>
                            <p className="text-sm text-gray-600">{client.email || 'Нет email'}</p>
                            {client.phone && (
                              <p className="text-sm text-gray-600">{client.phone}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${
                            client.status === 'new' ? 'bg-blue-500' :
                            client.status === 'qualified' ? 'bg-yellow-500' :
                            client.status === 'customer' ? 'bg-green-500' :
                            'bg-gray-500'
                          } text-white`}>
                            {client.status}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleEditClient(client)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleDeleteClient(client.id)}
                            disabled={deleteClientMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Parsing Tab */}
            <TabsContent value="parsing" className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Поиск по лидам..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                    />
                  </div>
                  <div className="text-sm text-gray-500">
                    Период: <span className="font-medium">{
                      selectedTimeRange === '1h' ? '1 час' :
                      selectedTimeRange === '24h' ? '24 часа' :
                      selectedTimeRange === '7d' ? '7 дней' : '30 дней'
                    }</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Показано: <span className="font-medium">{startIndex + 1}-{Math.min(endIndex, totalLeads)} из {totalLeads}</span>
                    <span className="text-xs ml-2 text-blue-600">
                      (Страниц: {totalPages})
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Сортировка:</span>
                  <Button
                    variant={sortBy === 'timestamp' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      if (sortBy === 'timestamp') {
                        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                      } else {
                        setSortBy('timestamp');
                        setSortOrder('desc');
                      }
                    }}
                    className="flex items-center gap-1"
                  >
                    <Calendar className="w-4 h-4" />
                    Дата
                    {sortBy === 'timestamp' && (
                      sortOrder === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                    )}
                  </Button>
                  <Button
                    variant={sortBy === 'username' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      if (sortBy === 'username') {
                        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                      } else {
                        setSortBy('username');
                        setSortOrder('asc');
                      }
                    }}
                    className="flex items-center gap-1"
                  >
                    <User className="w-4 h-4" />
                    Пользователь
                    {sortBy === 'username' && (
                      sortOrder === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid gap-4">
                {leadsLoading ? (
                  <div className="text-center py-12 text-gray-500">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                    <p>Загрузка лидов...</p>
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <Card className="text-center py-12">
                    <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">Instagram лиды не найдены</p>
                    <p className="text-sm text-gray-400 mt-1">Используйте /parse_instagram в Telegram боте</p>
                  </Card>
                ) : (
                  paginatedLeads.map((lead: any) => (
                    <Card key={lead.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {lead.instagramUsername?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-semibold">@{lead.instagramUsername}</p>
                            <p className="text-sm text-gray-500">{new Date(lead.timestamp).toLocaleString('ru-RU')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${
                            lead.sourceType === 'post' ? 'bg-blue-500' :
                            lead.sourceType === 'comment' ? 'bg-green-500' : 'bg-purple-500'
                          } text-white`}>
                            {lead.sourceType}
                          </Badge>
                          <Badge className={`${
                            lead.status === 'new' ? 'bg-yellow-500' :
                            lead.status === 'converted' ? 'bg-green-500' : 'bg-gray-500'
                          } text-white`}>
                            <Star className="w-3 h-3 mr-1" />
                            {lead.status === 'converted' ? 'Конвертирован' : 'Новый лид'}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-gray-700 mb-3">{lead.message}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(lead.timestamp).toLocaleDateString('ru-RU')}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {lead.fullName || lead.instagramUsername}
                          </div>
                        </div>
                        
                        {lead.status === 'new' && (
                          <div className="flex gap-2">
                            {canManageLeads ? (
                              <>
                                {!lead.assignedTo ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleClaimLead(lead.id)}
                                    disabled={claimLeadMutation.isPending}
                                    className="flex items-center gap-1"
                                    data-testid={`button-claim-${lead.id}`}
                                  >
                                    <UserCheck className="w-3 h-3" />
                                    Присвоить себе
                                  </Button>
                                ) : lead.assignedTo === currentUser?.id ? (
                                  <Button
                                    size="sm"
                                    onClick={() => handleConvertLead(lead.id)}
                                    disabled={convertLeadToClientMutation.isPending}
                                    className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600"
                                    data-testid={`button-convert-${lead.id}`}
                                  >
                                    <UserPlus className="w-3 h-3" />
                                    Конвертировать в клиента
                                  </Button>
                                ) : (
                                  <Badge variant="outline" className="px-2 py-1">
                                    Назначен другому менеджеру
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <Badge variant="secondary" className="px-2 py-1">
                                Только менеджеры могут управлять лидами
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        {lead.status === 'converted' && lead.clientId && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => window.open(`/clients?id=${lead.clientId}`, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Перейти к клиенту
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>Страница {currentPage} из {totalPages}</span>
                      <span>•</span>
                      <span>Всего лидов: {totalLeads}</span>
                      <span>•</span>
                      <span className="text-blue-600">Отфильтровано: {filteredLeads.length}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Назад
                      </Button>
                      
                      {/* Page numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="w-8 h-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1"
                      >
                        Вперед
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Competitors Tab */}
            <TabsContent value="competitors" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Мониторинг конкурентов</CardTitle>
                </CardHeader>
                <CardContent>
                  {competitorData.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Eye className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>Конкуренты не найдены</p>
                      <p className="text-sm mt-1">Добавьте конкурентов в настройках</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(competitorData as CompetitorData[]).map((competitor: CompetitorData) => (
                        <Card key={competitor.username} className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-orange-500 rounded-full flex items-center justify-center text-white font-semibold">
                                {competitor.username?.charAt(1)?.toUpperCase() || 'C'}
                              </div>
                              <div>
                                <p className="font-semibold">{competitor.username}</p>
                                <p className="text-sm text-gray-500">{competitor.followers.toLocaleString('ru-RU')} подписчиков</p>
                              </div>
                            </div>
                            <Badge className={`${
                              competitor.growth_rate > 5 ? 'bg-red-500' :
                              competitor.growth_rate > 0 ? 'bg-yellow-500' : 'bg-green-500'
                            } text-white`}>
                              {competitor.growth_rate > 0 ? '+' : ''}{competitor.growth_rate}% рост
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Посты</p>
                              <p className="font-semibold">{competitor.posts}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Engagement Rate</p>
                              <p className="font-semibold">{competitor.engagement_rate}%</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Ср. лайки</p>
                              <p className="font-semibold">{competitor.avg_likes}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Ср. комментарии</p>
                              <p className="font-semibold">{competitor.avg_comments}</p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Hashtags Tab */}
            <TabsContent value="hashtags" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Анализ хештегов</CardTitle>
                </CardHeader>
                <CardContent>
                  {hashtagAnalytics.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Hash className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>Данные о хештегах отсутствуют</p>
                      <p className="text-sm mt-1">Начните парсинг для получения аналитики</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(hashtagAnalytics as any[]).map((hashtag: any, index: number) => (
                        <div key={hashtag.tag} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 bg-purple-500 text-white text-xs rounded-full flex items-center justify-center">
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-semibold">{hashtag.tag}</p>
                              <p className="text-sm text-gray-500">{hashtag.posts} постов</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{hashtag.engagement}</p>
                            <p className="text-sm text-gray-500">среднее взаимодействие</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Parsing Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Настройки парсинга</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Автоматический парсинг</h4>
                        <p className="text-sm text-gray-500">Включить автоматический сбор контента</p>
                      </div>
                      <Switch 
                        checked={parsingConfig.enabled}
                        onCheckedChange={(checked) => 
                          setParsingConfig({...parsingConfig, enabled: checked})
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Интервал парсинга (секунды)</label>
                      <Input
                        type="number"
                        value={parsingConfig.interval}
                        onChange={(e) => 
                          setParsingConfig({...parsingConfig, interval: parseInt(e.target.value) || 3600})
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Минимальный Engagement Score</label>
                      <Input
                        type="number"
                        value={parsingConfig.minEngagementScore}
                        onChange={(e) => 
                          setParsingConfig({...parsingConfig, minEngagementScore: parseInt(e.target.value) || 50})
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Автосоздание лидов</h4>
                        <p className="text-sm text-gray-500">Автоматически создавать лиды из активных пользователей</p>
                      </div>
                      <Switch 
                        checked={parsingConfig.autoCreateLeads}
                        onCheckedChange={(checked) => 
                          setParsingConfig({...parsingConfig, autoCreateLeads: checked})
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Hashtags Management */}
                <Card>
                  <CardHeader>
                    <CardTitle>Управление хештегами</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Добавить хештег..."
                        value={newHashtag}
                        onChange={(e) => setNewHashtag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addHashtag()}
                      />
                      <Button onClick={addHashtag} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {parsingConfig.hashtags.map((hashtag: string) => (
                        <div key={hashtag} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span>{hashtag}</span>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => removeHashtag(hashtag)}
                            className="text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Competitors Management */}
                <Card>
                  <CardHeader>
                    <CardTitle>Управление конкурентами</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Добавить @username конкурента..."
                        value={newCompetitor}
                        onChange={(e) => setNewCompetitor(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addCompetitor()}
                      />
                      <Button onClick={addCompetitor} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {parsingConfig.competitors.map((competitor: string) => (
                        <div key={competitor} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span>{competitor}</span>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => removeCompetitor(competitor)}
                            className="text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Brand Mentions Management */}
                <Card>
                  <CardHeader>
                    <CardTitle>Упоминания бренда</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Добавить упоминание..."
                        value={newBrandMention}
                        onChange={(e) => setNewBrandMention(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addBrandMention()}
                      />
                      <Button onClick={addBrandMention} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {parsingConfig.brandMentions.map((mention: string) => (
                        <div key={mention} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span>{mention}</span>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => removeBrandMention(mention)}
                            className="text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
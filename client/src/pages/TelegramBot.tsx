import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bot, 
  Play, 
  Square, 
  Settings, 
  Users, 
  MessageSquare, 
  BarChart3,
  Shield,
  Zap,
  Globe,
  Copy,
  ExternalLink,
  Info,
  CheckCircle
} from 'lucide-react';

interface BotStatus {
  status: 'active' | 'inactive';
  initialized: boolean;
}

interface BotInfo {
  name: string;
  username: string;
  status: string;
  features: string[];
}

export default function TelegramBot() {
  const { toast } = useToast();
  const { isAdminOrDirector, canEdit } = useAuth();
  const queryClient = useQueryClient();
  const [botToken, setBotToken] = useState('');
  const [showToken, setShowToken] = useState(false);

  // Get bot status
  const { data: botStatus, isLoading: statusLoading } = useQuery<BotStatus>({
    queryKey: ['/api/telegram/status'],
    refetchInterval: 5000, // Check status every 5 seconds
  });

  // Get bot info
  const { data: botInfo } = useQuery<BotInfo>({
    queryKey: ['/api/telegram/info'],
    enabled: botStatus?.initialized,
  });

  // Initialize bot mutation
  const initBotMutation = useMutation({
    mutationFn: async (token: string) => {
      await apiRequest('POST', '/api/telegram/init', { token });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Telegram bot initialized successfully!',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/telegram/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/telegram/info'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to initialize bot. Check your token.',
        variant: 'destructive',
      });
    },
  });

  // Stop bot mutation
  const stopBotMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/telegram/stop');
    },
    onSuccess: () => {
      toast({
        title: 'Success', 
        description: 'Telegram bot stopped successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/telegram/status'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to stop bot.',
        variant: 'destructive',
      });
    },
  });


  if (!isAdminOrDirector) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Only administrators and directors can manage Telegram bot settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleInitBot = () => {
    if (!botToken.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a valid bot token.',
        variant: 'destructive',
      });
      return;
    }
    initBotMutation.mutate(botToken);
  };

  const handleStopBot = () => {
    stopBotMutation.mutate();
  };


  const copyWebhookUrl = () => {
    const webhookUrl = `${window.location.origin}/api/telegram/webhook`;
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: 'Copied',
      description: 'Webhook URL copied to clipboard.',
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Bot className="h-8 w-8 text-blue-600" />
          Telegram Bot
        </h1>
        <p className="text-gray-600">
          Manage your BeautyCRM Telegram bot for customer service and automation.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bot Status */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Bot Configuration
              </CardTitle>
              <CardDescription>
                Configure and manage your Telegram bot settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bot-token">Bot Token</Label>
                <div className="flex gap-2">
                  <Input
                    id="bot-token"
                    type={showToken ? 'text' : 'password'}
                    placeholder="Enter your Telegram bot token..."
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    data-testid="input-bot-token"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowToken(!showToken)}
                    data-testid="button-toggle-token"
                  >
                    {showToken ? 'Hide' : 'Show'}
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Get your token from{' '}
                  <a 
                    href="https://t.me/BotFather" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    @BotFather
                  </a>
                  {' '}on Telegram
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleInitBot}
                  disabled={initBotMutation.isPending || !botToken.trim()}
                  data-testid="button-init-bot"
                  className="flex items-center gap-2"
                >
                  {initBotMutation.isPending ? (
                    <Zap className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {botStatus?.initialized ? 'Restart Bot' : 'Start Bot'}
                </Button>

                {botStatus?.initialized && (
                  <Button
                    variant="destructive"
                    onClick={handleStopBot}
                    disabled={stopBotMutation.isPending}
                    data-testid="button-stop-bot"
                    className="flex items-center gap-2"
                  >
                    {stopBotMutation.isPending ? (
                      <Zap className="h-4 w-4 animate-spin" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    Stop Bot
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* User Authentication Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Аутентификация пользователей
              </CardTitle>
              <CardDescription>
                Пользователи теперь авторизуются напрямую в Telegram боте.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>📝 Процесс регистрации:</strong>
                  <br />1. Пользователь заходит в бот и использует <code>/register</code>
                  <br />2. Вводит email адрес, имя и фамилию
                  <br />3. Номер Telegram сохраняется автоматически
                  <br />4. Заявка попадает к админу/директору на одобрение
                  <br />5. После одобрения создается клиент в базе с пометкой "Telegram"
                  <br /><br />
                  <strong>🔑 Процесс входа:</strong>
                  <br />1. Одобренный пользователь использует <code>/login</code>
                  <br />2. Вводит свой email адрес
                  <br />3. Система мгновенно предоставляет доступ
                </AlertDescription>
              </Alert>

              <div className="rounded-lg bg-green-50 p-3 border border-green-200">
                <h4 className="font-medium text-green-800 mb-2">✅ Преимущества новой системы:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Полный контроль регистрации через админа</li>
                  <li>• Автоматическое создание клиентов с источником "Telegram"</li>
                  <li>• Мгновенный вход без кодов подтверждения</li>
                  <li>• Отслеживание источника leads в CRM</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Webhook Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Webhook Configuration
              </CardTitle>
              <CardDescription>
                Set up webhook URL for your bot.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={`${window.location.origin}/api/telegram/webhook`}
                    readOnly
                    className="font-mono text-sm"
                    data-testid="input-webhook-url"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyWebhookUrl}
                    data-testid="button-copy-webhook"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Use this URL to set up webhook in your bot settings.
                </p>
              </div>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Бот использует polling mode и не требует настройки webhook. Просто введите токен и запустите бота.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Bot Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Bot Features
              </CardTitle>
              <CardDescription>
                Available functionality in your Telegram bot.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    CRM Management
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• View and manage clients</li>
                    <li>• Track deals and opportunities</li>
                    <li>• Task management</li>
                    <li>• User authentication</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Analytics & AI
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Business analytics</li>
                    <li>• AI-powered responses</li>
                    <li>• Voice message processing</li>
                    <li>• Automated reports</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Communication
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Real-time notifications</li>
                    <li>• Task reminders</li>
                    <li>• Deal status updates</li>
                    <li>• Custom commands</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Security
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• User authentication</li>
                    <li>• Role-based access</li>
                    <li>• Secure data handling</li>
                    <li>• Session management</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Bot Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Status:</span>
                <Badge 
                  variant={botStatus?.status === 'active' ? 'default' : 'secondary'}
                  data-testid="badge-bot-status"
                >
                  {statusLoading ? 'Loading...' : botStatus?.status || 'Unknown'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Initialized:</span>
                <div className="flex items-center gap-1">
                  {botStatus?.initialized ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <div className="h-4 w-4 rounded-full bg-gray-300" />
                  )}
                  <span className="text-sm">
                    {botStatus?.initialized ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              {botInfo && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-medium">Bot Information</h4>
                    <div className="text-sm space-y-1">
                      <div>Name: {botInfo.name}</div>
                      <div>Username: {botInfo.username}</div>
                      <div>Features: {botInfo.features.length}</div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Commands */}
          <Card>
            <CardHeader>
              <CardTitle>Bot Commands</CardTitle>
              <CardDescription>
                Available commands for users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="font-mono">/start - Start bot</div>
                <div className="font-mono">/help - Show help</div>
                <div className="font-mono">/login - Authenticate</div>
                <div className="font-mono">/profile - User profile</div>
                <div className="font-mono">/clients - View clients</div>
                <div className="font-mono">/deals - View deals</div>
                <div className="font-mono">/tasks - View tasks</div>
                <div className="font-mono">/analytics - Statistics</div>
                <div className="font-mono">/voice - Voice assistant</div>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Setup Instructions</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="space-y-1">
                <div className="font-medium">1. Create Bot</div>
                <div className="text-gray-600">Message @BotFather on Telegram</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium">2. Get Token</div>
                <div className="text-gray-600">Copy your bot token</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium">3. Configure</div>
                <div className="text-gray-600">Enter token and start bot</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium">4. Use Bot</div>
                <div className="text-gray-600">Users authenticate with /login in Telegram</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
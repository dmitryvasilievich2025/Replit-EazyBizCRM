import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Globe, 
  Instagram, 
  Facebook, 
  Youtube, 
  Twitter, 
  Mail,
  Phone,
  MapPin,
  Shield,
  FileText,
  Bell,
  Palette,
  Globe2,
  Users,
  Clock,
  Database
} from "lucide-react";

type CompanySettings = {
  id?: string;
  companyName?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  twitter?: string;
  privacyPolicy?: string;
  termsOfService?: string;
  dataProcessing?: string;
  cookiePolicy?: string;
  emailNotifications?: boolean;
  autoSave?: boolean;
  darkTheme?: boolean;
  analytics?: boolean;
};

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<CompanySettings>({});
  const [policyDialogOpen, setPolicyDialogOpen] = useState<string | null>(null);

  // Fetch company settings
  const { data: companyData, isLoading } = useQuery({
    queryKey: ["/api/company-settings"],
    retry: false,
  });

  // Initialize form with loaded data
  useEffect(() => {
    if (companyData) {
      setSettings(companyData);
    }
  }, [companyData]);

  // Save settings mutation  
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: CompanySettings) => {
      return await apiRequest("/api/company-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Успешно сохранено",
        description: "Настройки компании обновлены",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/company-settings"] });
    },
    onError: (error) => {
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
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveSettingsMutation.mutate(settings);
  };

  const updateSetting = (key: keyof CompanySettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Apply dark theme immediately
    if (key === 'darkTheme') {
      if (value) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  // Apply dark theme on component mount
  useEffect(() => {
    if (settings.darkTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkTheme]);

  const openPolicyDialog = (policyType: string) => {
    setPolicyDialogOpen(policyType);
  };

  const getPolicyContent = (policyType: string) => {
    switch (policyType) {
      case 'privacyPolicy':
        return settings.privacyPolicy || '';
      case 'termsOfService':
        return settings.termsOfService || '';
      case 'dataProcessing':
        return settings.dataProcessing || '';
      case 'cookiePolicy':
        return settings.cookiePolicy || '';
      default:
        return '';
    }
  };

  const setPolicyContent = (policyType: string, content: string) => {
    updateSetting(policyType as keyof CompanySettings, content);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg text-gray-900 dark:text-gray-100">Загрузка настроек...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-800">
      
      <div className="flex-1 overflow-auto">
        <main className="max-w-6xl mx-auto p-8 space-y-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 bg-clip-text text-transparent">
              Настройки системы
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Управление настройками BeautyCRM</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Company Information */}
            <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <Globe className="h-5 w-5 text-purple-600" />
                  Информация о компании
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">Основные данные компании</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="company-name">Название компании</Label>
                  <Input 
                    id="company-name" 
                    placeholder="BeautyCRM Inc."
                    value={settings.companyName || ""}
                    onChange={(e) => updateSetting("companyName", e.target.value)}
                    className="mt-1"
                    data-testid="input-company-name"
                  />
                </div>
                <div>
                  <Label htmlFor="company-website">Веб-сайт</Label>
                  <Input 
                    id="company-website" 
                    placeholder="https://beautycrm.com"
                    value={settings.website || ""}
                    onChange={(e) => updateSetting("website", e.target.value)}
                    className="mt-1"
                    data-testid="input-company-website"
                  />
                </div>
                <div>
                  <Label htmlFor="company-phone">Телефон</Label>
                  <Input 
                    id="company-phone" 
                    placeholder="+90 (5XX) XXX XX XX"
                    value={settings.phone || ""}
                    onChange={(e) => updateSetting("phone", e.target.value)}
                    className="mt-1"
                    data-testid="input-company-phone"
                  />
                </div>
                <div>
                  <Label htmlFor="company-email">Email</Label>
                  <Input 
                    id="company-email" 
                    placeholder="info@beautycrm.com"
                    value={settings.email || ""}
                    onChange={(e) => updateSetting("email", e.target.value)}
                    className="mt-1"
                    data-testid="input-company-email"
                  />
                </div>
                <div>
                  <Label htmlFor="company-address">Адрес</Label>
                  <Input 
                    id="company-address" 
                    placeholder="123 Beauty Ave, New York, NY 10001"
                    value={settings.address || ""}
                    onChange={(e) => updateSetting("address", e.target.value)}
                    className="mt-1"
                    data-testid="input-company-address"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Social Media Links */}
            <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <Users className="h-5 w-5 text-pink-600" />
                  Социальные сети
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">Ссылки на страницы в социальных сетях</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="instagram" className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-pink-600" />
                    Instagram
                  </Label>
                  <Input 
                    id="instagram" 
                    placeholder="https://instagram.com/beautycrm"
                    value={settings.instagram || ""}
                    onChange={(e) => updateSetting("instagram", e.target.value)}
                    className="mt-1"
                    data-testid="input-instagram"
                  />
                </div>
                <div>
                  <Label htmlFor="facebook" className="flex items-center gap-2">
                    <Facebook className="h-4 w-4 text-blue-600" />
                    Facebook
                  </Label>
                  <Input 
                    id="facebook" 
                    placeholder="https://facebook.com/beautycrm"
                    value={settings.facebook || ""}
                    onChange={(e) => updateSetting("facebook", e.target.value)}
                    className="mt-1"
                    data-testid="input-facebook"
                  />
                </div>
                <div>
                  <Label htmlFor="youtube" className="flex items-center gap-2">
                    <Youtube className="h-4 w-4 text-red-600" />
                    YouTube
                  </Label>
                  <Input 
                    id="youtube" 
                    placeholder="https://youtube.com/@beautycrm"
                    value={settings.youtube || ""}
                    onChange={(e) => updateSetting("youtube", e.target.value)}
                    className="mt-1"
                    data-testid="input-youtube"
                  />
                </div>
                <div>
                  <Label htmlFor="twitter" className="flex items-center gap-2">
                    <Twitter className="h-4 w-4 text-blue-400" />
                    Twitter/X
                  </Label>
                  <Input 
                    id="twitter" 
                    placeholder="https://x.com/beautycrm"
                    value={settings.twitter || ""}
                    onChange={(e) => updateSetting("twitter", e.target.value)}
                    className="mt-1"
                    data-testid="input-twitter"
                  />
                </div>
              </CardContent>
            </Card>

            {/* System Settings */}
            <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <Database className="h-5 w-5 text-blue-600" />
                  Настройки системы
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">Основные настройки CRM системы</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base text-gray-900 dark:text-gray-100">Уведомления по email</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Получать уведомления на почту</p>
                  </div>
                  <Switch 
                    checked={settings.emailNotifications ?? true}
                    onCheckedChange={(checked) => updateSetting("emailNotifications", checked)}
                    data-testid="switch-email-notifications" 
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base text-gray-900 dark:text-gray-100">Автосохранение</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Автоматически сохранять изменения</p>
                  </div>
                  <Switch 
                    checked={settings.autoSave ?? true}
                    onCheckedChange={(checked) => updateSetting("autoSave", checked)}
                    data-testid="switch-autosave" 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base text-gray-900 dark:text-gray-100">Темная тема</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Переключение в темный режим</p>
                  </div>
                  <Switch 
                    checked={settings.darkTheme ?? false}
                    onCheckedChange={(checked) => updateSetting("darkTheme", checked)}
                    data-testid="switch-dark-theme" 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base text-gray-900 dark:text-gray-100">Аналитика</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Сбор данных для улучшения сервиса</p>
                  </div>
                  <Switch 
                    checked={settings.analytics ?? true}
                    onCheckedChange={(checked) => updateSetting("analytics", checked)}
                    data-testid="switch-analytics" 
                  />
                </div>
              </CardContent>
            </Card>

            {/* Policies and Legal */}
            <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <Shield className="h-5 w-5 text-green-600" />
                  Политики и документы
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">Правовая информация и политики</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Dialog open={policyDialogOpen === 'privacyPolicy'} onOpenChange={() => setPolicyDialogOpen(null)}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => openPolicyDialog('privacyPolicy')}
                      data-testid="button-privacy-policy"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Политика конфиденциальности
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-describedby="privacy-policy-description">
                    <DialogHeader>
                      <DialogTitle>Политика конфиденциальности</DialogTitle>
                      <DialogDescription id="privacy-policy-description">Настройте политику конфиденциальности вашей компании</DialogDescription>
                    </DialogHeader>
                    <Textarea
                      value={getPolicyContent('privacyPolicy')}
                      onChange={(e) => setPolicyContent('privacyPolicy', e.target.value)}
                      placeholder="Введите текст политики конфиденциальности..."
                      className="min-h-[400px]"
                    />
                  </DialogContent>
                </Dialog>
                
                <Dialog open={policyDialogOpen === 'termsOfService'} onOpenChange={() => setPolicyDialogOpen(null)}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => openPolicyDialog('termsOfService')}
                      data-testid="button-terms-of-service"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Условия использования
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-describedby="terms-description">
                    <DialogHeader>
                      <DialogTitle>Условия использования</DialogTitle>
                      <DialogDescription id="terms-description">Настройте условия использования вашего сервиса</DialogDescription>
                    </DialogHeader>
                    <Textarea
                      value={getPolicyContent('termsOfService')}
                      onChange={(e) => setPolicyContent('termsOfService', e.target.value)}
                      placeholder="Введите текст условий использования..."
                      className="min-h-[400px]"
                    />
                  </DialogContent>
                </Dialog>
                
                <Dialog open={policyDialogOpen === 'dataProcessing'} onOpenChange={() => setPolicyDialogOpen(null)}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => openPolicyDialog('dataProcessing')}
                      data-testid="button-data-processing"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Согласие на обработку данных
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-describedby="data-processing-description">
                    <DialogHeader>
                      <DialogTitle>Согласие на обработку данных</DialogTitle>
                      <DialogDescription id="data-processing-description">Настройте текст согласия на обработку персональных данных</DialogDescription>
                    </DialogHeader>
                    <Textarea
                      value={getPolicyContent('dataProcessing')}
                      onChange={(e) => setPolicyContent('dataProcessing', e.target.value)}
                      placeholder="Введите текст согласия на обработку данных..."
                      className="min-h-[400px]"
                    />
                  </DialogContent>
                </Dialog>
                
                <Dialog open={policyDialogOpen === 'cookiePolicy'} onOpenChange={() => setPolicyDialogOpen(null)}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => openPolicyDialog('cookiePolicy')}
                      data-testid="button-cookie-policy"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Политика cookies
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-describedby="cookie-policy-description">
                    <DialogHeader>
                      <DialogTitle>Политика cookies</DialogTitle>
                      <DialogDescription id="cookie-policy-description">Настройте политику использования файлов cookies</DialogDescription>
                    </DialogHeader>
                    <Textarea
                      value={getPolicyContent('cookiePolicy')}
                      onChange={(e) => setPolicyContent('cookiePolicy', e.target.value)}
                      placeholder="Введите текст политики cookies..."
                      className="min-h-[400px]"
                    />
                  </DialogContent>
                </Dialog>

                <Separator className="my-4" />

                <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
                  <div>Версия системы: <Badge variant="secondary">v2.1.0</Badge></div>
                  <div>Последнее обновление: 19 августа 2025</div>
                  <div>Лицензия: Коммерческая</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Mail className="h-5 w-5 text-purple-600" />
                Контактная информация
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">Как с нами связаться</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50">
                <Phone className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold text-purple-900 dark:text-purple-100">Support Phone</h3>
                <p className="text-purple-700 dark:text-purple-300">+1 (555) 123-4567</p>
                <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">Mon-Fri: 9:00-18:00</p>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-pink-100 to-blue-100 dark:from-pink-900/50 dark:to-blue-900/50">
                <Mail className="h-8 w-8 text-pink-600 mx-auto mb-2" />
                <h3 className="font-semibold text-pink-900 dark:text-pink-100">Email Support</h3>
                <p className="text-pink-700 dark:text-pink-300">support@beautycrm.com</p>
                <p className="text-sm text-pink-600 dark:text-pink-400 mt-1">Reply within 24 hours</p>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50">
                <MapPin className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Office</h3>
                <p className="text-blue-700 dark:text-blue-300">123 Beauty Ave, New York</p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">Suite 456, 10th Floor</p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-center pt-4">
            <Button 
              size="lg" 
              onClick={handleSave}
              disabled={saveSettingsMutation.isPending}
              className="bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 hover:from-purple-700 hover:via-pink-600 hover:to-blue-600 text-white px-8"
              data-testid="button-save-settings"
            >
              {saveSettingsMutation.isPending ? "Сохранение..." : "Сохранить настройки"}
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
}
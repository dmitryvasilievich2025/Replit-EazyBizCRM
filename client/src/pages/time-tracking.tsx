import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Clock, 
  Play, 
  Pause, 
  Calendar as CalendarIcon,
  BarChart3,
  TrendingUp,
  Timer,
  CheckCircle,
  AlertCircle,
  LogOut,
  ChevronDown
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isToday } from "date-fns";

export default function TimeTracking() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isTracking, setIsTracking] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("today");

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

  // Calculate date range based on selection
  const getDateRange = () => {
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (timeRange) {
      case "today":
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        break;
      case "week":
        startDate = startOfWeek(today);
        endDate = endOfWeek(today);
        break;
      case "month":
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        break;
      case "selected":
        startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59);
        break;
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  // Fetch work sessions
  const { data: workSessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["/api/work-sessions", `?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`],
    retry: false,
    enabled: isAuthenticated,
  });

  // Start work session mutation
  const startSessionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/work-sessions/start");
    },
    onSuccess: (session) => {
      setIsTracking(true);
      setCurrentSessionId(session.id);
      toast({
        title: "Work session started",
        description: "Time tracking is now active",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/work-sessions"] });
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
        description: "Failed to start work session",
        variant: "destructive",
      });
    },
  });

  // End work session mutation
  const endSessionMutation = useMutation({
    mutationFn: async () => {
      if (!currentSessionId) throw new Error("No active session");
      return await apiRequest("POST", `/api/work-sessions/${currentSessionId}/end`);
    },
    onSuccess: () => {
      setIsTracking(false);
      setCurrentSessionId(null);
      toast({
        title: "Work session ended",
        description: "Time tracking has been stopped",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/work-sessions"] });
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
        description: "Failed to end work session",
        variant: "destructive",
      });
    },
  });

  // Check if there's an active session on load
  useEffect(() => {
    const sessions = workSessions as any[] || [];
    const activeSession = sessions.find((session: any) => !session.logoutTime);
    if (activeSession) {
      setIsTracking(true);
      setCurrentSessionId(activeSession.id);
    }
  }, [workSessions]);

  const handleStartTracking = () => {
    startSessionMutation.mutate();
  };

  const handleStopTracking = () => {
    endSessionMutation.mutate();
  };

  // Calculate statistics
  const sessions = workSessions as any[] || [];
  const totalMinutes = sessions.reduce((sum: number, session: any) => sum + (session.totalMinutes || 0), 0);
  const totalHours = totalMinutes / 60;
  const averageSession = sessions.length > 0 ? totalMinutes / sessions.length : 0;
  const completedSessions = sessions.filter((session: any) => session.logoutTime).length;

  // Format time display
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Group sessions by date
  const sessionsByDate = sessions.reduce((acc: any, session: any) => {
    const date = new Date(session.date).toDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(session);
    return acc;
  }, {});

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
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* User Welcome Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-charcoal mb-2">
                Добро пожаловать, {user?.firstName || 'Пользователь'}!
              </h1>
              <div className="flex items-center gap-4">
                <p className="text-gray-600">
                  {user?.email && 'Менеджер по красоте'} • Система учета времени
                </p>
              </div>
            </div>
            
            {/* User Profile Dropdown */}
            <div className="flex items-center gap-4">
              {/* Time Controls */}
              <div className="flex items-center gap-3">
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-40" data-testid="select-time-range">
                    <SelectValue placeholder="Time Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="selected">Selected Date</SelectItem>
                  </SelectContent>
                </Select>

                {timeRange === "selected" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-60" data-testid="button-date-picker">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {format(selectedDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}

                <Button
                  onClick={isTracking ? handleStopTracking : handleStartTracking}
                  disabled={startSessionMutation.isPending || endSessionMutation.isPending}
                  className={`${
                    isTracking 
                      ? "bg-red-600 hover:bg-red-700" 
                      : "bg-gradient-to-r from-rose-gold to-deep-rose"
                  } text-white`}
                  data-testid="button-toggle-tracking"
                >
                  {isTracking ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Stop Tracking
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start Tracking
                    </>
                  )}
                </Button>
              </div>
              
              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100" data-testid="button-user-menu">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-gradient-to-r from-rose-gold to-deep-rose text-white text-sm">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <div className="text-sm font-medium">{user?.firstName} {user?.lastName}</div>
                      <div className="text-xs text-gray-500">{user?.email}</div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem 
                    onClick={() => window.location.href = "/api/logout"} 
                    className="text-red-600 focus:text-red-600"
                    data-testid="button-logout"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Выйти из системы
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {/* Current Status */}
          <Card className={isTracking ? "bg-green-50 border-green-200" : ""}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    isTracking ? "bg-green-100" : "bg-gray-100"
                  }`}>
                    <Timer className={`w-6 h-6 ${isTracking ? "text-green-600" : "text-gray-500"}`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-charcoal" data-testid="text-tracking-status">
                      {isTracking ? "Currently Tracking" : "Not Tracking"}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {isTracking 
                        ? "Work session is active" 
                        : "Start tracking to monitor your work time"
                      }
                    </p>
                  </div>
                </div>
                
                {isTracking && (
                  <div className="flex items-center space-x-2 bg-green-100 px-4 py-2 rounded-lg">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-700" data-testid="text-live-timer">
                      Live: {formatTime(Math.floor((Date.now() - new Date().setHours(0,0,0,0)) / 60000))}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Hours</p>
                    <p className="text-3xl font-bold text-charcoal mt-2" data-testid="text-total-hours">
                      {totalHours.toFixed(1)}h
                    </p>
                    <p className="text-sm text-green-600 mt-1 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +15% vs last period
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Sessions</p>
                    <p className="text-3xl font-bold text-charcoal mt-2" data-testid="text-total-sessions">
                      {sessions.length}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {completedSessions} completed
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Session</p>
                    <p className="text-3xl font-bold text-charcoal mt-2" data-testid="text-avg-session">
                      {formatTime(Math.round(averageSession))}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      per session
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Daily Goal</p>
                    <p className="text-3xl font-bold text-charcoal mt-2" data-testid="text-daily-goal">
                      {timeRange === "today" ? Math.round((totalHours / 8) * 100) : 0}%
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      of 8 hours
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sessions Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-charcoal">
                Work Sessions
                {timeRange === "today" && " - Today"}
                {timeRange === "week" && " - This Week"}
                {timeRange === "month" && " - This Month"}
                {timeRange === "selected" && ` - ${format(selectedDate, "PPP")}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : Object.keys(sessionsByDate).length === 0 ? (
                <div className="text-center py-12" data-testid="text-no-sessions">
                  <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No work sessions</h3>
                  <p className="text-gray-500 mb-4">
                    No work sessions recorded for the selected period
                  </p>
                  <Button 
                    onClick={handleStartTracking}
                    disabled={isTracking}
                    className="bg-gradient-to-r from-rose-gold to-deep-rose text-white"
                    data-testid="button-start-first-session"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Your First Session
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(sessionsByDate)
                    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                    .map(([date, sessions]: [string, any]) => {
                      const dailyTotal = sessions.reduce((sum: number, session: any) => sum + (session.totalMinutes || 0), 0);
                      
                      return (
                        <div key={date} data-testid={`session-group-${date}`}>
                          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
                            <h4 className="font-medium text-charcoal">
                              {isToday(new Date(date)) ? "Today" : format(new Date(date), "EEEE, MMMM d")}
                            </h4>
                            <Badge variant="secondary" className="bg-gray-100" data-testid={`text-daily-total-${date}`}>
                              {formatTime(dailyTotal)}
                            </Badge>
                          </div>
                          
                          <div className="space-y-3">
                            {sessions.map((session: any) => (
                              <div 
                                key={session.id} 
                                className={`flex items-center justify-between p-4 rounded-lg border ${
                                  !session.logoutTime ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                                }`}
                                data-testid={`session-${session.id}`}
                              >
                                <div className="flex items-center space-x-4">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                    !session.logoutTime ? "bg-green-100" : "bg-gray-100"
                                  }`}>
                                    <Clock className={`w-5 h-5 ${
                                      !session.logoutTime ? "text-green-600" : "text-gray-500"
                                    }`} />
                                  </div>
                                  <div>
                                    <p className="font-medium text-charcoal" data-testid={`text-session-time-${session.id}`}>
                                      {format(new Date(session.loginTime), "h:mm a")} - {
                                        session.logoutTime 
                                          ? format(new Date(session.logoutTime), "h:mm a")
                                          : "In Progress"
                                      }
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      Duration: {session.totalMinutes ? formatTime(session.totalMinutes) : "Ongoing"}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="text-right">
                                  <Badge 
                                    variant={!session.logoutTime ? "default" : "secondary"}
                                    className={!session.logoutTime ? "bg-green-600" : ""}
                                    data-testid={`badge-session-status-${session.id}`}
                                  >
                                    {!session.logoutTime ? "Active" : "Completed"}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

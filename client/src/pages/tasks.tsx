import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import TaskForm from "@/components/task-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Calendar,
  Clock,
  AlertTriangle,
  MoreHorizontal,
  Edit,
  Trash2,
  User,
  Building,
  HandHeart
} from "lucide-react";

export default function Tasks() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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

  // Fetch tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Fetch clients for the form
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Fetch deals for the form
  const { data: deals = [] } = useQuery({
    queryKey: ["/api/deals"],
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
  const canManageTask = (task: any) => {
    if (!user) return false;
    const isAdminOrDirector = user.role === 'admin' || user.role === 'director';
    const isOwnTask = task.assignedTo === currentEmployee?.id;
    return isAdminOrDirector || isOwnTask;
  };

  const canViewAllTasks = () => {
    return user?.role === 'admin' || user?.role === 'director';
  };

  // Update task status mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: any }) => {
      await apiRequest("PATCH", `/api/tasks/${taskId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
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
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
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
        description: "Failed to delete task",
        variant: "destructive",
      });
    },
  });

  const handleEditTask = (task: any) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingTask(null);
  };

  const handleTaskComplete = (taskId: string, completed: boolean) => {
    const status = completed ? 'completed' : 'open';
    updateTaskMutation.mutate({ 
      taskId, 
      data: { 
        status,
        completedAt: completed ? new Date().toISOString() : null
      } 
    });
  };

  // РОЛЕВАЯ ПОЛИТИКА: Фильтруем задачи по правам доступа
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    let taskArray = tasks as any[];
    
    // Админ/директор видят все задачи, остальные только свои
    if (!canViewAllTasks()) {
      taskArray = taskArray.filter((task: any) => task.assignedTo === currentEmployee?.id);
    }
    
    return taskArray.filter((task: any) => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, searchTerm, statusFilter, priorityFilter, currentEmployee?.id, user?.role]);

  // Group tasks by different business logic principles
  const groupedTasks = {
    byPriority: {
      urgent: filteredTasks.filter((t: any) => t.priority === 'urgent' && t.status !== 'completed'),
      high: filteredTasks.filter((t: any) => t.priority === 'high' && t.status !== 'completed'),
      medium: filteredTasks.filter((t: any) => t.priority === 'medium' && t.status !== 'completed'),
      low: filteredTasks.filter((t: any) => t.priority === 'low' && t.status !== 'completed')
    },
    byDeadline: {
      overdue: filteredTasks.filter((t: any) => {
        if (!t.dueDate || t.status === 'completed') return false;
        return new Date(t.dueDate) < new Date();
      }),
      today: filteredTasks.filter((t: any) => {
        if (!t.dueDate || t.status === 'completed') return false;
        const today = new Date();
        const dueDate = new Date(t.dueDate);
        return dueDate.toDateString() === today.toDateString();
      }),
      thisWeek: filteredTasks.filter((t: any) => {
        if (!t.dueDate || t.status === 'completed') return false;
        const today = new Date();
        const weekFromNow = new Date();
        weekFromNow.setDate(today.getDate() + 7);
        const dueDate = new Date(t.dueDate);
        return dueDate > today && dueDate <= weekFromNow;
      }),
      future: filteredTasks.filter((t: any) => {
        if (!t.dueDate || t.status === 'completed') return false;
        const weekFromNow = new Date();
        weekFromNow.setDate(new Date().getDate() + 7);
        return new Date(t.dueDate) > weekFromNow;
      }),
      noDueDate: filteredTasks.filter((t: any) => !t.dueDate && t.status !== 'completed')
    },
    byStatus: {
      open: filteredTasks.filter((t: any) => t.status === 'open'),
      inProgress: filteredTasks.filter((t: any) => t.status === 'in_progress'),
      completed: filteredTasks.filter((t: any) => t.status === 'completed')
    }
  };

  // Sort tasks: overdue first, then by due date, then by priority
  const sortedTasks = filteredTasks.sort((a: any, b: any) => {
    const now = new Date();
    const aDue = a.dueDate ? new Date(a.dueDate) : null;
    const bDue = b.dueDate ? new Date(b.dueDate) : null;
    
    // Check if overdue
    const aOverdue = aDue && aDue < now && a.status !== 'completed';
    const bOverdue = bDue && bDue < now && b.status !== 'completed';
    
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    
    // Sort by due date
    if (aDue && bDue) return aDue.getTime() - bDue.getTime();
    if (aDue && !bDue) return -1;
    if (!aDue && bDue) return 1;
    
    // Sort by priority
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
  });

  const getStatusColor = (task: any) => {
    const now = new Date();
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const isOverdue = dueDate && dueDate < now && task.status !== 'completed';
    
    if (task.status === 'completed') return 'bg-green-100 text-green-800';
    if (isOverdue) return 'bg-red-100 text-red-800';
    if (task.status === 'in_progress') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
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
    return (clients as any[])?.find((client: any) => client.id === clientId);
  };

  const getDeal = (dealId: string) => {
    return (deals as any[])?.find((deal: any) => deal.id === dealId);
  };

  const isOverdue = (task: any) => {
    const now = new Date();
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    return dueDate && dueDate < now && task.status !== 'completed';
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
              <h2 className="text-2xl font-bold text-charcoal" data-testid="text-tasks-title">Tasks</h2>
              <p className="text-sm text-gray-500">Manage your to-do list and follow-ups</p>
            </div>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-gradient-to-r from-rose-gold to-deep-rose text-white hover:shadow-md transition-shadow"
                  data-testid="button-add-task"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingTask ? 'Edit Task' : `Add Task for ${currentEmployeeName}`}</DialogTitle>
                  <DialogDescription>
                    {editingTask ? 'Update task details and track completion progress.' : 'Create a new task and assign it to team members for better workflow management.'}
                  </DialogDescription>
                </DialogHeader>
                <TaskForm 
                  task={editingTask} 
                  clients={clients as any[] || []}
                  deals={deals as any[] || []}
                  onSuccess={handleFormClose}
                  onCancel={handleFormClose}
                />
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          
          {/* Task Management Dashboard */}
          <div className="space-y-6 mb-8">
            
            {/* Priority Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(groupedTasks.byPriority).map(([priority, priorityTasks]) => {
                const priorityColors = {
                  urgent: 'bg-red-100 border-red-300 text-red-800',
                  high: 'bg-orange-100 border-orange-300 text-orange-800',
                  medium: 'bg-yellow-100 border-yellow-300 text-yellow-800',
                  low: 'bg-gray-100 border-gray-300 text-gray-800'
                };
                const priorityNames = {
                  urgent: 'Urgent',
                  high: 'High',
                  medium: 'Medium',
                  low: 'Low'
                };
                
                return (
                  <div key={priority} className={`p-4 rounded-lg border-2 ${priorityColors[priority as keyof typeof priorityColors]}`}>
                    <div className="text-sm font-semibold">{priorityNames[priority as keyof typeof priorityNames]}</div>
                    <div className="text-2xl font-bold">{(priorityTasks as any[]).length}</div>
                    <div className="text-xs opacity-80">active tasks</div>
                  </div>
                );
              })}
            </div>

            {/* Deadline Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Overdue Tasks */}
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-800 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Overdue ({groupedTasks.byDeadline.overdue.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {groupedTasks.byDeadline.overdue.slice(0, 5).map((task: any) => (
                      <div key={task.id} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div>
                          <div className="font-medium text-sm">{task.title}</div>
                          <div className="text-xs text-red-600">
                            Due: {task.dueDate && new Date(task.dueDate).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge className={`${getPriorityColor(task.priority)} text-xs`}>
                          {task.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Today's Tasks */}
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-orange-800 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Today ({groupedTasks.byDeadline.today.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {groupedTasks.byDeadline.today.slice(0, 5).map((task: any) => (
                      <div key={task.id} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div>
                          <div className="font-medium text-sm">{task.title}</div>
                          <div className="text-xs text-orange-600">End of day</div>
                        </div>
                        <Badge className={`${getPriorityColor(task.priority)} text-xs`}>
                          {task.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* This Week Tasks */}
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-800 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    This Week ({groupedTasks.byDeadline.thisWeek.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {groupedTasks.byDeadline.thisWeek.slice(0, 5).map((task: any) => (
                      <div key={task.id} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div>
                          <div className="font-medium text-sm">{task.title}</div>
                          <div className="text-xs text-blue-600">
                            Due: {task.dueDate && new Date(task.dueDate).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge className={`${getPriorityColor(task.priority)} text-xs`}>
                          {task.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Status Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(groupedTasks.byStatus).map(([status, statusTasks]) => {
                const statusColors = {
                  open: 'bg-blue-100 text-blue-800',
                  inProgress: 'bg-orange-100 text-orange-800',
                  completed: 'bg-green-100 text-green-800'
                };
                const statusNames = {
                  open: 'Open',
                  inProgress: 'In Progress',
                  completed: 'Completed'
                };
                
                return (
                  <div key={status} className="p-4 rounded-lg bg-gray-50 text-center">
                    <div className="text-sm font-medium text-gray-700">{statusNames[status as keyof typeof statusNames]}</div>
                    <div className="text-2xl font-bold mt-1 mb-2">{(statusTasks as any[]).length}</div>
                    <Badge className={`${statusColors[status as keyof typeof statusColors]}`}>
                      {Math.round(((statusTasks as any[]).length / filteredTasks.length) * 100)}% of total
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-tasks"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40" data-testid="select-status-filter">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
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

          {/* Tasks List */}
          {tasksLoading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-5 h-5 bg-gray-200 rounded"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="flex space-x-2">
                          <div className="h-6 bg-gray-200 rounded w-16"></div>
                          <div className="h-6 bg-gray-200 rounded w-20"></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : sortedTasks.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2" data-testid="text-no-tasks">
                  {searchTerm || statusFilter !== "all" || priorityFilter !== "all" 
                    ? "No tasks match your filters" 
                    : "No tasks yet"
                  }
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                    ? "Try adjusting your search criteria"
                    : "Stay organized by creating your first task"
                  }
                </p>
                {!searchTerm && statusFilter === "all" && priorityFilter === "all" && (
                  <Button 
                    onClick={() => setIsFormOpen(true)}
                    className="bg-gradient-to-r from-rose-gold to-deep-rose text-white"
                    data-testid="button-add-first-task"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Task
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedTasks.map((task: any) => {
                const client = getClient(task.clientId);
                const deal = getDeal(task.dealId);
                
                return (
                  <Card 
                    key={task.id} 
                    className={`hover:shadow-md transition-shadow cursor-pointer ${
                      isOverdue(task) ? 'border-l-4 border-red-500 bg-red-50/30' : ''
                    }`}
                    onClick={() => handleEditTask(task)}
                    data-testid={`card-task-${task.id}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <Checkbox
                          checked={task.status === 'completed'}
                          onCheckedChange={(checked) => handleTaskComplete(task.id, !!checked)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                          data-testid={`checkbox-task-${task.id}`}
                        />
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className={`font-semibold text-charcoal ${
                              task.status === 'completed' ? 'line-through text-gray-500' : ''
                            }`} data-testid={`text-task-title-${task.id}`}>
                              {isOverdue(task) && <AlertTriangle className="w-4 h-4 text-red-500 inline mr-2" />}
                              {task.title}
                            </h3>
                            
                            {/* РОЛЕВАЯ ПОЛИТИКА: Показываем кнопки только тем кто может управлять задачей */}
                            {canManageTask(task) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={(e) => e.stopPropagation()}
                                    data-testid={`button-task-menu-${task.id}`}
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditTask(task)} data-testid={`button-edit-task-${task.id}`}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="text-red-600"
                                    data-testid={`button-delete-task-${task.id}`}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>

                          {task.description && (
                            <p className="text-gray-600 mb-3" data-testid={`text-task-description-${task.id}`}>
                              {task.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge className={getStatusColor(task)} data-testid={`badge-task-status-${task.id}`}>
                              {isOverdue(task) ? 'Overdue' : task.status.replace('_', ' ')}
                            </Badge>
                            
                            <Badge className={getPriorityColor(task.priority)} data-testid={`badge-task-priority-${task.id}`}>
                              {task.priority}
                            </Badge>

                            {task.dueDate && (
                              <div className={`flex items-center text-xs px-2 py-1 rounded ${
                                isOverdue(task) ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                              }`}>
                                <Calendar className="w-3 h-3 mr-1" />
                                <span data-testid={`text-task-due-date-${task.id}`}>
                                  Due {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            {client && (
                              <div className="flex items-center">
                                <User className="w-4 h-4 mr-1" />
                                <span data-testid={`text-task-client-${task.id}`}>{client.name}</span>
                              </div>
                            )}
                            
                            {deal && (
                              <div className="flex items-center">
                                <HandHeart className="w-4 h-4 mr-1" />
                                <span data-testid={`text-task-deal-${task.id}`}>{deal.title}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              <span data-testid={`text-task-created-${task.id}`}>
                                Created {new Date(task.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          {task.notes && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-600" data-testid={`text-task-notes-${task.id}`}>
                                <strong>Notes:</strong> {task.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

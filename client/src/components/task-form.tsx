import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { insertTaskSchema, type Employee } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, User } from "lucide-react";
import { ClientSelectWithAdd } from "./client-select-with-add";
import { DealSelectWithAdd } from "./deal-select-with-add";
import { EmployeeSelectWithAdd } from "./employee-select-with-add";

const taskFormSchema = insertTaskSchema.extend({
  dueDate: z.string().optional(),
  reminderDate: z.string().optional(),
  assignedTo: z.string().optional(),
}).omit({ 
  createdBy: true,
  createdAt: true, 
  updatedAt: true,
  completedAt: true
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  task?: any;
  clients: any[];
  deals: any[];
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TaskForm({ task, clients, deals, onSuccess, onCancel }: TaskFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  
  // Get current user info - same as in client form
  const { data: currentUser } = useQuery<{ id: string; email: string; firstName?: string; lastName?: string; role?: string }>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });
  
  // Get current user's employee data
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });
  
  // Find current user's employee record
  const currentEmployee = employees.find(emp => emp.userId === user?.id);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task?.title || "",
      description: task?.description || "",
      clientId: task?.clientId || null,
      dealId: task?.dealId || null,
      status: task?.status || "open",
      priority: task?.priority || "medium",
      notes: task?.notes || "",
      dueDate: task?.dueDate ? new Date(task.dueDate).toLocaleDateString('en-GB') : "",
      reminderDate: task?.reminderDate ? new Date(task.reminderDate).toLocaleDateString('en-GB') : "",
      assignedTo: task?.assignedTo || "",
    },
  });

  // Auto-fill assignedTo with current employee when creating new task
  useEffect(() => {
    if (!task && currentEmployee && !form.getValues('assignedTo')) {
      form.setValue('assignedTo', currentEmployee.id);
    }
  }, [currentEmployee, task, form]);

  // Create/update task mutation
  const taskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      setIsSubmitting(true);
      
      // Helper function to convert DD.MM.YYYY to ISO string
      const convertDateString = (dateStr: string) => {
        if (!dateStr) return null;
        const parts = dateStr.split('.');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toISOString();
        }
        return null;
      };
      
      const taskData = {
        ...data,
        dueDate: convertDateString(data.dueDate || "") ? new Date(convertDateString(data.dueDate || "")!) : null,
        reminderDate: convertDateString(data.reminderDate || "") ? new Date(convertDateString(data.reminderDate || "")!) : null,
        // Add current user as creator for new tasks
        ...(user && !task ? { createdBy: user.id } : {}),
      };

      if (task) {
        await apiRequest("PATCH", `/api/tasks/${task.id}`, taskData);
      } else {
        await apiRequest("POST", "/api/tasks", taskData);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: task ? "Task updated successfully" : "Task created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      onSuccess();
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
        description: task ? "Failed to update task" : "Failed to create task",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: TaskFormData) => {
    taskMutation.mutate(data);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4">
        {/* Beautiful User Info Header with Loading */}
        {currentUser ? (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 border border-emerald-200 dark:border-gray-600 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {currentUser.firstName?.charAt(0) || currentUser.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                    {currentUser.firstName && currentUser.lastName 
                      ? `${currentUser.firstName} ${currentUser.lastName}`
                      : currentUser.email
                    }
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                      {currentUser.role || 'user'}
                    </span>
                    {task?.createdBy && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Создатель записи
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {task ? '✏️ Редактирование задачи' : '📝 Создание новой задачи'}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {new Date().toLocaleDateString('ru-RU')} • {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 border border-emerald-200 dark:border-gray-600 shadow-sm animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                <div>
                  <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-2"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
                </div>
              </div>
              <div className="text-right">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24 mb-1"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
              </div>
            </div>
          </div>
        )}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="label-task-title">Task Title *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Follow up with client about skincare consultation" 
                    {...field}
                    data-testid="input-task-title"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
            <FormItem>
              <FormLabel data-testid="label-task-description">Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe what needs to be done..."
                  className="min-h-[100px]"
                  {...field}
                  value={field.value || ""}
                  data-testid="textarea-task-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="assignedTo"
          render={({ field }) => (
            <FormItem>
              <FormLabel data-testid="label-task-assigned">Assigned To</FormLabel>
              <FormControl>
                <EmployeeSelectWithAdd
                  value={field.value || ""}
                  onValueChange={field.onChange}
                  placeholder="Select an employee"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="label-task-client">Related Client</FormLabel>
                <FormControl>
                  <ClientSelectWithAdd
                    value={field.value || ""}
                    onValueChange={(value) => field.onChange(value === "" ? null : value)}
                    placeholder="Select a client (optional)"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dealId"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="label-task-deal">Related Deal</FormLabel>
                <FormControl>
                  <DealSelectWithAdd
                    value={field.value || ""}
                    onValueChange={(value) => field.onChange(value === "" ? null : value)}
                    placeholder="Select a deal (optional)"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="label-task-priority">Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger data-testid="select-task-priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="label-task-status">Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger data-testid="select-task-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="label-task-due-date">Due Date</FormLabel>
                <FormControl>
                  <Input
                    placeholder="dd.mm.yyyy"
                    {...field}
                    data-testid="input-task-due-date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reminderDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="label-task-reminder-date">Reminder Date</FormLabel>
                <FormControl>
                  <Input
                    placeholder="dd.mm.yyyy"
                    {...field}
                    data-testid="input-task-reminder-date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>


        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel data-testid="label-task-notes">Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Add any additional notes or instructions..."
                  className="min-h-[80px]"
                  {...field}
                  value={field.value || ""}
                  data-testid="textarea-task-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-6 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
            data-testid="button-cancel-task"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-gradient-to-r from-rose-gold to-deep-rose text-white"
            data-testid="button-save-task"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {task ? "Update Task" : "Create Task"}
          </Button>
        </div>
        </form>
      </Form>
    </div>
  );
}

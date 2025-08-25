import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { insertDealSchema, type Employee } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, User } from "lucide-react";
import { ClientSelectWithAdd } from "./client-select-with-add";
import { EmployeeSelectWithAdd } from "./employee-select-with-add";

const dealFormSchema = insertDealSchema.extend({
  tags: z.string().optional(),
  value: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  assignedTo: z.string().optional(),
}).omit({ createdBy: true, createdAt: true, updatedAt: true });

type DealFormData = z.infer<typeof dealFormSchema>;

interface DealFormProps {
  deal?: any;
  clients: any[];
  onSuccess: () => void;
  onCancel: () => void;
}

export default function DealForm({ deal, clients, onSuccess, onCancel }: DealFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { canEdit, isDemo, user } = useAuth();
  
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

  const form = useForm<DealFormData>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      title: deal?.title || "",
      description: deal?.description || "",
      clientId: deal?.clientId || "",
      value: deal?.value ? deal.value.toString() : "",
      stage: deal?.stage || "new",
      priority: deal?.priority || "medium",
      probability: deal?.probability || 0,
      notes: deal?.notes || "",
      tags: deal?.tags ? deal.tags.join(", ") : "",
      expectedCloseDate: deal?.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString('en-GB') : "",
      assignedTo: deal?.assignedTo || "",
    },
  });

  // Auto-fill assignedTo with current employee when creating new deal
  useEffect(() => {
    if (!deal && currentEmployee && !form.getValues('assignedTo')) {
      form.setValue('assignedTo', currentEmployee.id);
    }
  }, [currentEmployee, deal, form]);

  // Create/update deal mutation
  const dealMutation = useMutation({
    mutationFn: async (data: DealFormData) => {
      if (isDemo || !canEdit) {
        throw new Error('Demo users can only view data. Contact admin for edit access.');
      }
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
      
      const dealData = {
        ...data,
        value: data.value || null,
        tags: data.tags ? data.tags.split(",").map(tag => tag.trim()).filter(Boolean) : [],
        expectedCloseDate: convertDateString(data.expectedCloseDate || "") ? new Date(convertDateString(data.expectedCloseDate || "")!) : null,
        // Add current user as creator for new deals
        ...(user && !deal ? { createdBy: user.id } : {}),
      };

      if (deal) {
        await apiRequest("PATCH", `/api/deals/${deal.id}`, dealData);
      } else {
        await apiRequest("POST", "/api/deals", dealData);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: deal ? "Deal updated successfully" : "Deal created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
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
        description: deal ? "Failed to update deal" : "Failed to create deal",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: DealFormData) => {
    dealMutation.mutate(data);
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
                    {deal?.createdBy && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Создатель записи
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {deal ? '✏️ Редактирование дела' : '💼 Создание нового дела'}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                <FormLabel data-testid="label-deal-title">Deal Title *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Beauty service package" 
                    {...field}
                    data-testid="input-deal-title"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                <FormLabel data-testid="label-deal-client">Client *</FormLabel>
                <FormControl>
                  <ClientSelectWithAdd
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select a client"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          </div>

          <FormField
            control={form.control}
            name="assignedTo"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="label-deal-assigned">Assigned To</FormLabel>
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                <FormLabel data-testid="label-deal-value">Deal Value (₺)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    placeholder="5000" 
                    step="0.01"
                    min="0"
                    {...field}
                    value={field.value || ""}
                    data-testid="input-deal-value"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

            <FormField
              control={form.control}
              name="stage"
              render={({ field }) => (
                <FormItem>
                <FormLabel data-testid="label-deal-stage">Stage</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger data-testid="select-deal-stage">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="negotiation">Negotiation</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                <FormLabel data-testid="label-deal-priority">Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger data-testid="select-deal-priority">
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
          </div>


          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <FormField
              control={form.control}
              name="probability"
              render={({ field }) => (
                <FormItem>
                <FormLabel data-testid="label-deal-probability">Probability (%)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    placeholder="50" 
                    min="0"
                    max="100"
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    value={field.value?.toString() || ""}
                    data-testid="input-deal-probability"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

            <FormField
              control={form.control}
              name="expectedCloseDate"
              render={({ field }) => (
                <FormItem>
                <FormLabel data-testid="label-deal-close-date">Expected Close Date</FormLabel>
                <FormControl>
                  <Input
                    placeholder="dd.mm.yyyy"
                    {...field}
                    data-testid="input-deal-close-date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          </div>

          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
              <FormLabel data-testid="label-deal-tags">Tags</FormLabel>
              <FormControl>
                <Input 
                  placeholder="skincare, premium, consultation (comma separated)" 
                  {...field}
                  data-testid="input-deal-tags"
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
              <FormLabel data-testid="label-deal-description">Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe the deal details, services included, etc."
                  className="min-h-[80px]"
                  {...field}
                  value={field.value || ""}
                  data-testid="textarea-deal-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
              <FormLabel data-testid="label-deal-notes">Internal Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Add any internal notes about this deal..."
                  className="min-h-[80px]"
                  {...field}
                  value={field.value || ""}
                  data-testid="textarea-deal-notes"
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
              data-testid="button-cancel-deal"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || isDemo || !canEdit}
              className="w-full sm:w-auto bg-gradient-to-r from-rose-gold to-deep-rose text-white"
              data-testid="button-save-deal"
            >
              {isDemo ? (
                "Demo Mode - View Only"
              ) : !canEdit ? (
                "No Edit Permission"
              ) : (
                <>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {deal ? "Update Deal" : "Create Deal"}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

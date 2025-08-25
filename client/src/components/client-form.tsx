import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertClientSchema } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, User } from "lucide-react";

const clientFormSchema = insertClientSchema.extend({
  tags: z.string().optional(),
}).omit({ assignedTo: true, createdBy: true, createdAt: true, updatedAt: true });

type ClientFormData = z.infer<typeof clientFormSchema>;

interface ClientFormProps {
  client?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ClientForm({ client, onSuccess, onCancel }: ClientFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current user info
  const { data: currentUser } = useQuery<{ id: string; email: string; firstName?: string; lastName?: string; role?: string }>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: client?.name || "",
      email: client?.email || "",
      phone: client?.phone || "",
      company: client?.company || "",
      instagramUsername: client?.instagramUsername || "",
      source: client?.source || "website",
      status: client?.status || "new",
      notes: client?.notes || "",
      tags: client?.tags ? client.tags.join(", ") : "",
    },
  });

  // Watch source field to show/hide Instagram username field
  const sourceValue = form.watch("source");

  // Create/update client mutation
  const clientMutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      setIsSubmitting(true);
      const clientData = {
        ...data,
        tags: data.tags ? data.tags.split(",").map(tag => tag.trim()).filter(Boolean) : [],
        // Add current user as creator for new clients
        ...(currentUser && !client ? { createdBy: currentUser.id } : {}),
      };

      if (client) {
        await apiRequest("PATCH", `/api/clients/${client.id}`, clientData);
      } else {
        await apiRequest("POST", "/api/clients", clientData);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: client ? "Client updated successfully" : "Client created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
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
        description: client ? "Failed to update client" : "Failed to create client",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: ClientFormData) => {
    clientMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    {client?.createdBy && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Создатель записи
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {client ? '✏️ Редактирование клиента' : '👤 Создание нового клиента'}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="label-client-name">Name *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter client name" 
                    {...field}
                    data-testid="input-client-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="label-client-company">Company</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Company name" 
                    {...field}
                    value={field.value || ""}
                    data-testid="input-client-company"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="label-client-email">Email</FormLabel>
                <FormControl>
                  <Input 
                    type="email"
                    placeholder="client@example.com" 
                    {...field}
                    value={field.value || ""}
                    data-testid="input-client-email"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="label-client-phone">Phone</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="+90 (5XX) XXX XX XX" 
                    {...field}
                    value={field.value || ""}
                    data-testid="input-client-phone"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Instagram field - show only when Instagram is selected as source */}
        {sourceValue === "instagram" && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <FormField
              control={form.control}
              name="instagramUsername"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="label-client-instagram" className="text-blue-700 font-medium">
                    📱 Instagram Username
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="@username" 
                      {...field}
                      value={field.value || ""}
                      data-testid="input-client-instagram"
                      className="border-blue-300 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-blue-600 mt-1">
                    💡 Enter the Instagram username to enable direct messaging
                  </p>
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="label-client-source">Lead Source *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-client-source">
                      <SelectValue placeholder="Select lead source" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
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
                <FormLabel data-testid="label-client-status">Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger data-testid="select-client-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="opportunity">Opportunity</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
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
              <FormLabel data-testid="label-client-tags">Tags</FormLabel>
              <FormControl>
                <Input 
                  placeholder="skincare, premium, referral (comma separated)" 
                  {...field}
                  data-testid="input-client-tags"
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
              <FormLabel data-testid="label-client-notes">Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Add any additional notes about this client..."
                  className="min-h-[100px]"
                  {...field}
                  value={field.value || ""}
                  data-testid="textarea-client-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isSubmitting}
            data-testid="button-cancel-client"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-gradient-to-r from-rose-gold to-deep-rose text-white"
            data-testid="button-save-client"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {client ? "Update Client" : "Create Client"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

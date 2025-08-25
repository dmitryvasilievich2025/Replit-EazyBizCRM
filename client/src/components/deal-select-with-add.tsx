import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDealSchema, type Deal } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { ClientSelectWithAdd } from "./client-select-with-add";
import { z } from "zod";

const dealFormSchema = insertDealSchema.extend({
  value: z.string().optional(),
  expectedCloseDate: z.string().optional(),
}).omit({ assignedTo: true });

type InsertDeal = z.infer<typeof dealFormSchema>;

interface DealSelectWithAddProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  excludeDealId?: string;
}

export function DealSelectWithAdd({ value, onValueChange, placeholder = "Select a deal", excludeDealId }: DealSelectWithAddProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: deals = [], isLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
  });

  const form = useForm<InsertDeal>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      title: "",
      description: "",
      clientId: "",
      value: "",
      stage: "new",
      priority: "medium",
      probability: 0,
      expectedCloseDate: "",
      notes: "",
    },
  });

  const createDealMutation = useMutation({
    mutationFn: async (data: InsertDeal): Promise<Deal> => {
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
        expectedCloseDate: convertDateString(data.expectedCloseDate || "") ? new Date(convertDateString(data.expectedCloseDate || "")!) : null,
      };

      const response = await fetch("/api/deals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dealData),
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: (newDeal: Deal) => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      onValueChange(newDeal.id);
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Deal created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create deal",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertDeal) => {
    createDealMutation.mutate(data);
  };

  // Filter deals based on search term and exclude specified deal
  const filteredDeals = deals.filter(deal => 
    deal.id !== excludeDealId &&
    (deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
     deal.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedDeal = deals.find(deal => deal.id === value);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <Select value={value || ""} onValueChange={onValueChange}>
            <SelectTrigger data-testid="select-deal">
              <SelectValue placeholder={selectedDeal ? selectedDeal.title : placeholder} />
            </SelectTrigger>
            <SelectContent>
              <div className="p-2">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search deals..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8"
                    data-testid="input-search-deals"
                  />
                </div>
              </div>
              {isLoading ? (
                <SelectItem value="loading" disabled>Loading...</SelectItem>
              ) : filteredDeals.length > 0 ? (
                filteredDeals.map((deal) => (
                  <SelectItem key={deal.id} value={deal.id} data-testid={`option-deal-${deal.id}`}>
                    <div className="flex flex-col">
                      <span className="font-medium">{deal.title}</span>
                      <span className="text-sm text-muted-foreground capitalize">
                        {deal.stage} • {deal.priority}
                      </span>
                      {deal.value && (
                        <span className="text-xs text-muted-foreground">
                          ${parseFloat(deal.value.toString()).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-results" disabled>
                  {searchTerm ? "No deals found" : "No deals available"}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="icon" data-testid="button-add-deal">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Deal</DialogTitle>
              <DialogDescription>
                Create a new deal to associate with this item.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deal Title *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter deal title" {...field} data-testid="input-deal-title" />
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
                        <FormLabel>Client *</FormLabel>
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
                  
                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deal Value ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="5000" 
                            step="0.01"
                            min="0"
                            {...field}
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
                        <FormLabel>Stage</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || "new"}>
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
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || "medium"}>
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
                  
                  <FormField
                    control={form.control}
                    name="expectedCloseDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expected Close Date</FormLabel>
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <textarea
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Deal description..."
                          {...field}
                          value={field.value || ""}
                          data-testid="textarea-deal-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel-deal"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createDealMutation.isPending}
                    data-testid="button-create-deal"
                  >
                    {createDealMutation.isPending ? "Creating..." : "Create Deal"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
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
import { insertEmployeeSchema, type Employee } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

interface EmployeeSelectWithAddProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  excludeEmployeeId?: string;
}

export function EmployeeSelectWithAdd({ value, onValueChange, placeholder = "Select an employee", excludeEmployeeId }: EmployeeSelectWithAddProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const form = useForm<InsertEmployee>({
    resolver: zodResolver(insertEmployeeSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: "manager",
    },
  });

  const createEmployeeMutation = useMutation({
    mutationFn: async (data: InsertEmployee): Promise<Employee> => {
      return await apiRequest("/api/employees", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (newEmployee: Employee) => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      onValueChange(newEmployee.id);
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Employee created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create employee",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertEmployee) => {
    createEmployeeMutation.mutate(data);
  };

  // Filter employees based on search term and exclude specified user
  const filteredEmployees = employees.filter(employee => 
    employee.id !== excludeEmployeeId &&
    (employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
     employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
     employee.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedEmployee = employees.find(employee => employee.id === value);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <Select value={value || ""} onValueChange={onValueChange}>
            <SelectTrigger data-testid="select-employee">
              <SelectValue placeholder={selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}` : placeholder} />
            </SelectTrigger>
            <SelectContent>
              <div className="p-2">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8"
                    data-testid="input-search-employees"
                  />
                </div>
              </div>
              {isLoading ? (
                <SelectItem value="loading" disabled>Loading...</SelectItem>
              ) : filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id} data-testid={`option-employee-${employee.id}`}>
                    <div className="flex flex-col">
                      <span className="font-medium">{employee.firstName} {employee.lastName}</span>
                      <span className="text-sm text-muted-foreground">
                        {employee.email} • {employee.role}
                      </span>
                    </div>
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-results" disabled>
                  {searchTerm ? "No employees found" : "No employees available"}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="icon" data-testid="button-add-employee">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" aria-describedby="add-employee-description">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription id="add-employee-description">
                Create a new employee record for task assignment
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-first-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-last-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} data-testid="input-email" />
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
                      <FormLabel>Phone (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-role">
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="director">Director</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createEmployeeMutation.isPending}
                    data-testid="button-save"
                  >
                    {createEmployeeMutation.isPending ? "Creating..." : "Create Employee"}
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
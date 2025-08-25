import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertEmployeeSchema } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

const employeeFormSchema = insertEmployeeSchema.extend({
  dateOfBirth: z.string().optional(),
  hireDate: z.string().optional(),
  terminationDate: z.string().optional(),
  monthlySalary: z.string().optional(),
  overtimeRate: z.string().optional(),
  weekendRate: z.string().optional(),
  holidayRate: z.string().optional(),
}).omit({ 
  userId: true
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

interface EmployeeFormProps {
  employee?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EmployeeForm({ employee, onSuccess, onCancel }: EmployeeFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      firstName: employee?.firstName || "",
      lastName: employee?.lastName || "",
      email: employee?.email || "",
      phone: employee?.phone || "",
      role: employee?.role || "employee",
      profileImageUrl: employee?.profileImageUrl || "",
      isActive: employee?.isActive ?? true,
      monthlySalary: employee?.monthlySalary?.toString() || "",
      dailyWorkingHours: employee?.dailyWorkingHours || "8.00",
      dateOfBirth: employee?.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString('en-GB') : "",
      hireDate: employee?.hireDate ? new Date(employee.hireDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
      terminationDate: employee?.terminationDate ? new Date(employee.terminationDate).toLocaleDateString('en-GB') : "",
      // Rate coefficients
      overtimeRate: employee?.overtimeRate || "1.50",
      weekendRate: employee?.weekendRate || "1.25", 
      holidayRate: employee?.holidayRate || "2.00",
    },
  });

  const createEmployeeMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
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
      
      const payload = {
        ...data,
        monthlySalary: data.monthlySalary ? Number(data.monthlySalary) : null,
        dateOfBirth: convertDateString(data.dateOfBirth || "") ? new Date(convertDateString(data.dateOfBirth || "")!) : null,
        hireDate: convertDateString(data.hireDate || "") ? new Date(convertDateString(data.hireDate || "")!) : new Date(),
        terminationDate: convertDateString(data.terminationDate || "") ? new Date(convertDateString(data.terminationDate || "")!) : null,
        // Rate coefficients
        overtimeRate: data.overtimeRate ? parseFloat(data.overtimeRate) : null,
        weekendRate: data.weekendRate ? parseFloat(data.weekendRate) : null,
        holidayRate: data.holidayRate ? parseFloat(data.holidayRate) : null,
      };

      if (employee) {
        await apiRequest("PATCH", `/api/employees/${employee.id}`, payload);
      } else {
        await apiRequest("POST", "/api/employees", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Success",
        description: employee ? "Employee updated successfully" : "Employee created successfully",
      });
      onSuccess();
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
        title: "Error",
        description: employee ? "Failed to update employee" : "Failed to create employee",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: EmployeeFormData) => {
    setIsSubmitting(true);
    try {
      await createEmployeeMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="label-employee-first-name">First Name *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter first name" 
                    {...field} 
                    data-testid="input-employee-first-name"
                  />
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
                <FormLabel data-testid="label-employee-last-name">Last Name *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter last name" 
                    {...field} 
                    data-testid="input-employee-last-name"
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
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="label-employee-email">Email *</FormLabel>
                <FormControl>
                  <Input 
                    type="email"
                    placeholder="Enter email address" 
                    {...field} 
                    data-testid="input-employee-email"
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
                <FormLabel data-testid="label-employee-phone">Phone</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter phone number" 
                    {...field}
                    value={field.value || ""}
                    data-testid="input-employee-phone"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Role and Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="label-employee-role">Role *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-employee-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="director">Director</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="label-employee-status">Status</FormLabel>
                <Select onValueChange={(value) => field.onChange(value === "true")} value={String(field.value)}>
                  <FormControl>
                    <SelectTrigger data-testid="select-employee-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="label-employee-birth-date">Date of Birth</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="DD.MM.YYYY (e.g., 15.03.1990)" 
                    {...field}
                    value={field.value || ""}
                    data-testid="input-employee-birth-date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hireDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="label-employee-hire-date">Hire Date *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="DD.MM.YYYY (e.g., 01.01.2024)" 
                    {...field}
                    value={field.value || ""}
                    data-testid="input-employee-hire-date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="terminationDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="label-employee-termination-date">Termination Date</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="DD.MM.YYYY (e.g., 31.12.2024)" 
                    {...field}
                    value={field.value || ""}
                    data-testid="input-employee-termination-date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Salary and Hours */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <FormField
            control={form.control}
            name="monthlySalary"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="label-employee-salary">Monthly Salary ($)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    placeholder="5000" 
                    step="0.01"
                    min="0"
                    {...field}
                    value={field.value || ""}
                    data-testid="input-employee-salary"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dailyWorkingHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="label-employee-hours">Daily Working Hours</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    placeholder="8.00" 
                    step="0.25"
                    min="0"
                    max="24"
                    {...field}
                    value={field.value || ""}
                    data-testid="input-employee-hours"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Rate Coefficients - Only for Admin/Director */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Коэффициенты оплаты (только для админов и директоров)
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <FormField
              control={form.control}
              name="overtimeRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="label-employee-overtime-rate">Переработка (коэфф.)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      placeholder="1.50" 
                      step="0.25"
                      min="1"
                      max="5"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-employee-overtime-rate"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-gray-500 mt-1">Например: 1.5 = 150% от обычной ставки</p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="weekendRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="label-employee-weekend-rate">Выходные (коэфф.)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      placeholder="1.25" 
                      step="0.25"
                      min="1"
                      max="5"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-employee-weekend-rate"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-gray-500 mt-1">Например: 1.25 = 125% за работу в выходные</p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="holidayRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="label-employee-holiday-rate">Праздники (коэфф.)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      placeholder="2.00" 
                      step="0.25"
                      min="1"
                      max="5"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-employee-holiday-rate"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-gray-500 mt-1">Например: 2.0 = 200% за работу в праздники</p>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Profile Image */}
        <FormField
          control={form.control}
          name="profileImageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel data-testid="label-employee-image">Profile Image</FormLabel>
              <div className="space-y-3">
                <FormControl>
                  <Input 
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          field.onChange(e.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    data-testid="input-employee-image-file"
                  />
                </FormControl>
                <FormControl>
                  <Input 
                    placeholder="Or enter image URL" 
                    {...field}
                    value={field.value || ""}
                    data-testid="input-employee-image-url"
                  />
                </FormControl>
                {field.value && (
                  <div className="mt-2">
                    <img 
                      src={field.value} 
                      alt="Preview" 
                      className="w-20 h-20 object-cover rounded-lg border"
                    />
                  </div>
                )}
              </div>
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
            data-testid="button-cancel-employee"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-gradient-to-r from-rose-gold to-deep-rose text-white"
            data-testid="button-save-employee"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {employee ? "Update Employee" : "Create Employee"}
          </Button>
        </div>
        </form>
      </Form>
    </div>
  );
}
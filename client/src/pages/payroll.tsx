import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Calculator, Clock, TrendingUp, Users, DollarSign, CalendarIcon, Edit, Trash2, Plus } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import type { Employee, MonthlyPayroll } from "@shared/schema";

// Daily Payroll form schema
const dailyPayrollSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  date: z.string().min(1, "Date is required"),
  plannedHours: z.string().min(1, "Planned hours is required"),
  actualHours: z.string().min(1, "Actual hours is required"),
  hourlyRate: z.string().min(1, "Hourly rate is required"),
});

type DailyPayrollFormData = z.infer<typeof dailyPayrollSchema>;

interface PayrollCalculation {
  employeeId: string;
  employeeName: string;
  hourlyRate: number;
  plannedDailyHours: number;
  actualHours: number;
  overtimeHours: number;
  basePay: number;
  overtimePay: number;
  grossSalary: number;
  // Turkish tax deductions
  incomeTax: number;
  stampTax: number;
  socialSecurityEmployee: number;
  unemploymentInsuranceEmployee: number;
  totalDeductions: number;
  netSalary: number;
  // Employer costs
  socialSecurityEmployer: number;
  unemploymentInsuranceEmployer: number;
  totalEmployerCost: number;
}

export default function PayrollPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // Current month
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // Current year
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("monthly");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

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

  // Get current user role for access control
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Fetch employees with payroll data
  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    retry: false,
  });

  // Form for add/edit daily payroll
  const form = useForm<DailyPayrollFormData>({
    resolver: zodResolver(dailyPayrollSchema),
    defaultValues: {
      employeeId: "",
      date: "",
      plannedHours: "8.00",
      actualHours: "8.00",
      hourlyRate: "50.00",
    },
  });

  // Daily payroll CRUD mutations
  const createDailyPayrollMutation = useMutation({
    mutationFn: async (data: DailyPayrollFormData) => {
      const payload = {
        ...data,
        plannedHours: parseFloat(data.plannedHours),
        actualHours: parseFloat(data.actualHours),
        hourlyRate: parseFloat(data.hourlyRate),
        date: new Date(data.date).toISOString(),
      };
      await apiRequest("POST", "/api/payroll/daily", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/daily"] });
      toast({ title: "Success", description: "Daily payroll record created successfully" });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to create daily payroll record", variant: "destructive" });
    },
  });

  const updateDailyPayrollMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: DailyPayrollFormData }) => {
      const payload = {
        ...data,
        plannedHours: parseFloat(data.plannedHours),
        actualHours: parseFloat(data.actualHours),
        hourlyRate: parseFloat(data.hourlyRate),
        date: new Date(data.date).toISOString(),
      };
      await apiRequest("PUT", `/api/payroll/daily/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/daily"] });
      toast({ title: "Success", description: "Daily payroll record updated successfully" });
      setIsEditDialogOpen(false);
      setEditingRecord(null);
      form.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to update daily payroll record", variant: "destructive" });
    },
  });

  const deleteDailyPayrollMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/payroll/daily/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/daily"] });
      toast({ title: "Success", description: "Daily payroll record deleted successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to delete daily payroll record", variant: "destructive" });
    },
  });

  // Handle edit record
  const handleEditRecord = (record: any) => {
    setEditingRecord(record);
    form.reset({
      employeeId: record.employeeId,
      date: record.date ? new Date(record.date).toISOString().split('T')[0] : "",
      plannedHours: record.plannedHours?.toString() || "8.00",
      actualHours: record.actualHours?.toString() || "8.00",
      hourlyRate: record.hourlyRate?.toString() || "50.00",
    });
    setIsEditDialogOpen(true);
  };

  // Handle add record
  const handleAddRecord = () => {
    form.reset({
      employeeId: selectedEmployee !== "all" ? selectedEmployee : "",
      date: new Date().toISOString().split('T')[0],
      plannedHours: "8.00",
      actualHours: "8.00",
      hourlyRate: "50.00",
    });
    setIsAddDialogOpen(true);
  };

  // Handle form submit
  const onSubmit = async (data: DailyPayrollFormData) => {
    if (editingRecord) {
      updateDailyPayrollMutation.mutate({ id: editingRecord.id, data });
    } else {
      createDailyPayrollMutation.mutate(data);
    }
  };

  // Fetch daily payroll data
  const { data: dailyPayroll = [], isLoading: dailyPayrollLoading } = useQuery({
    queryKey: ["/api/payroll/daily", selectedEmployee, dateRange?.from, dateRange?.to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedEmployee && selectedEmployee !== "all") params.append('employeeId', selectedEmployee);
      if (dateRange?.from) params.append('startDate', dateRange.from.toISOString());
      if (dateRange?.to) params.append('endDate', dateRange.to.toISOString());
      
      const response = await fetch(`/api/payroll/daily?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    enabled: activeTab === "daily",
    retry: false,
  });

  // Fetch monthly payroll calculations
  const { data: monthlyPayroll = [], isLoading: payrollLoading } = useQuery<MonthlyPayroll[]>({
    queryKey: ["/api/payroll/monthly", selectedMonth, selectedYear],
    queryFn: async () => {
      const response = await fetch(`/api/payroll/monthly?month=${selectedMonth}&year=${selectedYear}`);
      if (!response.ok) {
        throw new Error('Failed to fetch payroll data');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: isAuthenticated,
    retry: false,
  });

  // Calculate daily payroll for employee
  const calculateDailyPayrollMutation = useMutation({
    mutationFn: async ({ employeeId, date }: { employeeId: string; date: Date }) => {
      const response = await fetch(`/api/payroll/daily/calculate`, {
        method: "POST",
        body: JSON.stringify({ employeeId, date: date.toISOString() }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/daily"] });
      toast({
        title: "Success",
        description: "Daily payroll calculated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
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
        description: "Failed to calculate daily payroll",
        variant: "destructive",
      });
    },
  });

  // Calculate working days in month (excluding weekends)
  const calculateWorkingDays = (month: number, year: number): number => {
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      // Exclude Saturday (6) and Sunday (0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }
    
    return workingDays;
  };

  // Calculate Turkish tax deductions according to 2025 rates
  const calculateTurkishTaxes = (grossSalary: number) => {
    const stampTax = grossSalary * 0.00759; // 0.759%
    const socialSecurityEmployee = grossSalary * 0.14; // 14%
    const unemploymentInsuranceEmployee = grossSalary * 0.01; // 1%
    
    // Income tax calculation (Turkish progressive rates for 2025)
    let incomeTax = 0;
    const monthlyGross = grossSalary;
    
    if (monthlyGross <= 7000) {
      incomeTax = monthlyGross * 0.15; // 15%
    } else if (monthlyGross <= 25000) {
      incomeTax = 7000 * 0.15 + (monthlyGross - 7000) * 0.20; // 20%
    } else if (monthlyGross <= 55000) {
      incomeTax = 7000 * 0.15 + 18000 * 0.20 + (monthlyGross - 25000) * 0.27; // 27%
    } else {
      incomeTax = 7000 * 0.15 + 18000 * 0.20 + 30000 * 0.27 + (monthlyGross - 55000) * 0.35; // 35%
    }

    return {
      incomeTax,
      stampTax,
      socialSecurityEmployee,
      unemploymentInsuranceEmployee,
      totalDeductions: incomeTax + stampTax + socialSecurityEmployee + unemploymentInsuranceEmployee,
    };
  };

  // Calculate employer costs
  const calculateEmployerCosts = (grossSalary: number) => {
    const socialSecurityEmployer = grossSalary * 0.155; // 15.5%
    const unemploymentInsuranceEmployer = grossSalary * 0.02; // 2%
    
    return {
      socialSecurityEmployer,
      unemploymentInsuranceEmployer,
      totalEmployerCost: grossSalary + socialSecurityEmployer + unemploymentInsuranceEmployer,
    };
  };

  // Generate payroll calculation for selected month
  const generatePayrollMutation = useMutation({
    mutationFn: async () => {
      const workingDays = calculateWorkingDays(selectedMonth, selectedYear);
      
      // All calculations now happen on server based on real work sessions

      await apiRequest("POST", "/api/payroll/sync", { 
        month: selectedMonth, 
        year: selectedYear
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payroll synchronized with work sessions successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/monthly"] });
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
        description: error.message || "Failed to sync payroll",
        variant: "destructive",
      });
    },
  });

  // Sync monthly payroll from daily records
  const syncPayrollMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/payroll/sync", {
        month: selectedMonth, 
        year: selectedYear
      });
    },
    onSuccess: () => {
      toast({
        title: "Синхронизация завершена",
        description: "Месячная зарплата обновлена на основе дневных записей",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/monthly"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/daily"] });
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
        title: "Ошибка синхронизации",
        description: error.message || "Не удалось синхронизировать данные",
        variant: "destructive",
      });
    },
  });

  // Check if current user can see all employees or just their own
  const isAdminOrDirector = (currentUser as any)?.role === 'admin' || (currentUser as any)?.role === 'director';
  const canViewAllEmployees = isAdminOrDirector;
  const canManagePayroll = isAdminOrDirector;

  // Format currency for Turkish Lira
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('tr-TR', { 
      style: 'currency', 
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(isNaN(num) ? 0 : num);
  };

  // Format hours with 2 decimal places
  const formatHours = (hours: number | string) => {
    const num = typeof hours === 'string' ? parseFloat(hours) : hours;
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const workingDays = calculateWorkingDays(selectedMonth, selectedYear);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  if (employeesLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
            Payroll Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Автоматический расчет заработной платы согласно турецкому законодательству
          </p>
        </div>
        
        {/* Info Card */}
        <Card className="w-full sm:w-80 border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Автоматический расчет</span>
            </div>
            <p className="text-xs text-blue-600">
              Зарплата рассчитывается автоматически при завершении рабочей сессии на основе:
              • Часовой ставки из профиля сотрудника
              • Отработанных часов и переработки
              • Турецких налогов (подоходный, соцстрах, страховка)
            </p>
          </CardContent>
        </Card>
      </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {canManagePayroll && (
            <Button
              onClick={() => syncPayrollMutation.mutate()}
              disabled={syncPayrollMutation.isPending}
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              {syncPayrollMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Синхронизация...
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Синхронизировать с дневными записями
                </>
              )}
            </Button>
          )}
          <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {monthNames.map((month, index) => (
                <SelectItem key={index + 1} value={(index + 1).toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-24">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {[2023, 2024, 2025].map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {canManagePayroll && (
            <Button
              onClick={() => generatePayrollMutation.mutate()}
              disabled={generatePayrollMutation.isPending}
              className="bg-gradient-to-r from-rose-500 to-pink-600 text-white"
              data-testid="button-generate-payroll"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Sync Real Hours
            </Button>
          )}
        </div>

        {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Working Days</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workingDays}</div>
            <p className="text-xs text-muted-foreground">
              {monthNames[selectedMonth - 1]} {selectedYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">
              Active employees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gross</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₺{Array.isArray(monthlyPayroll) ? monthlyPayroll.reduce((sum: number, p) => sum + parseFloat(p.grossSalary || "0"), 0).toLocaleString() : "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              Monthly gross salary
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Net</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₺{Array.isArray(monthlyPayroll) ? monthlyPayroll.reduce((sum: number, p) => sum + parseFloat(p.netSalary || "0"), 0).toLocaleString() : "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              Monthly net salary
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="monthly">Monthly Payroll</TabsTrigger>
          <TabsTrigger value="daily">Daily Payroll</TabsTrigger>
          <TabsTrigger value="details">Tax Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle>
                {monthNames[selectedMonth - 1]} {selectedYear} - Payroll Summary
              </CardTitle>
              <CardDescription>
                Working days: {workingDays} (excluding weekends)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Hourly Rate</TableHead>
                      <TableHead>Planned Hours</TableHead>
                      <TableHead>Actual Hours</TableHead>
                      <TableHead>Overtime</TableHead>
                      <TableHead>Gross Salary</TableHead>
                      <TableHead>Net Salary</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => {
                      const payroll = monthlyPayroll.find((p) => p.employeeId === employee.id);
                      const plannedHours = (parseFloat(employee.plannedDailyHours || "8")) * workingDays;
                      const actualHours = parseFloat(payroll?.actualHours || plannedHours.toString());
                      const overtimeHours = parseFloat(payroll?.overtimeHours || "0");
                      const grossSalary = parseFloat(payroll?.grossSalary || "0");
                      const netSalary = parseFloat(payroll?.netSalary || "0");

                      return (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{employee.firstName} {employee.lastName}</span>
                              <Badge variant="secondary" className="text-xs w-fit mt-1">
                                {employee.role || 'employee'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>₺{payroll ? Number(payroll.hourlyRate).toFixed(0) : "0"}</TableCell>
                          <TableCell>{plannedHours}h</TableCell>
                          <TableCell>{actualHours}h</TableCell>
                          <TableCell>{overtimeHours}h</TableCell>
                          <TableCell>₺{grossSalary.toLocaleString()}</TableCell>
                          <TableCell>₺{netSalary.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={payroll ? "default" : "secondary"}>
                              {payroll ? "Calculated" : "Pending"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Tax & Deduction Details</CardTitle>
              <CardDescription>
                Turkish labor law compliant tax calculations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Gross Salary</TableHead>
                      <TableHead>Income Tax</TableHead>
                      <TableHead>Stamp Tax (0.759%)</TableHead>
                      <TableHead>Social Security (14%)</TableHead>
                      <TableHead>Unemployment (1%)</TableHead>
                      <TableHead>Total Deductions</TableHead>
                      <TableHead>Net Salary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => {
                      const payroll = monthlyPayroll.find((p) => p.employeeId === employee.id);
                      
                      return (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{employee.firstName} {employee.lastName}</span>
                              <Badge variant="secondary" className="text-xs w-fit mt-1">
                                {employee.role || 'employee'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>₺{parseFloat(payroll?.grossSalary || "0").toLocaleString()}</TableCell>
                          <TableCell>₺{parseFloat(payroll?.incomeTax || "0").toLocaleString()}</TableCell>
                          <TableCell>₺{parseFloat(payroll?.stampTax || "0").toLocaleString()}</TableCell>
                          <TableCell>₺{parseFloat(payroll?.socialSecurityEmployee || "0").toLocaleString()}</TableCell>
                          <TableCell>₺{parseFloat(payroll?.unemploymentInsuranceEmployee || "0").toLocaleString()}</TableCell>
                          <TableCell>₺{parseFloat(payroll?.totalDeductions || "0").toLocaleString()}</TableCell>
                          <TableCell className="font-semibold">₺{parseFloat(payroll?.netSalary || "0").toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle>Daily Payroll Report</CardTitle>
              <CardDescription>
                {canViewAllEmployees ? "View daily payroll for all employees" : "View your daily payroll"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                {canViewAllEmployees && (
                  <Select value={selectedEmployee || "all"} onValueChange={setSelectedEmployee}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select employee (or all)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Employees</SelectItem>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.firstName} {employee.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant="outline"
                      className={cn(
                        "w-80 justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        "Pick a date range"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>

                {canViewAllEmployees && (
                  <Button
                    onClick={() => {
                      if (selectedEmployee && dateRange?.from) {
                        calculateDailyPayrollMutation.mutate({
                          employeeId: selectedEmployee,
                          date: dateRange.from,
                        });
                      }
                    }}
                    disabled={calculateDailyPayrollMutation.isPending || !selectedEmployee || selectedEmployee === "all"}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Calculate Daily Payroll
                  </Button>
                )}
                
                {/* Add Daily Record Button - Only for Admin/Director */}
                {canViewAllEmployees && (
                  <Button
                    onClick={handleAddRecord}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white"
                    data-testid="button-add-daily-record"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Daily Record
                  </Button>
                )}
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Planned Hours</TableHead>
                      <TableHead>Actual Hours</TableHead>
                      <TableHead>Overtime Hours</TableHead>
                      <TableHead>Hourly Rate</TableHead>
                      <TableHead>Gross Pay</TableHead>
                      <TableHead>Total Deductions</TableHead>
                      <TableHead>Net Pay</TableHead>
                      {canViewAllEmployees && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyPayrollLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                          <TableCell><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                          <TableCell><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                          <TableCell><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                          <TableCell><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                          <TableCell><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                          <TableCell><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                          <TableCell><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                          <TableCell><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                          {canViewAllEmployees && <TableCell><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>}
                        </TableRow>
                      ))
                    ) : dailyPayroll.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canViewAllEmployees ? 10 : 9} className="text-center text-muted-foreground py-8">
                          No daily payroll data found for the selected criteria
                        </TableCell>
                      </TableRow>
                    ) : (
                      dailyPayroll.map((record: any) => (
                        <TableRow key={record.id || `${record.employeeId}-${record.date}`}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{record.employee || `${record.firstName || "N/A"} ${record.lastName || ""}`}</span>
                              <Badge variant="secondary" className="text-xs w-fit mt-1">
                                {record.employeeRole || record.role || 'employee'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {record.date ? format(new Date(record.date), "MMM dd, yyyy") : "N/A"}
                          </TableCell>
                          <TableCell>{formatHours(record.plannedHours || "0")}</TableCell>
                          <TableCell>{formatHours(record.actualHours || "0")}</TableCell>
                          <TableCell className={parseFloat(record.overtimeHours || "0") > 0 ? "text-orange-600 font-medium" : ""}>
                            {formatHours(record.overtimeHours || "0")}
                          </TableCell>
                          <TableCell>{formatCurrency(record.hourlyRate || "0")}</TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(record.grossPay || "0")}
                          </TableCell>
                          <TableCell className="text-red-600">
                            -{formatCurrency(record.totalDeductions || "0")}
                          </TableCell>
                          <TableCell className="font-medium text-green-600">
                            {formatCurrency(record.netPay || "0")}
                          </TableCell>
                          {canViewAllEmployees && (
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditRecord(record)}
                                  data-testid={`button-edit-record-${record.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this record?")) {
                                      deleteDailyPayrollMutation.mutate(record.id);
                                    }
                                  }}
                                  disabled={deleteDailyPayrollMutation.isPending}
                                  data-testid={`button-delete-record-${record.id}`}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


      {/* Add Daily Payroll Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" aria-describedby="add-daily-payroll-description">
          <DialogHeader>
            <DialogTitle>Add Daily Payroll Record</DialogTitle>
            <DialogDescription id="add-daily-payroll-description">
              Create a new daily payroll record for an employee.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-employee">
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees.map((employee: Employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.firstName} {employee.lastName} ({employee.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="plannedHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Planned Hours *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.25" min="0" max="24" {...field} data-testid="input-planned-hours" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="actualHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Actual Hours *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.25" min="0" max="24" {...field} data-testid="input-actual-hours" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hourly Rate (₺) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} data-testid="input-hourly-rate" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createDailyPayrollMutation.isPending} data-testid="button-save-record">
                  {createDailyPayrollMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Daily Payroll Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" aria-describedby="edit-daily-payroll-description">
          <DialogHeader>
            <DialogTitle>Edit Daily Payroll Record</DialogTitle>
            <DialogDescription id="edit-daily-payroll-description">
              Update the daily payroll record for this employee.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-employee-edit">
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees.map((employee: Employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.firstName} {employee.lastName} ({employee.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-date-edit" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="plannedHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Planned Hours *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.25" min="0" max="24" {...field} data-testid="input-planned-hours-edit" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="actualHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Actual Hours *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.25" min="0" max="24" {...field} data-testid="input-actual-hours-edit" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hourly Rate (₺) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} data-testid="input-hourly-rate-edit" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingRecord(null); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateDailyPayrollMutation.isPending} data-testid="button-update-record">
                  {updateDailyPayrollMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
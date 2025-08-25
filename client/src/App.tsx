import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/app-layout";

import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Deals from "@/pages/deals";
import Tasks from "@/pages/tasks";
import Analytics from "@/pages/analytics";
import TimeTracking from "@/pages/time-tracking";
import Integrations from "@/pages/integrations";
import Employees from "@/pages/employees";
import PayrollPage from "@/pages/payroll";
import InstagramPage from "@/pages/Instagram";
import KnowledgeBase from "@/pages/KnowledgeBase";
import TelegramBot from "@/pages/TelegramBot";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Switch>
        {isLoading || !isAuthenticated ? (
          <Route path="/" component={Landing} />
        ) : (
          <AppLayout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/clients" component={Clients} />
              <Route path="/deals" component={Deals} />
              <Route path="/tasks" component={Tasks} />
              <Route path="/analytics" component={Analytics} />
              <Route path="/knowledge-base" component={KnowledgeBase} />
              <Route path="/telegram-bot" component={TelegramBot} />
              <Route path="/time-tracking" component={TimeTracking} />
              <Route path="/integrations" component={Integrations} />
              <Route path="/employees" component={Employees} />
              <Route path="/payroll" component={PayrollPage} />
              <Route path="/instagram" component={InstagramPage} />
              <Route path="/settings" component={Settings} />
            </Switch>
          </AppLayout>
        )}
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

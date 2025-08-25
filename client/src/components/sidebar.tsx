import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { 
  LayoutDashboard, 
  Users, 
  Handshake, 
  CheckSquare, 
  BarChart3, 
  Clock, 
  Settings,
  UserCog,
  Calculator,
  Instagram,
  MessageSquare,
  Brain,
  Bot,
  Menu,
  X
} from "lucide-react";

// Hook for managing sidebar state
export function useSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setIsOpen(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggle = () => setIsOpen(!isOpen);
  
  return { isOpen, toggle, isMobile };
}

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Deals", href: "/deals", icon: Handshake },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "My Assistant", href: "/knowledge-base", icon: Brain },
  { name: "Telegram Bot", href: "/telegram-bot", icon: Bot },
  { name: "Time Tracking", href: "/time-tracking", icon: Clock },
  { name: "Employees", href: "/employees", icon: UserCog },
  { name: "Payroll", href: "/payroll", icon: Calculator },
  { name: "Instagram", href: "/instagram", icon: Instagram },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Integrations", href: "/integrations", icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
  isMobile?: boolean;
}

export default function Sidebar({ isOpen = true, onToggle, isMobile = false }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Handle ESC key and click outside on mobile
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobile && isOpen) {
        onToggle?.();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isMobile, isOpen, onToggle]);

  // Filter navigation items based on user role
  const getNavigationItems = () => {
    const isAdminOrDirector = (user as any)?.role === 'admin' || (user as any)?.role === 'director';
    
    return navigation.filter(item => {
      // Only admin and director can see Employees, Telegram Bot and Instagram sections  
      if (item.name === 'Employees' || item.name === 'Telegram Bot' || item.name === 'Instagram') {
        return isAdminOrDirector;
      }
      return true;
    });
  };

  const sidebarWidth = isCollapsed ? 'w-16' : 'w-64';
  const sidebarTransform = isMobile ? (isOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0';

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
          data-testid="sidebar-overlay"
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={cn(
          "fixed top-0 left-0 h-full bg-white border-r border-gray-200 transition-all duration-300 ease-in-out z-50",
          sidebarWidth,
          sidebarTransform,
          isMobile ? "lg:relative lg:translate-x-0" : "relative"
        )}
        data-testid="sidebar"
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
          {!isCollapsed && (
            <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 bg-clip-text text-transparent">
              EasyBizCRM
            </h1>
          )}
          
          {/* Toggle buttons */}
          <div className="flex items-center gap-2">
            {!isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-8 w-8 p-0"
                data-testid="collapse-toggle"
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
            
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="h-8 w-8 p-0 lg:hidden"
                data-testid="mobile-close"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {getNavigationItems().map((item) => {
            const isActive = item.href === "/" ? location === "/" : location.startsWith(item.href);
            
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full text-[#010c12] bg-[#f0f1f5]",
                    isCollapsed ? "justify-center px-2" : "justify-start"
                  )}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  title={isCollapsed ? item.name : undefined}
                  onClick={() => {
                    if (isMobile) onToggle?.();
                  }}
                >
                  <item.icon className={cn("h-4 w-4", isCollapsed ? "mr-0" : "mr-3")} />
                  {!isCollapsed && item.name}
                </Button>
              </Link>
            );
          })}
        </nav>
        
      </div>
    </>
  );
}
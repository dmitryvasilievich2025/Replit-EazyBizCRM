import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import Sidebar, { useSidebar } from "@/components/sidebar";
import { Menu } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { isOpen, toggle, isMobile } = useSidebar();

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Sidebar */}
      <Sidebar isOpen={isOpen} onToggle={toggle} isMobile={isMobile} />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col">{/* Убираем отступы, теперь content занимает всю ширину */}
        {/* Mobile Header */}
        {isMobile && (
          <header className="bg-white/80 backdrop-blur-sm border-b border-white/20 px-4 py-3 lg:hidden">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggle}
                className="h-10 w-10 p-0"
                data-testid="mobile-menu-toggle"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 bg-clip-text text-transparent">
                EasyBizCRM
              </h1>
              <div className="w-10" /> {/* Spacer for centering */}
            </div>
          </header>
        )}
        
        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
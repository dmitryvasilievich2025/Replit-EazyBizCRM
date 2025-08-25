import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, ArrowDown } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'negative';
  icon: React.ReactNode;
  bgColor: string;
  loading?: boolean;
}

export default function KpiCard({ 
  title, 
  value, 
  change, 
  changeType, 
  icon, 
  bgColor, 
  loading 
}: KpiCardProps) {
  if (loading) {
    return (
      <Card className="shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border border-gray-100 hover:shadow-md transition-shadow" data-testid={`card-kpi-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600" data-testid={`text-kpi-title-${title.toLowerCase().replace(/\s+/g, '-')}`}>{title}</p>
            <p className="text-3xl font-bold text-charcoal mt-2" data-testid={`text-kpi-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>{value}</p>
            <p className={`text-sm mt-1 flex items-center ${
              changeType === 'positive' ? 'text-green-600' : 'text-red-600'
            }`} data-testid={`text-kpi-change-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {changeType === 'positive' ? (
                <ArrowUp className="w-3 h-3 mr-1" />
              ) : (
                <ArrowDown className="w-3 h-3 mr-1" />
              )}
              {change}
            </p>
          </div>
          <div className={`w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

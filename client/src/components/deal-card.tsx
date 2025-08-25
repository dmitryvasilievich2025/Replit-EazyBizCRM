import { Badge } from "@/components/ui/badge";

interface DealCardProps {
  deal: {
    id: string;
    title: string;
    value?: number;
    description?: string;
    createdAt: string;
  };
  stage: string;
  borderColor: string;
  badgeColor: string;
}

export default function DealCard({ deal, stage, borderColor, badgeColor }: DealCardProps) {
  const getTimeAgo = (date: string) => {
    const now = new Date();
    const created = new Date(date);
    const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return '1d ago';
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  return (
    <div 
      className={`bg-white rounded-lg p-3 border-l-4 ${borderColor} shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
      data-testid={`card-deal-${deal.id}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm text-charcoal" data-testid={`text-deal-title-${deal.id}`}>
          {deal.title}
        </span>
        <span className="text-xs text-gray-500" data-testid={`text-deal-value-${deal.id}`}>
          ${deal.value ? (deal.value / 1000).toFixed(1) + 'K' : '0'}
        </span>
      </div>
      {deal.description && (
        <p className="text-xs text-gray-600 mb-2" data-testid={`text-deal-description-${deal.id}`}>
          {deal.description.length > 50 ? deal.description.substring(0, 50) + '...' : deal.description}
        </p>
      )}
      <div className="flex items-center justify-between">
        <Badge className={badgeColor} data-testid={`badge-deal-stage-${deal.id}`}>
          {stage}
        </Badge>
        <span className="text-xs text-gray-500" data-testid={`text-deal-time-${deal.id}`}>
          {getTimeAgo(deal.createdAt)}
        </span>
      </div>
    </div>
  );
}

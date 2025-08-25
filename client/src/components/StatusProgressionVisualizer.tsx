import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  User, 
  ArrowRight, 
  TrendingUp, 
  Target, 
  CheckCircle,
  Clock,
  Zap,
  Star
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  status: string;
  value?: number;
  company?: string;
  lastContactDate?: string;
}

interface StatusProgressionVisualizerProps {
  clients: Client[];
  onStatusChange?: (clientId: string, newStatus: string) => void;
}

const STAGES = [
  { 
    key: 'new', 
    label: 'New Leads', 
    color: 'bg-blue-500', 
    lightColor: 'bg-blue-100', 
    icon: User,
    description: 'Fresh prospects'
  },
  { 
    key: 'contacted', 
    label: 'Contacted', 
    color: 'bg-yellow-500', 
    lightColor: 'bg-yellow-100', 
    icon: Clock,
    description: 'Initial contact made'
  },
  { 
    key: 'qualified', 
    label: 'Qualified', 
    color: 'bg-purple-500', 
    lightColor: 'bg-purple-100', 
    icon: Star,
    description: 'Potential confirmed'
  },
  { 
    key: 'opportunity', 
    label: 'Opportunity', 
    color: 'bg-orange-500', 
    lightColor: 'bg-orange-100', 
    icon: Target,
    description: 'Active negotiations'
  },
  { 
    key: 'customer', 
    label: 'Customer', 
    color: 'bg-green-500', 
    lightColor: 'bg-green-100', 
    icon: CheckCircle,
    description: 'Deal closed'
  }
];

export default function StatusProgressionVisualizer({ clients, onStatusChange }: StatusProgressionVisualizerProps) {
  const [draggedClient, setDraggedClient] = useState<Client | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [animatingClients, setAnimatingClients] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const groupedClients = STAGES.reduce((acc, stage) => {
    acc[stage.key] = clients.filter(client => client.status === stage.key);
    return acc;
  }, {} as Record<string, Client[]>);

  const handleDragStart = (client: Client, e: React.DragEvent) => {
    setDraggedClient(client);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stageKey);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverStage(null);
    }
  };

  const handleDrop = (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    if (draggedClient && draggedClient.status !== newStage) {
      // Add animation
      setAnimatingClients(prev => new Set([...prev, draggedClient.id]));
      
      // Trigger status change
      if (onStatusChange) {
        onStatusChange(draggedClient.id, newStage);
      }
      
      // Remove animation after delay
      setTimeout(() => {
        setAnimatingClients(prev => {
          const newSet = new Set(prev);
          newSet.delete(draggedClient.id);
          return newSet;
        });
      }, 500);
    }
    
    setDraggedClient(null);
    setDragOverStage(null);
  };

  const getStageStats = (stageKey: string) => {
    const stageClients = groupedClients[stageKey] || [];
    const totalValue = stageClients.reduce((sum, client) => sum + (client.value || 0), 0);
    return {
      count: stageClients.length,
      value: totalValue
    };
  };

  return (
    <div className="w-full" ref={containerRef}>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Sales Pipeline Visualizer
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {STAGES.map((stage, index) => {
          const stats = getStageStats(stage.key);
          const isDragOver = dragOverStage === stage.key;
          const stageClients = groupedClients[stage.key] || [];
          const IconComponent = stage.icon;

          return (
            <div key={stage.key} className="relative">
              {/* Stage Header */}
              <Card className={`mb-4 ${isDragOver ? 'ring-2 ring-blue-400 ring-opacity-75' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-full ${stage.color} text-white`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{stage.label}</h3>
                        <p className="text-xs text-gray-500">{stage.description}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{stats.count} clients</span>
                    {stats.value > 0 && (
                      <span className="text-green-600 font-medium">
                        ₺{stats.value.toLocaleString()}
                      </span>
                    )}
                  </div>
                </CardHeader>
              </Card>

              {/* Drop Zone */}
              <div
                className={`min-h-96 p-4 rounded-lg border-2 border-dashed transition-all duration-200 ${
                  isDragOver 
                    ? 'border-blue-400 bg-blue-50 scale-105' 
                    : 'border-gray-200 bg-gray-50'
                }`}
                onDragOver={(e) => handleDragOver(e, stage.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.key)}
              >
                <div className="space-y-3">
                  {stageClients.map((client) => (
                    <div
                      key={client.id}
                      draggable
                      onDragStart={(e) => handleDragStart(client, e)}
                      className={`
                        p-3 bg-white rounded-lg shadow-sm border cursor-move 
                        hover:shadow-md transition-all duration-200 transform hover:scale-105
                        ${animatingClients.has(client.id) ? 'animate-pulse ring-2 ring-green-400' : ''}
                        ${draggedClient?.id === client.id ? 'opacity-50 rotate-2' : ''}
                      `}
                      data-testid={`client-card-${client.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">
                              {client.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium text-sm text-gray-800">
                              {client.name}
                            </h4>
                            {client.company && (
                              <p className="text-xs text-gray-500">{client.company}</p>
                            )}
                          </div>
                        </div>
                        
                        {client.value && client.value > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            ₺{client.value.toLocaleString()}
                          </Badge>
                        )}
                      </div>
                      
                      {client.lastContactDate && (
                        <div className="text-xs text-gray-400">
                          Last: {new Date(client.lastContactDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {stageClients.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <IconComponent className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No clients in this stage</p>
                      <p className="text-xs mt-1">Drop clients here to move them</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Arrow */}
              {index < STAGES.length - 1 && (
                <div className="hidden lg:block absolute -right-6 top-1/2 transform -translate-y-1/2 z-10">
                  <div className="p-2 bg-white rounded-full shadow-md border">
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Animation Particles */}
      {animatingClients.size > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {Array.from(animatingClients).map((clientId) => (
            <div
              key={clientId}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            >
              <div className="animate-ping">
                <Zap className="w-8 h-8 text-green-500" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold mb-1">How to Use</h4>
              <p className="text-sm text-gray-600">
                Drag and drop clients between stages to update their status. 
                Watch the animated transitions as your deals progress through the pipeline!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye } from "lucide-react";

export function DemoBanner() {
  const { isDemo } = useAuth();

  if (!isDemo) return null;

  return (
    <Alert className="mb-4 bg-amber-50 border-amber-200 text-amber-800">
      <Eye className="h-4 w-4" />
      <AlertDescription>
        You are viewing in demo mode. All data is read-only. Contact admin for editing permissions.
      </AlertDescription>
    </Alert>
  );
}
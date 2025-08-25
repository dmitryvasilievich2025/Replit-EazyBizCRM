import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    isAdminOrDirector: user?.role === "admin" || user?.role === "director",
    isDemo: user?.role === "demo",
    canEdit: user?.role !== "demo",
    canView: !!user,
  };
}
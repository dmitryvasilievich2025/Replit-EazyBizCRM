import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { User } from "@shared/schema";

interface UserSelectWithAddProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  excludeUserId?: string;
}

export function UserSelectWithAdd({ value, onValueChange, placeholder = "Select a user", excludeUserId }: UserSelectWithAddProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Получаем только пользователей с правами доступа (Users)
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/auth/users"],
  });

  // Фильтруем пользователей по поисковому запросу
  const filteredUsers = users.filter((user: User) => 
    user.id !== excludeUserId && 
    `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedUser = users.find((user: User) => user.id === value);

  return (
    <div className="space-y-2">
      <Select value={value || ""} onValueChange={onValueChange}>
        <SelectTrigger data-testid="select-user">
          <SelectValue placeholder={selectedUser ? `${selectedUser.firstName || selectedUser.first_name || ''} ${selectedUser.lastName || selectedUser.last_name || ''}` : placeholder} />
        </SelectTrigger>
        <SelectContent>
          <div className="p-2">
            <div className="flex items-center gap-2 mb-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8"
                data-testid="input-search-users"
              />
            </div>
          </div>
          {isLoading ? (
            <SelectItem value="loading" disabled>Loading...</SelectItem>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <SelectItem key={user.id} value={user.id} data-testid={`option-user-${user.id}`}>
                <div className="flex flex-col">
                  <span className="font-medium">{user.firstName || user.first_name || ''} {user.lastName || user.last_name || ''}</span>
                  <span className="text-sm text-muted-foreground">
                    {user.email} • {user.role}
                  </span>
                </div>
              </SelectItem>
            ))
          ) : (
            <SelectItem value="no-results" disabled>
              {searchTerm ? "No users found" : "No users available"}
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
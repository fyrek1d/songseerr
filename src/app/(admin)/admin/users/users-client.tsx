"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

type User = {
  id: string;
  email: string;
  username: string;
  role: string;
  createdAt: string;
  _count: { requests: number };
};

const roleColors: Record<string, string> = {
  admin: "bg-primary/10 text-primary",
  trusted: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  user: "bg-secondary text-secondary-foreground",
};

export function UsersClient({ users }: { users: User[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [changing, setChanging] = useState<string | null>(null);

  async function changeRole(id: string, role: string) {
    setChanging(id);
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setChanging(null);
    if (res.ok) {
      toast({ title: "Role updated", variant: "success" });
      router.refresh();
    } else {
      toast({ title: "Failed to update role", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Users</h1>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Requests</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <Badge className={roleColors[user.role]}>{user.role}</Badge>
                </TableCell>
                <TableCell>{user._count.requests}</TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(user.createdAt), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-right">
                  <Select
                    value={user.role}
                    onValueChange={(v) => v && changeRole(user.id, v)}
                    disabled={changing === user.id}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Standard</SelectItem>
                      <SelectItem value="trusted">Trusted</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
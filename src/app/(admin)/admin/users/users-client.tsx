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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { Lock, UserPlus, Trash2 } from "lucide-react";

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

const roleOptions = [
  { value: "user", label: "Standard" },
  { value: "trusted", label: "Trusted" },
  { value: "admin", label: "Admin" },
];

export function UsersClient({ users, currentUserId }: { users: User[]; currentUserId?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [changing, setChanging] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
  });
  // Password change
  const [passwordTarget, setPasswordTarget] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

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

  async function changePassword() {
    if (!passwordTarget) return;
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setChangingPassword(passwordTarget.id);
    const res = await fetch(`/api/users/${passwordTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    setChangingPassword(null);
    if (res.ok) {
      toast({ title: "Password changed", variant: "success" });
      setPasswordTarget(null);
      setNewPassword("");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      toast({ title: data?.error || "Failed to change password", variant: "destructive" });
    }
  }

  async function createUser() {
    if (!form.username || !form.email || !form.password) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (res.ok) {
      toast({ title: "User created", variant: "success" });
      setOpen(false);
      setForm({ username: "", email: "", password: "", role: "user" });
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      toast({
        title: data?.error || "Failed to create user",
        variant: "destructive",
      });
    }
  }

  async function deleteUser() {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    const res = await fetch(`/api/users/${deleteTarget.id}`, {
      method: "DELETE",
    });
    setDeleting(null);
    if (res.ok) {
      toast({ title: "User deleted", variant: "success" });
      setDeleteTarget(null);
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setDeleteTarget(null);
      toast({
        title: data?.error || "Failed to delete user",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <UserPlus className="h-4 w-4" />
            Add user
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add user</DialogTitle>
              <DialogDescription>
                Create a new account. Regular users&apos; requests require manual
                approval; trusted users are auto-approved.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-username">Username</Label>
                <Input
                  id="new-username"
                  value={form.username}
                  onChange={(e) => update("username", e.target.value)}
                  placeholder="e.g. jane"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-email">Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="jane@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => v && update("role", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={createUser} disabled={submitting}>
                {submitting ? "Creating..." : "Create user"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
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
                  <div className="flex items-center justify-end gap-2" style={{ pointerEvents: 'auto' }}>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={changingPassword === user.id || user.id === currentUserId}
                      title={
                        user.id === currentUserId
                          ? "You can't change your own password"
                          : "Change password"
                      }
                      onClick={() => {
                        setPasswordTarget(user);
                        setNewPassword("");
                      }}
                      style={{ pointerEvents: 'auto' }}
                    >
                      <Lock className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deleting === user.id || user.id === currentUserId}
                      title={
                        user.id === currentUserId
                          ? "You can't delete your own account"
                          : "Delete user"
                      }
                      onClick={() => setDeleteTarget(user)}
                      style={{ pointerEvents: 'auto' }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

<Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Delete user</DialogTitle>
             <DialogDescription>
               Delete {deleteTarget?.username || "this user"}? This also removes their
               requests and collections.
             </DialogDescription>
           </DialogHeader>
           <DialogFooter>
             <Button
               variant="outline"
               onClick={() => setDeleteTarget(null)}
             >
               Cancel
             </Button>
             <Button
               variant="destructive"
               onClick={deleteUser}
               disabled={deleting === deleteTarget?.id}
             >
               {deleting === deleteTarget?.id ? "Deleting..." : "Delete"}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
       <Dialog open={!!passwordTarget} onOpenChange={(o) => !o && setPasswordTarget(null)}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Change password</DialogTitle>
             <DialogDescription>
               Set a new password for {passwordTarget?.username || "this user"}.
             </DialogDescription>
           </DialogHeader>
           <div className="space-y-4">
             <Label htmlFor="new-user-password">New Password</Label>
             <Input
               id="new-user-password"
               type="password"
               value={newPassword}
               onChange={(e) => setNewPassword(e.target.value)}
               placeholder="Minimum 6 characters"
             />
           </div>
           <DialogFooter>
             <Button
               variant="outline"
               onClick={() => {
                 setPasswordTarget(null);
                 setNewPassword("");
               }}
             >
               Cancel
             </Button>
             <Button
               onClick={changePassword}
               disabled={changingPassword === passwordTarget?.id || !newPassword || newPassword.length < 6}
             >
               {changingPassword === passwordTarget?.id ? "Changing..." : "Change password"}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
    </div>
  );
}

"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { role, canEdit, canDelete, canDeploy } = useRole();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button variant="outline" onClick={logout}>
          Logout
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Welcome to Prompt Version Hub</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{user?.email}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Role</p>
            <Badge variant="secondary">{role}</Badge>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Permissions</p>
            <div className="flex gap-2 flex-wrap">
              {canEdit && <Badge>Can Edit</Badge>}
              {canDelete && <Badge>Can Delete</Badge>}
              {canDeploy && <Badge>Can Deploy</Badge>}
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Authentication is working! Next steps: Implement prompts list,
              sidebar, and other features.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

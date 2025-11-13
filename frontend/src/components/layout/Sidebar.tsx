"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Rocket,
  TestTube,
  Sparkles,
  UserSquare2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import type { UserRole } from "@/types/api";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Prompts", href: "/prompts", icon: FileText },
  { name: "My Prompts", href: "/prompts/my", icon: UserSquare2 },
  { name: "Deployments", href: "/deployments", icon: Rocket },
  { name: "Experiments", href: "/experiments", icon: TestTube },
  { name: "AI Generator", href: "/ai-generator", icon: Sparkles },
];

const collapsedWidth = 88;
const expandedWidth = 256;

const getRoleBadgeClass = (userRole: UserRole | null) => {
  switch (userRole) {
    case "admin":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "editor":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "viewer":
      return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    default:
      return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  }
};

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { role } = useRole();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  const getUserInitials = (email?: string) =>
    email ? email.substring(0, 2).toUpperCase() : "??";

  const handleLogoutAll = async () => {
    try {
      setIsLoggingOutAll(true);
      await logout();
      toast.success("Logged out successfully");
      setShowProfileModal(false);
    } catch (error) {
      toast.error("Failed to logout");
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 border-r border-border/60 bg-background/80 backdrop-blur-xl transition-[width] duration-300"
      style={{ width: isCollapsed ? collapsedWidth : expandedWidth }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center border-b border-border/50 px-3 py-4">
          <Link
            href="/"
            className={cn(
              "flex flex-1 items-center gap-2 text-sm font-semibold tracking-tight transition-opacity hover:opacity-80",
              isCollapsed ? "justify-center" : "",
            )}
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              PV
            </span>
            {!isCollapsed && (
              <span className="text-foreground">Prompt Version Hub</span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={onToggle}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-6">
          {navigation.map((item) => {
            let isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(`${item.href}/`));

            if (item.href === "/prompts") {
              isActive =
                pathname === "/prompts" ||
                (pathname.startsWith("/prompts/") &&
                  !pathname.startsWith("/prompts/my"));
            }

            if (item.href === "/prompts/my") {
              isActive =
                pathname === "/prompts/my" ||
                pathname.startsWith("/prompts/my/");
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  "hover:bg-secondary/40",
                  isCollapsed ? "justify-center" : "gap-3",
                  isActive
                    ? "bg-secondary text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span
                  className={cn(
                    "whitespace-nowrap transition-[margin,opacity,width] duration-200",
                    isCollapsed
                      ? "ml-0 w-0 overflow-hidden opacity-0"
                      : "opacity-100",
                  )}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="border-t border-border/50 px-2.5 py-3">
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "group flex w-full min-h-[60px] items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors",
                    "hover:bg-secondary/50",
                    isCollapsed ? "justify-center" : "justify-between",
                  )}
                >
                  <div
                    className={cn(
                      "flex w-full items-center gap-3",
                      isCollapsed ? "justify-center" : "justify-start",
                    )}
                  >
                    <Avatar className="h-8 w-8 shrink-0 bg-gradient-to-br from-blue-500 to-purple-600">
                      <AvatarFallback className="bg-transparent text-white text-sm font-semibold">
                        {getUserInitials(user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        "flex min-w-0 flex-1 flex-col justify-center space-y-1",
                        isCollapsed ? "hidden" : "",
                      )}
                    >
                      <span className="truncate text-sm font-medium text-foreground">
                        {user.email}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "w-fit max-w-full truncate capitalize font-normal",
                          getRoleBadgeClass(role),
                        )}
                      >
                        {role ?? "viewer"}
                      </Badge>
                    </div>
                    {!isCollapsed && (
                      <ChevronDown
                        className={cn(
                          "ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                          dropdownOpen ? "rotate-180" : "",
                        )}
                      />
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align={isCollapsed ? "center" : "end"}
                sideOffset={12}
                className="w-60"
              >
                <DropdownMenuLabel className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-foreground">
                    {user.email}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "w-fit capitalize font-normal",
                      getRoleBadgeClass(role),
                    )}
                  >
                    {role ?? "viewer"}
                  </Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowProfileModal(true)}
                  className="cursor-pointer text-foreground hover:bg-secondary/30 focus:bg-secondary/30"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-red-500 hover:bg-secondary/30 focus:bg-secondary/30 focus:text-red-500"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {user && (
        <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
          <DialogContent className="bg-background border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                Profile Settings
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Manage your account settings and preferences
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600">
                  <AvatarFallback className="bg-transparent text-white text-xl font-semibold">
                    {getUserInitials(user.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {user.email}
                  </h3>
                  <Badge
                    variant="outline"
                    className={cn(
                      "mt-1.5 capitalize font-normal",
                      getRoleBadgeClass(role),
                    )}
                  >
                    {role ?? "viewer"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-t border-border/50 pt-4">
                  <h4 className="mb-3 text-sm font-medium text-foreground">
                    Account Information
                  </h4>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="text-foreground">{user.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Role:</span>
                      <span className="text-foreground capitalize">
                        {role ?? "viewer"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-4">
                  <h4 className="mb-3 text-sm font-medium text-foreground">
                    Preferences
                  </h4>
                  <ThemeToggle />
                </div>

                <div className="border-t border-border/50 pt-4">
                  <h4 className="mb-3 text-sm font-medium text-foreground">
                    Security
                  </h4>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-border bg-background/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-colors"
                    onClick={handleLogoutAll}
                    disabled={isLoggingOutAll}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {isLoggingOutAll
                      ? "Logging out..."
                      : "Logout from all devices"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </aside>
  );
}

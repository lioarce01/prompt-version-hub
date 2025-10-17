"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
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
import { LogOut, Settings, ChevronDown } from "lucide-react";

export function Header() {
  const { user, logout } = useAuth();
  const { role } = useRole();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const getUserInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
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

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-border/50 bg-background">
        <div className="flex h-full items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold hover:opacity-80 transition-opacity"
          >
            <span className="text-white">Prompt Version Hub</span>
          </Link>

          <div className="flex items-center gap-4">
            {user && (
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 hover:bg-white/5 h-9 px-2"
                  >
                    <Avatar className="h-7 w-7 bg-gradient-to-br from-blue-500 to-purple-600">
                      <AvatarFallback className="bg-transparent text-white text-xs font-semibold">
                        {getUserInitials(user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
                        dropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white">
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">{user.email}</span>
                    <Badge
                      variant="outline"
                      className={`mt-1.5 w-fit text-xs capitalize font-normal ${getRoleBadgeClass(role)}`}
                    >
                      {role}
                    </Badge>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowProfileModal(true)}
                    className="cursor-pointer text-gray-900 hover:bg-gray-100 focus:bg-gray-100 focus:text-gray-900"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={logout}
                    className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Profile Modal */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="bg-[#0a0a0a]">
          <DialogHeader>
            <DialogTitle className="text-white">Profile Settings</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Manage your account settings and preferences
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600">
                <AvatarFallback className="bg-transparent text-white text-xl font-semibold">
                  {user && getUserInitials(user.email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-white">{user?.email}</h3>
                <Badge
                  variant="outline"
                  className={`mt-1.5 capitalize font-normal ${getRoleBadgeClass(role)}`}
                >
                  {role}
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border-t border-border/50 pt-4">
                <h4 className="text-sm font-medium text-white mb-3">Account Information</h4>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="text-white">{user?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Role:</span>
                    <span className="text-white capitalize">{role}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Rocket,
  TestTube,
  Sparkles,
  UserSquare2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Prompts",
    href: "/prompts",
    icon: FileText,
  },
  {
    name: "My Prompts",
    href: "/prompts/my",
    icon: UserSquare2,
  },
  {
    name: "Deployments",
    href: "/deployments",
    icon: Rocket,
  },
  {
    name: "Experiments",
    href: "/experiments",
    icon: TestTube,
  },
  {
    name: "AI Generator",
    href: "/ai-generator",
    icon: Sparkles,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-64 border-r border-border/50 bg-background/50 backdrop-blur-xl">
      <nav className="flex flex-col gap-1 p-4">
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
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                "hover:bg-secondary/50",
                isActive
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

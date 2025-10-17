"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Rocket,
  TestTube,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  {
    name: "Prompts",
    href: "/",
    icon: FileText,
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
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-64 border-r border-border/50 bg-background/50 backdrop-blur-xl">
      <nav className="flex flex-col gap-1 p-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

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

"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-9 w-full items-center justify-between rounded-lg border border-border/50 bg-secondary/20 px-3 py-2">
        <span className="text-sm text-muted-foreground">Theme</span>
        <div className="h-4 w-4" />
      </div>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className={cn(
        "group flex h-9 w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all",
        "border-border bg-background/50 hover:bg-accent",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background",
      )}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      <span className="text-muted-foreground group-hover:text-foreground transition-colors">
        Theme
      </span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-foreground/80 capitalize font-medium">
          {theme}
        </span>
        <div className="relative h-4 w-4 text-foreground/70">
          <Sun
            className={cn(
              "absolute inset-0 h-4 w-4 transition-all",
              theme === "light"
                ? "rotate-0 scale-100 opacity-100"
                : "rotate-90 scale-0 opacity-0",
            )}
          />
          <Moon
            className={cn(
              "absolute inset-0 h-4 w-4 transition-all",
              theme === "dark"
                ? "rotate-0 scale-100 opacity-100"
                : "-rotate-90 scale-0 opacity-0",
            )}
          />
        </div>
      </div>
    </button>
  );
}

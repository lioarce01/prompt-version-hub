import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date as relative time (e.g., "3 days ago")
export function formatRelativeDate(dateString: string): string {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
}

// Format success_rate (0.0-1.0) as percentage string
export function formatSuccessRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

// Format cost from cents to dollars
export function formatCost(cents: number | null): string {
  if (cents === null) return "N/A";
  return `$${(cents / 100).toFixed(4)}`;
}

// Format date for charts (e.g., "2024-09-15" -> "Sep 15")
export function formatChartDate(dateString: string): string {
  return format(new Date(dateString), "MMM dd");
}

// Format month for charts (e.g., "2024-09" -> "Sep")
export function formatChartMonth(monthString: string): string {
  return format(new Date(`${monthString}-01`), "MMM");
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Fleet was scaled from 600 to 40 vehicles, so INR savings now land
// under 1 lakh — show "k" below that threshold instead of "0.XXL".
export function formatINR(amountInr: number): string {
  if (amountInr >= 100000) {
    return `₹${(amountInr / 100000).toFixed(2)}L`
  }
  return `₹${Math.round(amountInr / 1000)}k`
}

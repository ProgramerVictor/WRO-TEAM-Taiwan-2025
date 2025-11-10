import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

export function formatLatency(ms) {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
}

export function getConnectionStatus(connected) {
    return {
        text: connected ? "Connected" : "Disconnected",
        color: connected ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
        dotColor: connected ? "bg-emerald-500" : "bg-red-500"
    }
}

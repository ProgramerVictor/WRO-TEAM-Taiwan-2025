import React from "react"
import { cva } from "class-variance-authority"
import { motion } from "framer-motion"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
    {
        variants: {
            variant: {
                default: "border-transparent bg-gray-900 text-gray-50 dark:bg-gray-50 dark:text-gray-900",
                secondary: "border-transparent bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50",
                destructive: "border-transparent bg-red-500 text-gray-50 dark:bg-red-900 dark:text-red-50",
                success: "border-transparent bg-emerald-500 text-white dark:bg-emerald-900 dark:text-emerald-50",
                warning: "border-transparent bg-yellow-500 text-white dark:bg-yellow-900 dark:text-yellow-50",
                outline: "text-gray-950 dark:text-gray-50 border border-gray-200 dark:border-gray-700",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

function Badge({ className, variant, children, ...props }) {
    return (
        <motion.div
            className={cn(badgeVariants({ variant }), className)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            {...props}
        >
            {children}
        </motion.div>
    )
}

const StatusDot = ({ connected, className }) => (
    <motion.div
        className={cn(
            "h-2 w-2 rounded-full",
            connected ? "bg-emerald-500" : "bg-red-500",
            className
        )}
        animate={{
            scale: connected ? [1, 1.2, 1] : 1,
            opacity: connected ? [1, 0.7, 1] : 1
        }}
        transition={{
            duration: 2,
            repeat: connected ? Infinity : 0,
            ease: "easeInOut"
        }}
    />
)

export { Badge, StatusDot, badgeVariants }

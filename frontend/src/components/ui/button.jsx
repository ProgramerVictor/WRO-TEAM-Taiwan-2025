import React from "react"
import { cva } from "class-variance-authority"
import { motion } from "framer-motion"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 typo-accessible-focus",
    {
        variants: {
            variant: {
                default: "bg-blue-600 text-white shadow hover:bg-blue-700 focus-visible:ring-blue-500",
                destructive: "bg-red-600 text-white shadow hover:bg-red-700 focus-visible:ring-red-500",
                outline: "border border-gray-200 bg-white shadow-sm hover:bg-gray-50 focus-visible:ring-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800",
                secondary: "bg-gray-100 text-gray-900 shadow-sm hover:bg-gray-200 focus-visible:ring-gray-500 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700",
                ghost: "hover:bg-gray-100 focus-visible:ring-gray-500 dark:hover:bg-gray-800",
                link: "text-blue-600 underline-offset-4 hover:underline focus-visible:ring-blue-500"
            },
            size: {
                default: "h-14 px-6 typo-interactive-secondary",
                sm: "h-11 px-4 typo-interactive-tertiary",
                lg: "h-16 px-10 typo-interactive-primary",
                elderly: "h-20 px-12 typo-elderly-primary-action",
                icon: "h-14 w-14 typo-interactive-secondary",
                "icon-lg": "h-16 w-16 typo-interactive-primary",
                "icon-elderly": "h-20 w-20 typo-elderly-primary-action"
            }
        },
        defaultVariants: {
            variant: "default",
            size: "default"
        }
    }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, children, ...props }, ref) => {
    return (
        <motion.button
            className={cn(buttonVariants({ variant, size, className }))}
            ref={ref}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            {...props}
        >
            {children}
        </motion.button>
    )
})
Button.displayName = "Button"

export { Button, buttonVariants }

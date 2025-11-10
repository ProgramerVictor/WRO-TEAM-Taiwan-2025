import React from "react"
import { motion } from "framer-motion"
import { cn } from "../../lib/utils"

const Input = React.forwardRef(({ className, type, error, ...props }, ref) => {
    return (
        <motion.input
            type={type}
            className={cn(
                "flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:placeholder:text-gray-400 dark:focus:border-blue-400",
                error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                className
            )}
            ref={ref}
            whileFocus={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            {...props}
        />
    )
})
Input.displayName = "Input"

const Label = React.forwardRef(({ className, ...props }, ref) => (
    <label
        ref={ref}
        className={cn(
            "text-sm font-medium leading-none text-gray-700 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-gray-300",
            className
        )}
        {...props}
    />
))
Label.displayName = "Label"

export { Input, Label }

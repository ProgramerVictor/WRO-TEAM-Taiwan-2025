import React from "react"
import { motion } from "framer-motion"
import { Moon, Sun } from "lucide-react"
import { Button } from "./button"
import { cn } from "../../lib/utils"

export function ThemeToggle({ isDark, onToggle, className }) {
    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn("relative h-10 w-10", className)}
            aria-label={isDark ? "切換到淺色模式" : "切換到深色模式"}
        >
            <motion.div
                initial={false}
                animate={{
                    scale: isDark ? 0 : 1,
                    opacity: isDark ? 0 : 1,
                    rotate: isDark ? 90 : 0,
                }}
                transition={{ duration: 0.2 }}
                className="absolute"
            >
                <Sun className="h-4 w-4" />
            </motion.div>
            <motion.div
                initial={false}
                animate={{
                    scale: isDark ? 1 : 0,
                    opacity: isDark ? 1 : 0,
                    rotate: isDark ? 0 : -90,
                }}
                transition={{ duration: 0.2 }}
                className="absolute"
            >
                <Moon className="h-4 w-4" />
            </motion.div>
        </Button>
    )
}

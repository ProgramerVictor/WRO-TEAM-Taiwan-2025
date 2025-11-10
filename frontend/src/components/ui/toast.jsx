import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

// Toast Context for global toast management
const ToastContext = React.createContext();

export function ToastProvider({ children }) {
    const [toasts, setToasts] = React.useState([]);

    const addToast = React.useCallback((toast) => {
        const id = Date.now().toString();
        const newToast = { id, ...toast };
        setToasts(prev => [...prev, newToast]);

        // Auto remove after duration
        if (toast.duration !== 0) {
            setTimeout(() => {
                removeToast(id);
            }, toast.duration || 5000);
        }

        return id;
    }, []);

    const removeToast = React.useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const value = React.useMemo(() => ({
        toasts,
        addToast,
        removeToast
    }), [toasts, addToast, removeToast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastContainer />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = React.useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

function ToastContainer() {
    const { toasts } = useToast();

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
            <AnimatePresence>
                {toasts.map(toast => (
                    <Toast key={toast.id} {...toast} />
                ))}
            </AnimatePresence>
        </div>
    );
}

function Toast({ id, type = "info", title, description, action, duration = 5000 }) {
    const { removeToast } = useToast();
    const [isVisible, setIsVisible] = React.useState(true);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => removeToast(id), 150);
    };

    const icons = {
        success: CheckCircle,
        error: AlertCircle,
        warning: AlertTriangle,
        info: Info
    };

    const colors = {
        success: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
        error: "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200",
        warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
        info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200"
    };

    const IconComponent = icons[type];

    return (
        <motion.div
            initial={{ opacity: 0, x: 300, scale: 0.9 }}
            animate={{
                opacity: isVisible ? 1 : 0,
                x: isVisible ? 0 : 300,
                scale: isVisible ? 1 : 0.9
            }}
            exit={{ opacity: 0, x: 300, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`rounded-xl border-2 p-4 shadow-lg backdrop-blur-md ${colors[type]}`}
            role="alert"
            aria-live="polite"
        >
            <div className="flex items-start gap-3">
                <IconComponent className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                    {title && (
                        <div className="typo-content-primary font-semibold">
                            {title}
                        </div>
                    )}
                    {description && (
                        <div className="typo-content-secondary">
                            {description}
                        </div>
                    )}
                    {action && (
                        <div className="mt-2">
                            {action}
                        </div>
                    )}
                </div>
                <motion.button
                    onClick={handleClose}
                    className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    aria-label="關閉通知"
                >
                    <X className="h-4 w-4" />
                </motion.button>
            </div>
        </motion.div>
    );
}

export { Toast };

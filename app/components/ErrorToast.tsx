"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, AlertTriangle, Info, CheckCircle, AlertCircle } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "error" | "warning" | "info" | "success";
  title: string;
  message: string;
  duration?: number;
}

interface ErrorToastProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

const Toast: React.FC<ErrorToastProps> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const showTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onRemoveRef = useRef(onRemove);

  // Update the onRemove ref when it changes
  useEffect(() => {
    onRemoveRef.current = onRemove;
  }, [onRemove]);

  const handleRemove = useCallback(() => {
    console.log(`Manual dismiss of toast ${toast.id}`);
    setIsVisible(false);
    setTimeout(() => onRemoveRef.current(toast.id), 300);
  }, [toast.id]);

  useEffect(() => {
    console.log(`Toast ${toast.id} duration:`, toast.duration);

    // Animate in
    showTimerRef.current = setTimeout(() => {
      console.log(`Showing toast ${toast.id}`);
      setIsVisible(true);
    }, 100);

    // Auto-dismiss timer
    if (toast.duration && toast.duration > 0) {
      console.log(
        `Setting auto-dismiss timer for toast ${toast.id} in ${toast.duration}ms`
      );
      dismissTimerRef.current = setTimeout(() => {
        console.log(`Auto-dismissing toast ${toast.id}`);
        setIsVisible(false);
        setTimeout(() => {
          console.log(`Removing toast ${toast.id} from DOM`);
          onRemoveRef.current(toast.id);
        }, 300);
      }, toast.duration);
    }

    return () => {
      console.log(`Clearing timers for toast ${toast.id}`);
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
      }
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [toast.id, toast.duration]); // Removed onRemove from dependencies

  const getIcon = () => {
    switch (toast.type) {
      case "error":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case "error":
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      case "warning":
        return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
      case "info":
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
      case "success":
        return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
      default:
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
    }
  };

  return (
    <div
      className={`
        ${getBackgroundColor()}
        border rounded-lg p-4 shadow-lg transition-all duration-300 ease-in-out
        ${
          isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full"
        }
        max-w-sm w-full
      `}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="ml-3 flex-1">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            {toast.title}
          </h4>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {toast.message}
          </p>
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={handleRemove}
            className="inline-flex text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onRemove,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (toast: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    const finalToast: ToastMessage = {
      id,
      type: toast.type,
      title: toast.title,
      message: toast.message,
      duration: toast.duration !== undefined ? toast.duration : 5000,
    };
    console.log(`Adding toast ${id} with duration:`, finalToast.duration);
    setToasts((prev) => [...prev, finalToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const showError = (title: string, message: string, duration?: number) => {
    addToast({ type: "error", title, message, duration });
  };

  const showWarning = (title: string, message: string, duration?: number) => {
    addToast({ type: "warning", title, message, duration });
  };

  const showInfo = (title: string, message: string, duration?: number) => {
    addToast({ type: "info", title, message, duration });
  };

  const showSuccess = (title: string, message: string, duration?: number) => {
    addToast({ type: "success", title, message, duration });
  };

  return {
    toasts,
    addToast,
    removeToast,
    showError,
    showWarning,
    showInfo,
    showSuccess,
  };
}

"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff, RotateCcw } from "lucide-react";

type Status = "online" | "offline" | "checking";

interface StatusResponse {
  status: "online" | "offline";
  message: string;
  timestamp: string;
}

export function StatusIndicator() {
  const [status, setStatus] = useState<Status>("checking");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [canRecheck, setCanRecheck] = useState(true);

  const checkStatus = async () => {
    setStatus("checking");
    try {
      // Add cache-busting parameter to prevent cached responses
      const timestamp = Date.now();
      const response = await fetch(`/api/status?t=${timestamp}`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: StatusResponse = await response.json();
      setStatus(data.status);
      setLastChecked(new Date());

      // Set 5-minute cooldown for recheck
      setCanRecheck(false);
      setTimeout(() => setCanRecheck(true), 5 * 60 * 1000);
    } catch (error) {
      console.error("Status check failed:", error);
      setStatus("offline");
      setLastChecked(new Date());
      setCanRecheck(false);
      setTimeout(() => setCanRecheck(true), 5 * 60 * 1000);
    }
  };

  // Initial check on mount and reset cooldown on page refresh
  useEffect(() => {
    // Reset cooldown on page refresh - user should be able to recheck immediately
    setCanRecheck(true);

    // Small delay to ensure component is fully mounted and server state is stable
    const timer = setTimeout(() => {
      checkStatus();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case "online":
        return <Wifi className="h-4 w-4 text-green-500" />;
      case "offline":
        return <WifiOff className="h-4 w-4 text-red-500" />;
      case "checking":
        return (
          <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "online":
        return "Model Online";
      case "offline":
        return "Model Offline";
      case "checking":
        return "Checking...";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "online":
        return "text-green-600 dark:text-green-400";
      case "offline":
        return "text-red-600 dark:text-red-400";
      case "checking":
        return "text-blue-600 dark:text-blue-400";
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Status Icon and Text */}
      <div className="flex items-center space-x-1">
        {getStatusIcon()}
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      {/* Recheck Button */}
      <button
        onClick={checkStatus}
        disabled={!canRecheck || status === "checking"}
        className={`p-1 rounded-lg transition-all duration-200 ${
          canRecheck && status !== "checking"
            ? "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            : "text-gray-400 dark:text-gray-600 cursor-not-allowed"
        }`}
        title={
          !canRecheck
            ? "Recheck available in 5 minutes"
            : "Recheck model status"
        }
      >
        <RotateCcw className="h-4 w-4" />
      </button>

      {/* Last checked time */}
      {lastChecked && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {lastChecked.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      )}
    </div>
  );
}

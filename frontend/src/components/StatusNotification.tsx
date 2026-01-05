/**
 * StatusNotification component - Displays success/error messages
 *
 * This component provides user feedback for various operations
 * such as installation, upload, and workflow registration.
 */

import { useEffect, useState } from "react";
import { StatusNotificationIds } from "./StatusNotification.ids";

export type NotificationType = "success" | "error" | "info" | "warning";

interface StatusNotificationProps {
  /** Type of notification */
  type: NotificationType;
  /** Message to display */
  message: string;
  /** Optional title */
  title?: string;
  /** Callback when notification is dismissed */
  onDismiss?: () => void;
  /** Auto-dismiss after milliseconds (0 = no auto-dismiss) */
  autoDismiss?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * StatusNotification component
 */
export const StatusNotification = ({
  type,
  message,
  title,
  onDismiss,
  autoDismiss = 0,
  className = "",
}: StatusNotificationProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoDismiss > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, autoDismiss);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) {
    return null;
  }

  const typeStyles = {
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
  };

  const iconStyles = {
    success: "✓",
    error: "✕",
    info: "ℹ",
    warning: "⚠",
  };

  return (
    <div
      className={`border rounded-lg p-4 ${typeStyles[type]} ${className}`}
      role="alert"
      data-testid={StatusNotificationIds.notification}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-lg font-bold">{iconStyles[type]}</span>
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3
              className="text-sm font-semibold mb-1"
              data-testid={StatusNotificationIds.title}
            >
              {title}
            </h3>
          )}
          <p className="text-sm" data-testid={StatusNotificationIds.message}>
            {message}
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={handleDismiss}
            className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600"
            aria-label="Dismiss notification"
            data-testid={StatusNotificationIds.dismissButton}
          >
            <span className="text-xl">×</span>
          </button>
        )}
      </div>
    </div>
  );
};

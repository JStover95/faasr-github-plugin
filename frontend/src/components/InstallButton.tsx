/**
 * InstallButton component - Button that initiates GitHub App installation
 *
 * This component renders a button that, when clicked, redirects the user
 * to the GitHub App installation page.
 */

import { useState } from "react";
import { authApi } from "../services/api";

interface InstallButtonProps {
  /** Callback when installation is initiated */
  onInstallStart?: () => void;
  /** Callback when installation fails */
  onInstallError?: (error: Error) => void;
  /** Button text (default: "Install FaaSr") */
  label?: string;
  /** Disable button */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * InstallButton component
 */
export const InstallButton = ({
  onInstallStart,
  onInstallError,
  label = "Install FaaSr",
  disabled = false,
  className = "",
}: InstallButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (disabled || isLoading) {
      return;
    }

    setIsLoading(true);
    onInstallStart?.();

    try {
      await authApi.install();
      // Note: authApi.install() will redirect the page, so we won't reach here
    } catch (error) {
      setIsLoading(false);
      onInstallError?.(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={`px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors ${className}`}
      type="button"
    >
      {isLoading ? "Redirecting..." : label}
    </button>
  );
};

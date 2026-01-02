/**
 * InstallPage component - Installation flow page with status messages
 *
 * This page handles the GitHub App installation callback and displays
 * installation status to the user.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { StatusNotification } from "../components/StatusNotification";
import { authApi } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import type { InstallationResponse } from "../types";

/**
 * InstallPage component
 */
export const InstallPage = () => {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const [status, setStatus] = useState<{
    type: "success" | "error" | "info";
    message: string;
    title?: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processInstallation = async () => {
      // Get query parameters from URL
      const urlParams = new URLSearchParams(window.location.search);
      const installationId = urlParams.get("installation_id");
      const setupAction = urlParams.get("setup_action");

      // If installation ID is not found, set error status
      if (!installationId) {
        setStatus({
          type: "error",
          title: "Installation Error",
          message: "Missing installation ID. Please try installing again.",
        });
        setIsProcessing(false);
        return;
      }

      // Process installation
      try {
        setStatus({
          type: "info",
          message: "Processing installation...",
        });

        // Call auth API to handle installation callback
        const response: InstallationResponse = await authApi.callback(
          installationId,
          setupAction || undefined
        );

        // If installation succeeds, set success status
        if (response.success) {
          setStatus({
            type: "success",
            title: "Installation Successful",
            message: `Welcome, ${response.user.login}! Your fork has been created at ${response.fork.url}`,
          });

          // Refresh session to get updated auth state
          await refreshSession();

          // Redirect to upload page after a short delay
          setTimeout(() => {
            navigate("/upload");
          }, 2000);
        } else {
          // If installation fails, set error status
          setStatus({
            type: "error",
            title: "Installation Failed",
            message: response.message || "Installation could not be completed.",
          });
        }
      } catch (error) {
        // If installation fails, set error status
        setStatus({
          type: "error",
          title: "Installation Error",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred during installation.",
        });
      } finally {
        // Set processing state to false
        setIsProcessing(false);
      }
    };

    processInstallation();
  }, [navigate, refreshSession]);

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Installing FaaSr
        </h1>
      </div>

      {status && (
        <div className="mb-6">
          <StatusNotification
            type={status.type}
            message={status.message}
            title={status.title}
            autoDismiss={status.type === "success" ? 0 : 0} // Don't auto-dismiss
          />
        </div>
      )}

      {isProcessing && (
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Processing installation...</p>
        </div>
      )}

      {!isProcessing && status?.type === "error" && (
        <div className="text-center mt-6">
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </button>
        </div>
      )}
    </div>
  );
};

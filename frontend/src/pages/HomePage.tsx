/**
 * HomePage component - Landing page with Install FaaSr button
 *
 * This is the main landing page where users can initiate the installation
 * of the FaaSr GitHub App.
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { InstallButton } from "../components/InstallButton";
import { useAuth } from "../hooks/useAuth";

/**
 * HomePage component
 */
export const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  const handleInstallStart = () => {
    // Installation will redirect to GitHub, so we don't need to navigate
  };

  const handleInstallError = (error: Error) => {
    console.error("Installation error:", error);
    // Could show error notification here
  };

  // If already authenticated, redirect to upload page
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/upload");
    }
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to FaaSr
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Install FaaSr to get started with workflow management on GitHub
        </p>
      </div>

      <div className="flex justify-center">
        <InstallButton
          onInstallStart={handleInstallStart}
          onInstallError={handleInstallError}
        />
      </div>

      <div className="mt-12 text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          What is FaaSr?
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          FaaSr is a GitHub App that helps you manage and register workflow
          configurations. After installation, you can upload workflow JSON files
          and automatically trigger registration workflows.
        </p>
      </div>
    </div>
  );
};

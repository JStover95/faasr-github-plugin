/**
 * UploadPage component - Workflow file upload page
 *
 * This page allows authenticated users to upload workflow JSON files.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { FileUpload } from "../components/FileUpload";
import { StatusNotification } from "../components/StatusNotification";
import type { UploadResponse } from "../types";

/**
 * UploadPage component
 */
export const UploadPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "warning";
    message: string;
    title?: string;
  } | null>(null);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  const handleUploadSuccess = (response: UploadResponse) => {
    setNotification({
      type: "success",
      title: "Upload Successful",
      message: response.message || "Workflow uploaded and registration triggered successfully",
    });
  };

  const handleUploadError = (error: Error) => {
    setNotification({
      type: "error",
      title: "Upload Failed",
      message: error.message || "Failed to upload workflow file",
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Upload Workflow
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Upload your workflow JSON file to register it with FaaSr
        </p>
      </div>

      {notification && (
        <div className="mb-6">
          <StatusNotification
            type={notification.type}
            message={notification.message}
            title={notification.title}
            onDismiss={() => setNotification(null)}
            autoDismiss={notification.type === "success" ? 5000 : 0}
          />
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-8">
        <FileUpload
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
        />
      </div>
    </div>
  );
};

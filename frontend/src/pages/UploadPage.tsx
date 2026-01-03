/**
 * UploadPage component - Workflow file upload page
 *
 * This page allows authenticated users to upload workflow JSON files.
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/**
 * UploadPage component
 */
export const UploadPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

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

      <div className="bg-white rounded-lg shadow-md p-8">
        <p className="text-gray-600 text-center">
          Workflow upload functionality coming soon...
        </p>
      </div>
    </div>
  );
};

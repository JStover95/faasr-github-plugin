/**
 * FileUpload component - Workflow JSON file upload with validation
 *
 * This component provides file selection, JSON validation, and upload progress
 * for workflow JSON files.
 */

import { useState, useRef, ChangeEvent } from "react";
import { workflowsApi } from "../services/api";
import type { UploadResponse } from "../types";
import { FileUploadIds } from "./FileUpload.ids";

export interface FileUploadProps {
  /** Callback when upload succeeds */
  onUploadSuccess?: (response: UploadResponse) => void;
  /** Callback when upload fails */
  onUploadError?: (error: Error) => void;
  /** Callback when file is selected */
  onFileSelect?: (file: File) => void;
  /** Additional CSS classes */
  className?: string;
  /** Disable upload button */
  disabled?: boolean;
}

/**
 * FileUpload component
 */
export const FileUpload = ({
  onUploadSuccess,
  onUploadError,
  onFileSelect,
  className = "",
  disabled = false,
}: FileUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Validate JSON file content
   */
  const validateJSON = (
    file: File
  ): Promise<{ valid: boolean; error: string | null }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          JSON.parse(content);
          resolve({ valid: true, error: null });
        } catch (error) {
          resolve({
            valid: false,
            error: "Invalid JSON: File must contain valid JSON syntax",
          });
        }
      };

      reader.onerror = () => {
        resolve({ valid: false, error: "Failed to read file" });
      };

      reader.readAsText(file);
    });
  };

  /**
   * Validate file name
   */
  const validateFileName = (
    fileName: string
  ): { valid: boolean; error: string | null } => {
    // Check file extension
    if (!fileName.endsWith(".json")) {
      return { valid: false, error: "File must have .json extension" };
    }

    // Check for path traversal
    if (fileName.includes("/") || fileName.includes("\\")) {
      return {
        valid: false,
        error: "File name cannot contain path separators",
      };
    }

    // Check file name pattern
    const fileNamePattern = /^[a-zA-Z0-9_-]+\.json$/;
    if (!fileNamePattern.test(fileName)) {
      return {
        valid: false,
        error:
          "File name must contain only letters, numbers, hyphens, and underscores",
      };
    }

    return { valid: true, error: null };
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setSelectedFile(null);
    setValidationError(null);
    setUploadProgress(null);

    // Validate file name
    const nameValidation = validateFileName(file.name);
    if (!nameValidation.valid) {
      setValidationError(nameValidation.error);
      return;
    }

    // Validate file size (1MB limit)
    const maxSize = 1024 * 1024; // 1MB
    if (file.size > maxSize) {
      setValidationError(`File size exceeds maximum of ${maxSize} bytes`);
      return;
    }

    // Validate JSON content
    const jsonValidation = await validateJSON(file);
    if (!jsonValidation.valid) {
      setValidationError(jsonValidation.error);
      return;
    }

    // File is valid
    setSelectedFile(file);
    setValidationError(null);
    onFileSelect?.(file);
  };

  /**
   * Handle upload
   */
  const handleUpload = async () => {
    if (!selectedFile || isUploading || disabled) {
      return;
    }

    setIsUploading(true);
    setValidationError(null);
    setUploadProgress("Uploading file...");

    try {
      const response = await workflowsApi.upload(selectedFile);
      setUploadProgress("Upload successful!");
      onUploadSuccess?.(response);

      // Reset after successful upload
      setTimeout(() => {
        setSelectedFile(null);
        setUploadProgress(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }, 2000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      setValidationError(errorMessage);
      setUploadProgress(null);
      onUploadError?.(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Handle file input click
   */
  const handleFileInputClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={className}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Workflow JSON File
        </label>
        <div className="flex items-center space-x-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || isUploading}
            data-testid={FileUploadIds.fileInput}
          />
          <button
            type="button"
            onClick={handleFileInputClick}
            disabled={disabled || isUploading}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid={FileUploadIds.chooseFileButton}
          >
            Choose File
          </button>
          {selectedFile && (
            <span
              className="text-sm text-gray-600"
              data-testid={FileUploadIds.selectedFileName}
            >
              {selectedFile.name}
            </span>
          )}
        </div>
      </div>

      {validationError && (
        <div
          className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm"
          data-testid={FileUploadIds.validationError}
        >
          {validationError}
        </div>
      )}

      {uploadProgress && (
        <div
          className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-md text-sm"
          data-testid={FileUploadIds.uploadProgress}
        >
          {uploadProgress}
        </div>
      )}

      <button
        type="button"
        onClick={handleUpload}
        disabled={!selectedFile || isUploading || disabled}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid={FileUploadIds.uploadButton}
      >
        {isUploading ? "Uploading..." : "Upload Workflow"}
      </button>
    </div>
  );
};

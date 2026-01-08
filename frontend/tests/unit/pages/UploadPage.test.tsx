/**
 * Tests for UploadPage component
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UploadPageStack } from "../../__mocks__/UploadPage.mock";
import {
  defaultMockAuth,
  createAuthenticatedMockAuth,
  createLoadingMockAuth,
} from "../../__mocks__/useAuth.mock";

// Mock dependencies
jest.mock("../../../src/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../../src/services/api", () => ({
  workflowsApi: {
    upload: jest.fn(),
  },
}));

describe("UploadPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  it("renders loading state when authentication is loading", () => {
    const authValue = createLoadingMockAuth();
    render(<UploadPageStack authValue={authValue} />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("redirects to home when not authenticated", async () => {
    render(<UploadPageStack authValue={defaultMockAuth} />);

    await waitFor(
      () => {
        expect(screen.getByTestId("home-page-mock")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("renders upload page content when authenticated", () => {
    const authValue = createAuthenticatedMockAuth();
    render(<UploadPageStack authValue={authValue} />);

    // Check for the heading specifically (not the button)
    expect(
      screen.getByRole("heading", { name: "Upload Workflow" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Upload your workflow JSON file to register it with FaaSr/i
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/select workflow json file/i)).toBeInTheDocument();
  });

  it("does not redirect when loading", () => {
    const authValue = createLoadingMockAuth();
    render(<UploadPageStack authValue={authValue} />);

    // Should show loading state, not redirect
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("displays success notification when upload succeeds", async () => {
    const authValue = createAuthenticatedMockAuth({
      user: {
        id: "test-id",
        email: "github-123@faasr.app",
        app_metadata: {},
        user_metadata: {
          installationId: "123456",
          githubLogin: "testuser",
          githubId: 123,
        },
        aud: "authenticated",
        created_at: new Date().toISOString(),
      },
    } as any);

    const { workflowsApi } = require("../../../src/services/api");
    const { FileUploadIds } = require("../../../src/components/FileUpload.ids");
    const mockResponse = {
      success: true,
      message: "Workflow uploaded successfully",
      fileName: "test.json",
      commitSha: "abc123",
    };

    (workflowsApi.upload as jest.Mock).mockResolvedValue(mockResponse);

    render(<UploadPageStack authValue={authValue} />);

    // Upload a file using the file input test id
    const fileInput = screen.getByTestId(
      FileUploadIds.fileInput
    ) as HTMLInputElement;
    const file = new File(['{"test": "data"}'], "test.json", {
      type: "application/json",
    });

    const user = userEvent.setup();
    await user.upload(fileInput, file);

    // Wait for file to be selected
    await waitFor(() => {
      expect(
        screen.getByTestId(FileUploadIds.selectedFileName)
      ).toHaveTextContent("test.json");
    });

    // Click upload button
    const uploadButton = screen.getByTestId(FileUploadIds.uploadButton);
    await user.click(uploadButton);

    // Wait for success notification - use test IDs to avoid conflicts with FileUpload messages
    await waitFor(() => {
      const {
        StatusNotificationIds,
      } = require("../../../src/components/StatusNotification.ids");
      expect(screen.getByTestId(StatusNotificationIds.title)).toHaveTextContent(
        /upload successful/i
      );
      expect(
        screen.getByTestId(StatusNotificationIds.message)
      ).toHaveTextContent(/workflow uploaded successfully/i);
    });
  });

  it("displays error notification when upload fails", async () => {
    const authValue = createAuthenticatedMockAuth({
      user: {
        id: "test-id",
        email: "github-123@faasr.app",
        app_metadata: {},
        user_metadata: {
          installationId: "123456",
          githubLogin: "testuser",
          githubId: 123,
        },
        aud: "authenticated",
        created_at: new Date().toISOString(),
      },
    } as any);

    const { workflowsApi } = require("../../../src/services/api");
    const { FileUploadIds } = require("../../../src/components/FileUpload.ids");
    const uploadError = new Error("Upload failed");
    (workflowsApi.upload as jest.Mock).mockRejectedValue(uploadError);

    render(<UploadPageStack authValue={authValue} />);

    // Upload a file using the file input test id
    const fileInput = screen.getByTestId(
      FileUploadIds.fileInput
    ) as HTMLInputElement;
    const file = new File(['{"test": "data"}'], "test.json", {
      type: "application/json",
    });

    const user = userEvent.setup();
    await user.upload(fileInput, file);

    // Wait for file to be selected
    await waitFor(() => {
      expect(
        screen.getByTestId(FileUploadIds.selectedFileName)
      ).toHaveTextContent("test.json");
    });

    // Click upload button
    const uploadButton = screen.getByTestId(FileUploadIds.uploadButton);
    await user.click(uploadButton);

    // Wait for error notification - use test IDs to avoid conflicts with FileUpload messages
    await waitFor(() => {
      const {
        StatusNotificationIds,
      } = require("../../../src/components/StatusNotification.ids");
      expect(screen.getByTestId(StatusNotificationIds.title)).toHaveTextContent(
        /upload failed/i
      );
      expect(
        screen.getByTestId(StatusNotificationIds.message)
      ).toHaveTextContent(/upload failed/i);
    });
  });

  it("dismisses notification when dismiss is clicked", async () => {
    const authValue = createAuthenticatedMockAuth({
      user: {
        id: "test-id",
        email: "github-123@faasr.app",
        app_metadata: {},
        user_metadata: {
          installationId: "123456",
          githubLogin: "testuser",
          githubId: 123,
        },
        aud: "authenticated",
        created_at: new Date().toISOString(),
      },
    } as any);

    const { workflowsApi } = require("../../../src/services/api");
    const { FileUploadIds } = require("../../../src/components/FileUpload.ids");
    const {
      StatusNotificationIds,
    } = require("../../../src/components/StatusNotification.ids");
    const mockResponse = {
      success: true,
      message: "Workflow uploaded successfully",
      fileName: "test.json",
      commitSha: "abc123",
    };

    (workflowsApi.upload as jest.Mock).mockResolvedValue(mockResponse);

    render(<UploadPageStack authValue={authValue} />);

    // Upload a file using the file input test id
    const fileInput = screen.getByTestId(
      FileUploadIds.fileInput
    ) as HTMLInputElement;
    const file = new File(['{"test": "data"}'], "test.json", {
      type: "application/json",
    });

    const user = userEvent.setup();
    await user.upload(fileInput, file);

    // Wait for file to be selected
    await waitFor(() => {
      expect(
        screen.getByTestId(FileUploadIds.selectedFileName)
      ).toHaveTextContent("test.json");
    });

    // Click upload button
    const uploadButton = screen.getByTestId(FileUploadIds.uploadButton);
    await user.click(uploadButton);

    // Wait for success notification - use test ID to avoid conflicts with FileUpload messages
    await waitFor(() => {
      const {
        StatusNotificationIds,
      } = require("../../../src/components/StatusNotification.ids");
      expect(screen.getByTestId(StatusNotificationIds.title)).toHaveTextContent(
        /upload successful/i
      );
    });

    // Find and click dismiss button
    const dismissButton = screen.getByTestId(
      StatusNotificationIds.dismissButton
    );
    await user.click(dismissButton);

    // Notification should be dismissed - check by test ID to avoid matching FileUpload messages
    await waitFor(() => {
      expect(
        screen.queryByTestId(StatusNotificationIds.notification)
      ).not.toBeInTheDocument();
    });
  });
});

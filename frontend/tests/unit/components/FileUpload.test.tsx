/**
 * Tests for FileUpload component
 */

import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileUpload } from "../../../src/components/FileUpload";
import { workflowsApi } from "../../../src/services/api";

// Mock the API
jest.mock("../../../src/services/api", () => ({
  workflowsApi: {
    upload: jest.fn(),
  },
}));

describe("FileUpload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders file upload interface", () => {
    render(<FileUpload />);
    expect(screen.getByText(/select workflow json file/i)).toBeInTheDocument();
    expect(screen.getByText(/choose file/i)).toBeInTheDocument();
    expect(screen.getByText(/upload workflow/i)).toBeInTheDocument();
  });

  it("disables upload button when no file is selected", () => {
    render(<FileUpload />);
    const uploadButton = screen.getByText(/upload workflow/i);
    expect(uploadButton).toBeDisabled();
  });

  it("handles file selection", async () => {
    const onFileSelect = jest.fn();
    const user = userEvent.setup();
    const file = new File(['{"test": "data"}'], "test-workflow.json", {
      type: "application/json",
    });

    const { container } = render(<FileUpload onFileSelect={onFileSelect} />);

    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText("test-workflow.json")).toBeInTheDocument();
    });

    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it("validates JSON file content", async () => {
    const user = userEvent.setup();
    const invalidJsonFile = new File(['{"test": invalid}'], "test.json", {
      type: "application/json",
    });

    const { container } = render(<FileUpload />);

    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    await user.upload(fileInput, invalidJsonFile);

    await waitFor(() => {
      expect(screen.getByText(/invalid json/i)).toBeInTheDocument();
    });
  });

  it("validates file name format", async () => {
    const user = userEvent.setup();
    const invalidFileName = new File(['{"test": "data"}'], "test file.json", {
      type: "application/json",
    });

    const { container } = render(<FileUpload />);

    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    await user.upload(fileInput, invalidFileName);

    await waitFor(() => {
      expect(
        screen.getByText(/file name must contain only letters/i)
      ).toBeInTheDocument();
    });
  });

  it("validates file extension", async () => {
    const wrongExtension = new File(['{"test": "data"}'], "test.txt", {
      type: "text/plain",
    });

    const { container } = render(<FileUpload />);

    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    // Use fireEvent to trigger the change with the file
    Object.defineProperty(fileInput, "files", {
      value: [wrongExtension],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(
      () => {
        expect(
          screen.getByText(/File must have .json extension/i)
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("validates file size", async () => {
    const user = userEvent.setup();
    // Create a file larger than 1MB
    const largeContent = "x".repeat(1024 * 1024 + 1);
    const largeFile = new File([largeContent], "large.json", {
      type: "application/json",
    });

    const { container } = render(<FileUpload />);

    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    await user.upload(fileInput, largeFile);

    await waitFor(() => {
      expect(
        screen.getByText(/file size exceeds maximum/i)
      ).toBeInTheDocument();
    });
  });

  it("calls upload API when upload button is clicked", async () => {
    const user = userEvent.setup();
    const file = new File(['{"test": "data"}'], "test-workflow.json", {
      type: "application/json",
    });

    const mockResponse = {
      success: true,
      message: "Upload successful",
      fileName: "test-workflow.json",
      commitSha: "abc123",
    };

    (workflowsApi.upload as jest.Mock).mockResolvedValue(mockResponse);

    const { container } = render(<FileUpload />);

    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText("test-workflow.json")).toBeInTheDocument();
    });

    const uploadButton = screen.getByText(/upload workflow/i);
    await user.click(uploadButton);

    await waitFor(() => {
      expect(workflowsApi.upload).toHaveBeenCalledWith(file);
    });
  });

  it("calls onUploadSuccess when upload succeeds", async () => {
    const user = userEvent.setup();
    const onUploadSuccess = jest.fn();
    const file = new File(['{"test": "data"}'], "test-workflow.json", {
      type: "application/json",
    });

    const mockResponse = {
      success: true,
      message: "Upload successful",
      fileName: "test-workflow.json",
      commitSha: "abc123",
    };

    (workflowsApi.upload as jest.Mock).mockResolvedValue(mockResponse);

    const { container } = render(
      <FileUpload onUploadSuccess={onUploadSuccess} />
    );

    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText("test-workflow.json")).toBeInTheDocument();
    });

    const uploadButton = screen.getByText(/upload workflow/i);
    await user.click(uploadButton);

    await waitFor(() => {
      expect(onUploadSuccess).toHaveBeenCalledWith(mockResponse);
    });
  });

  it("calls onUploadError when upload fails", async () => {
    const user = userEvent.setup();
    const onUploadError = jest.fn();
    const file = new File(['{"test": "data"}'], "test-workflow.json", {
      type: "application/json",
    });

    const error = new Error("Upload failed");
    (workflowsApi.upload as jest.Mock).mockRejectedValue(error);

    const { container } = render(<FileUpload onUploadError={onUploadError} />);

    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText("test-workflow.json")).toBeInTheDocument();
    });

    const uploadButton = screen.getByText(/upload workflow/i);
    await user.click(uploadButton);

    await waitFor(() => {
      expect(onUploadError).toHaveBeenCalledWith(error);
    });
  });

  it("shows loading state during upload", async () => {
    const user = userEvent.setup();
    const file = new File(['{"test": "data"}'], "test-workflow.json", {
      type: "application/json",
    });

    (workflowsApi.upload as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    const { container } = render(<FileUpload />);

    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText("test-workflow.json")).toBeInTheDocument();
    });

    const uploadButton = screen.getByText(/upload workflow/i);
    await user.click(uploadButton);

    // Check for the button text "Uploading..." specifically
    await waitFor(() => {
      const uploadingButton = screen.getByRole("button", {
        name: /uploading/i,
      });
      expect(uploadingButton).toBeInTheDocument();
      expect(uploadingButton).toBeDisabled();
    });
  });

  it("disables upload when disabled prop is true", () => {
    render(<FileUpload disabled={true} />);
    const uploadButton = screen.getByText(/upload workflow/i);
    expect(uploadButton).toBeDisabled();
  });
});

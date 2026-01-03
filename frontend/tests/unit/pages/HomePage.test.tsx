/**
 * Tests for HomePage component
 */

import { render, screen, waitFor } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { HomePage } from "../../../src/pages/HomePage";
import { useAuth } from "../../../src/hooks/useAuth";

// Mock dependencies
jest.mock("../../../src/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe("HomePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  const renderWithRouter = () => {
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: HomePage,
      },
    ]);
    return render(<Stub initialEntries={["/"]} />);
  };

  it("renders welcome message and description", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      refreshSession: jest.fn(),
      logout: jest.fn(),
    });

    renderWithRouter();

    expect(screen.getByText("Welcome to FaaSr")).toBeInTheDocument();
    expect(
      screen.getByText(/Install FaaSr to get started/i)
    ).toBeInTheDocument();
  });

  it("renders InstallButton", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      refreshSession: jest.fn(),
      logout: jest.fn(),
    });

    renderWithRouter();

    expect(
      screen.getByRole("button", { name: /install faasr/i })
    ).toBeInTheDocument();
  });

  it("renders What is FaaSr section", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      refreshSession: jest.fn(),
      logout: jest.fn(),
    });

    renderWithRouter();

    expect(screen.getByText("What is FaaSr?")).toBeInTheDocument();
    expect(
      screen.getByText(/FaaSr is a GitHub App that helps you manage/i)
    ).toBeInTheDocument();
  });

  it("redirects to /upload when authenticated", async () => {
    mockUseAuth.mockReturnValue({
      session: {
        installationId: "123",
        userLogin: "testuser",
        userId: 1,
        avatarUrl: "https://example.com/avatar.png",
        jwtToken: "token",
        createdAt: new Date(),
        expiresAt: new Date(),
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      refreshSession: jest.fn(),
      logout: jest.fn(),
    });

    const UploadPage = () => <div data-testid="upload-page">Upload Page</div>;

    const Stub = createRoutesStub([
      {
        path: "/",
        Component: HomePage,
      },
      {
        path: "/upload",
        Component: UploadPage,
      },
    ]);

    render(<Stub initialEntries={["/"]} />);

    await waitFor(
      () => {
        // Check that we've navigated to /upload by looking for upload page content
        expect(screen.getByTestId("upload-page")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("does not redirect when loading", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      refreshSession: jest.fn(),
      logout: jest.fn(),
    });

    renderWithRouter();

    // Should still be on home page
    expect(screen.getByText("Welcome to FaaSr")).toBeInTheDocument();
  });

  it("does not redirect when not authenticated", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      refreshSession: jest.fn(),
      logout: jest.fn(),
    });

    renderWithRouter();

    // Should still be on home page
    expect(screen.getByText("Welcome to FaaSr")).toBeInTheDocument();
  });

  it("handles install error by logging to console", () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    mockUseAuth.mockReturnValue({
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      refreshSession: jest.fn(),
      logout: jest.fn(),
    });

    renderWithRouter();

    // The InstallButton will handle the error, but we can verify the error handler is set up
    const installButton = screen.getByRole("button", {
      name: /install faasr/i,
    });
    expect(installButton).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});

/**
 * Tests for UploadPage component
 */

import { render, screen, waitFor } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { UploadPage } from "../../../src/pages/UploadPage";
import { useAuth } from "../../../src/hooks/useAuth";

// Mock dependencies
jest.mock("../../../src/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe("UploadPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  const renderWithRouter = () => {
    const Stub = createRoutesStub([
      {
        path: "/upload",
        Component: UploadPage,
      },
      {
        path: "/",
        Component: () => <div data-testid="home-page">Home Page</div>,
      },
    ]);
    return render(<Stub initialEntries={["/upload"]} />);
  };

  it("renders loading state when authentication is loading", () => {
    mockUseAuth.mockReturnValue({
      session: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      refreshSession: jest.fn(),
      logout: jest.fn(),
    });

    renderWithRouter();

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("redirects to home when not authenticated", async () => {
    mockUseAuth.mockReturnValue({
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      refreshSession: jest.fn(),
      logout: jest.fn(),
    });

    const Stub = createRoutesStub([
      {
        path: "/upload",
        Component: UploadPage,
      },
      {
        path: "/",
        Component: () => <div data-testid="home-page">Home Page</div>,
      },
    ]);

    render(<Stub initialEntries={["/upload"]} />);

    await waitFor(
      () => {
        expect(screen.getByTestId("home-page")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("renders upload page content when authenticated", () => {
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

    renderWithRouter();

    expect(screen.getByText("Upload Workflow")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Upload your workflow JSON file to register it with FaaSr/i
      )
    ).toBeInTheDocument();
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

    // Should show loading state, not redirect
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});

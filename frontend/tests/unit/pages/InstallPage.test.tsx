/**
 * Tests for InstallPage component
 */

import { render, screen, waitFor } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { InstallPage } from "../../../src/pages/InstallPage";
import { authApi } from "../../../src/services/api";
import { useAuth } from "../../../src/hooks/useAuth";

// Mock dependencies
jest.mock("../../../src/services/api", () => ({
  authApi: {
    callback: jest.fn(),
  },
}));

jest.mock("../../../src/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe("InstallPage", () => {
  const mockRefreshSession = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      refreshSession: mockRefreshSession,
      logout: jest.fn(),
    });
  });

  const renderWithRouter = () => {
    const Stub = createRoutesStub([
      {
        path: "/install",
        Component: InstallPage,
      },
    ]);
    return render(<Stub initialEntries={["/install"]} />);
  };

  it("displays installation processing message", async () => {
    // Create a promise that we can control
    let resolveCallback: (value: any) => void;
    const callbackPromise = new Promise((resolve) => {
      resolveCallback = resolve;
    });

    (authApi.callback as jest.Mock).mockImplementation(() => callbackPromise);

    // Mock URLSearchParams
    const originalURL = window.location;
    delete (window as any).location;
    (window as any).location = {
      ...originalURL,
      search: "?installation_id=12345",
    };

    renderWithRouter();

    // Check for processing message immediately (before async completes)
    // The text appears in both the StatusNotification and the loading spinner
    await waitFor(() => {
      const elements = screen.getAllByText(/processing installation/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    // Now resolve the promise to clean up
    resolveCallback!({
      success: true,
      message: "Installation successful",
      user: {
        login: "testuser",
        id: 1,
        avatarUrl: "https://example.com/avatar.png",
      },
      fork: {
        owner: "testuser",
        repoName: "FaaSr-workflow",
        url: "https://github.com/testuser/FaaSr-workflow",
        status: "created",
      },
    });

    (window as any).location = originalURL;
  });

  it("displays error when installation_id is missing", async () => {
    const originalURL = window.location;
    delete (window as any).location;
    (window as any).location = {
      ...originalURL,
      search: "",
    };

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/missing installation id/i)).toBeInTheDocument();
    });

    (window as any).location = originalURL;
  });

  it("displays success message when installation succeeds", async () => {
    (authApi.callback as jest.Mock).mockResolvedValue({
      success: true,
      message: "Installation successful",
      user: {
        login: "testuser",
        id: 1,
        avatarUrl: "https://example.com/avatar.png",
      },
      fork: {
        owner: "testuser",
        repoName: "FaaSr-workflow",
        url: "https://github.com/testuser/FaaSr-workflow",
        status: "created",
      },
    });

    const originalURL = window.location;
    delete (window as any).location;
    (window as any).location = {
      ...originalURL,
      search: "?installation_id=12345",
    };

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/installation successful/i)).toBeInTheDocument();
    });

    (window as any).location = originalURL;
  });

  it("displays error message when installation fails", async () => {
    const error = new Error("Installation failed");
    (authApi.callback as jest.Mock).mockRejectedValue(error);

    const originalURL = window.location;
    delete (window as any).location;
    (window as any).location = {
      ...originalURL,
      search: "?installation_id=12345",
    };

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText(/installation error/i)).toBeInTheDocument();
    });

    (window as any).location = originalURL;
  });
});

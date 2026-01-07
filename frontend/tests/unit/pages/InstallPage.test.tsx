/**
 * Tests for InstallPage component
 */

import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    (mockRefreshSession as jest.Mock).mockResolvedValue(undefined);

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

    // Now resolve the promise within act() to clean up and handle state updates
    await act(async () => {
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
      // Wait for the promise to resolve
      await callbackPromise;
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
    let resolveCallback: (value: any) => void;
    const callbackPromise = new Promise((resolve) => {
      resolveCallback = resolve;
    });

    (authApi.callback as jest.Mock).mockImplementation(() => callbackPromise);
    (mockRefreshSession as jest.Mock).mockResolvedValue(undefined);

    const originalURL = window.location;
    delete (window as any).location;
    (window as any).location = {
      ...originalURL,
      search: "?installation_id=12345",
    };

    renderWithRouter();

    // Resolve the promise within act() to handle state updates
    await act(async () => {
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
      // Wait for the promise to resolve
      await callbackPromise;
    });

    await waitFor(() => {
      expect(screen.getByText(/installation successful/i)).toBeInTheDocument();
    });

    (window as any).location = originalURL;
  });

  it("displays error message when installation fails", async () => {
    let rejectCallback: (error: any) => void;
    const callbackPromise = new Promise((_, reject) => {
      rejectCallback = reject;
    });

    const error = new Error("Installation failed");
    (authApi.callback as jest.Mock).mockImplementation(() => callbackPromise);

    const originalURL = window.location;
    delete (window as any).location;
    (window as any).location = {
      ...originalURL,
      search: "?installation_id=12345",
    };

    renderWithRouter();

    // Reject the promise within act() to handle state updates
    await act(async () => {
      rejectCallback!(error);
      // Wait for the promise to settle
      await callbackPromise.catch(() => {});
    });

    await waitFor(() => {
      expect(screen.getByText(/installation error/i)).toBeInTheDocument();
    });

    (window as any).location = originalURL;
  });

  it("redirects to upload page after successful installation with delay", async () => {
    jest.useFakeTimers();

    let resolveCallback: (value: any) => void;
    const callbackPromise = new Promise((resolve) => {
      resolveCallback = resolve;
    });

    (authApi.callback as jest.Mock).mockImplementation(() => callbackPromise);
    (mockRefreshSession as jest.Mock).mockResolvedValue(undefined);

    const originalURL = window.location;
    delete (window as any).location;
    (window as any).location = {
      ...originalURL,
      search: "?installation_id=12345",
    };

    const UploadPage = () => <div data-testid="upload-page">Upload Page</div>;

    const Stub = createRoutesStub([
      {
        path: "/install",
        Component: InstallPage,
      },
      {
        path: "/upload",
        Component: UploadPage,
      },
    ]);

    render(<Stub initialEntries={["/install"]} />);

    // Resolve the promise within act() to handle state updates
    await act(async () => {
      resolveCallback!({
        success: true,
        message: "Installation successful",
        session: {
          access_token: "test-token",
          refresh_token: "test-refresh-token",
        },
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
      // Wait for the promise to resolve
      await callbackPromise;
    });

    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText(/installation successful/i)).toBeInTheDocument();
    });

    // Verify refreshSession was called
    expect(mockRefreshSession).toHaveBeenCalled();

    // Fast-forward time by 2 seconds - wrap in act() to handle state updates
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    // Wait for navigation to upload page
    await waitFor(() => {
      expect(screen.getByTestId("upload-page")).toBeInTheDocument();
    });

    jest.useRealTimers();
    (window as any).location = originalURL;
  });

  it("navigates to home when Return to Home button is clicked", async () => {
    let rejectCallback: (error: any) => void;
    const callbackPromise = new Promise((_, reject) => {
      rejectCallback = reject;
    });

    const error = new Error("Installation failed");
    (authApi.callback as jest.Mock).mockImplementation(() => callbackPromise);

    const originalURL = window.location;
    delete (window as any).location;
    (window as any).location = {
      ...originalURL,
      search: "?installation_id=12345",
    };

    const HomePage = () => <div data-testid="home-page">Home Page</div>;

    const Stub = createRoutesStub([
      {
        path: "/install",
        Component: InstallPage,
      },
      {
        path: "/",
        Component: HomePage,
      },
    ]);

    render(<Stub initialEntries={["/install"]} />);

    // Reject the promise within act() to handle state updates
    await act(async () => {
      rejectCallback!(error);
      // Wait for the promise to settle
      await callbackPromise.catch(() => {});
    });

    // Wait for error message and button to appear
    await waitFor(() => {
      expect(screen.getByText(/installation error/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      const returnButton = screen.getByRole("button", {
        name: /return to home/i,
      });
      expect(returnButton).toBeInTheDocument();
    });

    const returnButton = screen.getByRole("button", {
      name: /return to home/i,
    });

    const user = userEvent.setup();
    await user.click(returnButton);

    // Wait for navigation to home page
    await waitFor(() => {
      expect(screen.getByTestId("home-page")).toBeInTheDocument();
    });

    (window as any).location = originalURL;
  });
});

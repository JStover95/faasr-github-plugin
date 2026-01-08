/**
 * Tests for HomePage component
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HomePageStack } from "../../__mocks__/HomePage.mock";
import {
  defaultMockAuth,
  createAuthenticatedMockAuth,
  createLoadingMockAuth,
} from "../../__mocks__/useAuth.mock";
import { authApi } from "../../../src/services/api";

// Mock dependencies
jest.mock("../../../src/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../../src/services/api", () => ({
  authApi: {
    install: jest.fn(),
  },
}));

describe("HomePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  it("renders welcome message and description", () => {
    render(<HomePageStack authValue={defaultMockAuth} />);

    expect(screen.getByText("Welcome to FaaSr")).toBeInTheDocument();
    expect(
      screen.getByText(/Install FaaSr to get started/i)
    ).toBeInTheDocument();
  });

  it("renders InstallButton", () => {
    render(<HomePageStack authValue={defaultMockAuth} />);

    expect(
      screen.getByRole("button", { name: /install faasr/i })
    ).toBeInTheDocument();
  });

  it("renders What is FaaSr section", () => {
    render(<HomePageStack authValue={defaultMockAuth} />);

    expect(screen.getByText("What is FaaSr?")).toBeInTheDocument();
    expect(
      screen.getByText(/FaaSr is a GitHub App that helps you manage/i)
    ).toBeInTheDocument();
  });

  it("redirects to /upload when authenticated", async () => {
    const authValue = createAuthenticatedMockAuth();
    render(<HomePageStack authValue={authValue} />);

    await waitFor(
      () => {
        // Check that we've navigated to /upload by looking for upload page mock
        expect(screen.getByTestId("upload-page-mock")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("does not redirect when loading", () => {
    const authValue = createLoadingMockAuth();
    render(<HomePageStack authValue={authValue} />);

    // Should still be on home page
    expect(screen.getByText("Welcome to FaaSr")).toBeInTheDocument();
  });

  it("does not redirect when not authenticated", () => {
    render(<HomePageStack authValue={defaultMockAuth} />);

    // Should still be on home page
    expect(screen.getByText("Welcome to FaaSr")).toBeInTheDocument();
  });

  it("calls handleInstallError and logs to console when install fails", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    const installError = new Error("Installation failed");
    (authApi.install as jest.Mock).mockRejectedValue(installError);

    render(<HomePageStack authValue={defaultMockAuth} />);

    const installButton = screen.getByRole("button", {
      name: /install faasr/i,
    });

    const user = userEvent.setup();
    await user.click(installButton);

    // Wait for the error handler to be called
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Installation error:",
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });
});

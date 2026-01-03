/**
 * Tests for InstallButton component
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InstallButton } from "../../../src/components/InstallButton";
import { authApi } from "../../../src/services/api";

// Mock the API
jest.mock("../../../src/services/api", () => ({
  authApi: {
    install: jest.fn(),
  },
}));

describe("InstallButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders button with default label", () => {
    render(<InstallButton />);
    expect(
      screen.getByRole("button", { name: /install faasr/i })
    ).toBeInTheDocument();
  });

  it("renders button with custom label", () => {
    render(<InstallButton label="Click to Install" />);
    expect(
      screen.getByRole("button", { name: /click to install/i })
    ).toBeInTheDocument();
  });

  it("calls onInstallStart when clicked", async () => {
    const onInstallStart = jest.fn();
    const user = userEvent.setup();

    (authApi.install as jest.Mock).mockResolvedValue(undefined);

    render(<InstallButton onInstallStart={onInstallStart} />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(onInstallStart).toHaveBeenCalledTimes(1);
    expect(authApi.install).toHaveBeenCalledTimes(1);
  });

  it("calls authApi.install when clicked", async () => {
    const user = userEvent.setup();

    (authApi.install as jest.Mock).mockResolvedValue(undefined);

    render(<InstallButton />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(authApi.install).toHaveBeenCalledTimes(1);
  });

  it("calls onInstallError when installation fails", async () => {
    const onInstallError = jest.fn();
    const user = userEvent.setup();
    const error = new Error("Installation failed");

    (authApi.install as jest.Mock).mockRejectedValue(error);

    render(<InstallButton onInstallError={onInstallError} />);

    const button = screen.getByRole("button");
    await user.click(button);

    await waitFor(() => {
      expect(onInstallError).toHaveBeenCalledWith(error);
    });
  });

  it("shows loading state when installation is in progress", async () => {
    const user = userEvent.setup();

    (authApi.install as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<InstallButton />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(screen.getByText(/redirecting/i)).toBeInTheDocument();
  });

  it("disables button when disabled prop is true", () => {
    render(<InstallButton disabled={true} />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("does not call install when disabled", async () => {
    const user = userEvent.setup();

    render(<InstallButton disabled={true} />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(authApi.install).not.toHaveBeenCalled();
  });

  it("does not call install when already loading", async () => {
    const user = userEvent.setup();

    // Create a promise that we can control
    let resolveInstall: () => void;
    const installPromise = new Promise<void>((resolve) => {
      resolveInstall = resolve;
    });

    (authApi.install as jest.Mock).mockReturnValue(installPromise);

    render(<InstallButton />);

    const button = screen.getByRole("button");

    // First click - should trigger install
    await user.click(button);
    expect(authApi.install).toHaveBeenCalledTimes(1);

    // Second click while loading - should not trigger another install
    await user.click(button);
    expect(authApi.install).toHaveBeenCalledTimes(1);

    // Resolve the promise to clean up
    resolveInstall!();
    await installPromise;
  });
});

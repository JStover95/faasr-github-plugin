/**
 * Tests for StatusNotification component
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatusNotification } from "../../../src/components/StatusNotification";

describe("StatusNotification", () => {
  it("renders success notification", () => {
    render(
      <StatusNotification type="success" message="Operation successful" />
    );
    expect(screen.getByText("Operation successful")).toBeInTheDocument();
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("renders error notification", () => {
    render(<StatusNotification type="error" message="Operation failed" />);
    expect(screen.getByText("Operation failed")).toBeInTheDocument();
    expect(screen.getByText("✕")).toBeInTheDocument();
  });

  it("renders info notification", () => {
    render(<StatusNotification type="info" message="Information message" />);
    expect(screen.getByText("Information message")).toBeInTheDocument();
    expect(screen.getByText("ℹ")).toBeInTheDocument();
  });

  it("renders warning notification", () => {
    render(<StatusNotification type="warning" message="Warning message" />);
    expect(screen.getByText("Warning message")).toBeInTheDocument();
    expect(screen.getByText("⚠")).toBeInTheDocument();
  });

  it("renders with title", () => {
    render(
      <StatusNotification
        type="success"
        title="Success Title"
        message="Operation successful"
      />
    );
    expect(screen.getByText("Success Title")).toBeInTheDocument();
    expect(screen.getByText("Operation successful")).toBeInTheDocument();
  });

  it("calls onDismiss when dismiss button is clicked", async () => {
    const onDismiss = jest.fn();
    const user = userEvent.setup();

    render(
      <StatusNotification
        type="success"
        message="Operation successful"
        onDismiss={onDismiss}
      />
    );

    const dismissButton = screen.getByLabelText("Dismiss notification");
    await user.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Operation successful")).not.toBeInTheDocument();
  });

  it("does not show dismiss button when onDismiss is not provided", () => {
    render(
      <StatusNotification type="success" message="Operation successful" />
    );
    expect(
      screen.queryByLabelText("Dismiss notification")
    ).not.toBeInTheDocument();
  });

  it("auto-dismisses after specified time", async () => {
    jest.useFakeTimers();
    const onDismiss = jest.fn();

    render(
      <StatusNotification
        type="success"
        message="Operation successful"
        onDismiss={onDismiss}
        autoDismiss={1000}
      />
    );

    expect(screen.getByText("Operation successful")).toBeInTheDocument();

    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByText("Operation successful")
      ).not.toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  it("does not auto-dismiss when autoDismiss is 0", async () => {
    jest.useFakeTimers();
    const onDismiss = jest.fn();

    render(
      <StatusNotification
        type="success"
        message="Operation successful"
        onDismiss={onDismiss}
        autoDismiss={0}
      />
    );

    jest.advanceTimersByTime(5000);

    expect(screen.getByText("Operation successful")).toBeInTheDocument();
    expect(onDismiss).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it("cleans up timer on unmount", () => {
    jest.useFakeTimers();
    const onDismiss = jest.fn();

    const { unmount } = render(
      <StatusNotification
        type="success"
        message="Operation successful"
        onDismiss={onDismiss}
        autoDismiss={1000}
      />
    );

    unmount();

    jest.advanceTimersByTime(1000);

    expect(onDismiss).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it("applies custom className", () => {
    const { container } = render(
      <StatusNotification
        type="success"
        message="Operation successful"
        className="custom-class"
      />
    );

    const notification = container.querySelector(".custom-class");
    expect(notification).toBeInTheDocument();
  });
});

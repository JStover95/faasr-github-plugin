/**
 * Tests for StatusNotification component
 */

import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatusNotification } from "../../../src/components/StatusNotification";
import { StatusNotificationIds } from "../../../src/components/StatusNotification.ids";

describe("StatusNotification", () => {
  it("renders success notification", () => {
    render(
      <StatusNotification type="success" message="Operation successful" />
    );
    expect(
      screen.getByTestId(StatusNotificationIds.notification)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(StatusNotificationIds.message)
    ).toHaveTextContent("Operation successful");
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("renders error notification", () => {
    render(<StatusNotification type="error" message="Operation failed" />);
    expect(
      screen.getByTestId(StatusNotificationIds.notification)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(StatusNotificationIds.message)
    ).toHaveTextContent("Operation failed");
    expect(screen.getByText("✕")).toBeInTheDocument();
  });

  it("renders info notification", () => {
    render(<StatusNotification type="info" message="Information message" />);
    expect(
      screen.getByTestId(StatusNotificationIds.notification)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(StatusNotificationIds.message)
    ).toHaveTextContent("Information message");
    expect(screen.getByText("ℹ")).toBeInTheDocument();
  });

  it("renders warning notification", () => {
    render(<StatusNotification type="warning" message="Warning message" />);
    expect(
      screen.getByTestId(StatusNotificationIds.notification)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(StatusNotificationIds.message)
    ).toHaveTextContent("Warning message");
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
    expect(
      screen.getByTestId(StatusNotificationIds.title)
    ).toHaveTextContent("Success Title");
    expect(
      screen.getByTestId(StatusNotificationIds.message)
    ).toHaveTextContent("Operation successful");
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

    const dismissButton = screen.getByTestId(
      StatusNotificationIds.dismissButton
    );
    await user.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByTestId(StatusNotificationIds.notification)
    ).not.toBeInTheDocument();
  });

  it("does not show dismiss button when onDismiss is not provided", () => {
    render(
      <StatusNotification type="success" message="Operation successful" />
    );
    expect(
      screen.queryByTestId(StatusNotificationIds.dismissButton)
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

    expect(
      screen.getByTestId(StatusNotificationIds.notification)
    ).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByTestId(StatusNotificationIds.notification)
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

    expect(
      screen.getByTestId(StatusNotificationIds.notification)
    ).toBeInTheDocument();
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

    expect(
      screen.getByTestId(StatusNotificationIds.notification)
    ).toBeInTheDocument();

    unmount();

    jest.advanceTimersByTime(1000);

    expect(onDismiss).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it("applies custom className", () => {
    render(
      <StatusNotification
        type="success"
        message="Operation successful"
        className="custom-class"
      />
    );

    const notification = screen.getByTestId(StatusNotificationIds.notification);
    expect(notification).toHaveClass("custom-class");
  });
});

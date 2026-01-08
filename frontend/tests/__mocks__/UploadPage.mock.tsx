/**
 * Mock router stack for UploadPage tests
 *
 * Provides a complete router stack that mirrors the actual implementation,
 * allowing navigation testing by verifying destination components render.
 */

import { createRoutesStub } from "react-router";
import { UploadPage } from "../../src/pages/UploadPage";
import { useAuth } from "../../src/hooks/useAuth";
import type { UseAuthReturn } from "../__mocks__/useAuth.mock";

type UploadPageStackProps = {
  /** Mock auth state to use */
  authValue?: UseAuthReturn;
  /** Initial route to render */
  initialEntries?: string[];
};

/**
 * UploadPageStack - Mock router stack for UploadPage tests
 *
 * Includes routes: / (HomePage), /upload (UploadPage)
 *
 * Note: useAuth must be mocked in the test file before using this component.
 */
export function UploadPageStack({
  authValue,
  initialEntries = ["/upload"],
}: UploadPageStackProps) {
  // Set up useAuth mock if authValue is provided
  if (authValue) {
    (useAuth as jest.MockedFunction<typeof useAuth>).mockReturnValue(authValue);
  }

  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => <div data-testid="home-page-mock">HomePageMock</div>,
    },
    {
      path: "/upload",
      Component: UploadPage,
    },
  ]);

  return <Stub initialEntries={initialEntries} />;
}

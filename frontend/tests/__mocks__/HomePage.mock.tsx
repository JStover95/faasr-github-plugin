/**
 * Mock router stack for HomePage tests
 *
 * Provides a complete router stack that mirrors the actual implementation,
 * allowing navigation testing by verifying destination components render.
 */

import { createRoutesStub } from "react-router";
import { HomePage } from "../../src/pages/HomePage";
import { useAuth } from "../../src/hooks/useAuth";
import type { UseAuthReturn } from "../__mocks__/useAuth.mock";

type HomePageStackProps = {
  /** Mock auth state to use */
  authValue?: UseAuthReturn;
  /** Initial route to render */
  initialEntries?: string[];
};

/**
 * HomePageStack - Mock router stack for HomePage tests
 *
 * Includes all routes: / (HomePage), /install (InstallPage), /upload (UploadPage)
 *
 * Note: useAuth must be mocked in the test file before using this component.
 */
export function HomePageStack({
  authValue,
  initialEntries = ["/"],
}: HomePageStackProps) {
  // Set up useAuth mock if authValue is provided
  if (authValue) {
    (useAuth as jest.MockedFunction<typeof useAuth>).mockReturnValue(authValue);
  }

  const Stub = createRoutesStub([
    {
      path: "/",
      Component: HomePage,
    },
    {
      path: "/install",
      Component: () => (
        <div data-testid="install-page-mock">InstallPageMock</div>
      ),
    },
    {
      path: "/upload",
      Component: () => <div data-testid="upload-page-mock">UploadPageMock</div>,
    },
  ]);

  return <Stub initialEntries={initialEntries} />;
}

/**
 * Mock router stack for InstallPage tests
 *
 * Provides a complete router stack that mirrors the actual implementation,
 * allowing navigation testing by verifying destination components render.
 */

import { createRoutesStub } from "react-router";
import { InstallPage } from "../../src/pages/InstallPage";
import { useAuth } from "../../src/hooks/useAuth";
import type { UseAuthReturn } from "../__mocks__/useAuth.mock";

type InstallPageStackProps = {
  /** Mock auth state to use */
  authValue?: UseAuthReturn;
  /** Initial route to render */
  initialEntries?: string[];
};

/**
 * InstallPageStack - Mock router stack for InstallPage tests
 *
 * Includes all routes: / (HomePage), /install (InstallPage), /upload (UploadPage)
 *
 * Note: useAuth must be mocked in the test file before using this component.
 */
export function InstallPageStack({
  authValue,
  initialEntries = ["/install"],
}: InstallPageStackProps) {
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
      path: "/install",
      Component: InstallPage,
    },
    {
      path: "/upload",
      Component: () => <div data-testid="upload-page-mock">UploadPageMock</div>,
    },
  ]);

  return <Stub initialEntries={initialEntries} />;
}

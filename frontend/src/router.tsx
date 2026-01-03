import { createBrowserRouter, Outlet } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { InstallPage } from "./pages/InstallPage";
import { UploadPage } from "./pages/UploadPage";

const Root = () => {
  return <Outlet />;
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "install", element: <InstallPage /> },
      { path: "upload", element: <UploadPage /> },
    ],
  },
]);

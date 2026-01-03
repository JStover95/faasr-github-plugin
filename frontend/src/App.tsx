/**
 * App component - Main application component with React Router
 *
 * Configures routing for the FaaSr GitHub App MVP application.
 */

import { RouterProvider } from "react-router-dom";
import { router } from "./router";

/**
 * App component
 */
export const App = () => {
  return <RouterProvider router={router} />;
};

export default App;

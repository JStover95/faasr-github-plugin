/**
 * App component - Main application component with React Router
 *
 * Configures routing for the FaaSr GitHub App MVP application.
 */

import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { InstallPage } from "./pages/InstallPage";

/**
 * App component
 */
export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/install" element={<InstallPage />} />
          {/* UploadPage will be added in Phase 4 */}
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;

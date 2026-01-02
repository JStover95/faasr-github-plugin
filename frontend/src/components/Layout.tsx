/**
 * Layout component - Provides basic page structure for the application
 *
 * This component wraps page content with consistent layout elements
 * such as header, navigation, and footer.
 */

import React from "react";

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Layout component
 */
export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gray-800 text-white p-4">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">FaaSr GitHub App</h1>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4">{children}</main>

      <footer className="bg-gray-100 p-4 mt-auto">
        <div className="container mx-auto text-center text-gray-600">
          <p>&copy; 2025 FaaSr. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

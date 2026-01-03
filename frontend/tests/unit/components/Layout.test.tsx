/**
 * Tests for Layout component
 */

import { render, screen } from "@testing-library/react";
import { Layout } from "../../../src/components/Layout";

describe("Layout", () => {
  it("renders header with title", () => {
    render(<Layout>Test content</Layout>);
    expect(screen.getByText("FaaSr GitHub App")).toBeInTheDocument();
  });

  it("renders children in main content area", () => {
    render(
      <Layout>
        <div>Test content</div>
      </Layout>
    );
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("renders footer with copyright", () => {
    render(<Layout>Test content</Layout>);
    expect(screen.getByText(/© 2025 FaaSr/i)).toBeInTheDocument();
  });

  it("renders all layout sections", () => {
    render(<Layout>Test content</Layout>);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});

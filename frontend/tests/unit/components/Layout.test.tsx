/**
 * Tests for Layout component
 */

import { render, screen } from "@testing-library/react";
import { Layout } from "../../../src/components/Layout";
import { LayoutIds } from "../../../src/components/Layout.ids";

describe("Layout", () => {
  it("renders header with title", () => {
    render(<Layout>Test content</Layout>);
    const header = screen.getByTestId(LayoutIds.header);
    expect(header).toBeInTheDocument();
    expect(screen.getByText("FaaSr GitHub App")).toBeInTheDocument();
  });

  it("renders children in main content area", () => {
    render(
      <Layout>
        <div>Test content</div>
      </Layout>
    );
    const main = screen.getByTestId(LayoutIds.main);
    expect(main).toBeInTheDocument();
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("renders footer with copyright", () => {
    render(<Layout>Test content</Layout>);
    const footer = screen.getByTestId(LayoutIds.footer);
    expect(footer).toBeInTheDocument();
    expect(screen.getByText(/© 2025 FaaSr/i)).toBeInTheDocument();
  });

  it("renders all layout sections", () => {
    render(<Layout>Test content</Layout>);
    expect(screen.getByTestId(LayoutIds.header)).toBeInTheDocument();
    expect(screen.getByTestId(LayoutIds.main)).toBeInTheDocument();
    expect(screen.getByTestId(LayoutIds.footer)).toBeInTheDocument();
    // Also verify semantic roles are present
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});

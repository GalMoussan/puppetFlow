/**
 * Test with act() wrapper for React 19 compatibility
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";

describe("React 19 act() test", () => {
  it("should render simple div with act wrapper", async () => {
    const SimpleDiv = () => <div data-testid="simple">Hello</div>;
    
    let container: HTMLElement;
    await act(async () => {
      const result = render(<SimpleDiv />);
      container = result.container;
    });
    
    console.log("With act() - HTML:", container!.innerHTML);
    expect(container!.innerHTML).toContain("Hello");
  });

  it("should find element with screen after act", async () => {
    const SimpleDiv = () => <div data-testid="simple">Hello</div>;
    
    await act(async () => {
      render(<SimpleDiv />);
    });
    
    const element = screen.getByTestId("simple");
    console.log("Element found:", element.textContent);
    expect(element).toHaveTextContent("Hello");
  });
});

/**
 * Test React hooks in isolation
 */

import { describe, it, expect } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import React, { useCallback, useState, memo } from "react";

// Simple component with useState
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button data-testid="counter" onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}

// Component with useCallback
function CallbackComponent() {
  const handleClick = useCallback(() => {
    console.log("clicked");
  }, []);
  return <button data-testid="callback" onClick={handleClick}>Click me</button>;
}

// Memoized component
const MemoComponent = memo(function MemoComponent({ name }: { name: string }) {
  return <div data-testid="memo">Hello {name}</div>;
});

describe("React Hooks Test", () => {
  it("should work with useState", async () => {
    await act(async () => {
      render(<Counter />);
    });
    
    const button = screen.getByTestId("counter");
    expect(button).toHaveTextContent("Count: 0");
    
    await act(async () => {
      fireEvent.click(button);
    });
    
    expect(button).toHaveTextContent("Count: 1");
  });

  it("should work with useCallback", async () => {
    await act(async () => {
      render(<CallbackComponent />);
    });
    
    const button = screen.getByTestId("callback");
    expect(button).toBeInTheDocument();
  });

  it("should work with memo", async () => {
    await act(async () => {
      render(<MemoComponent name="World" />);
    });
    
    const div = screen.getByTestId("memo");
    expect(div).toHaveTextContent("Hello World");
  });
});

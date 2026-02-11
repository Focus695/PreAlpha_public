import { afterEach, expect } from 'bun:test';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import '@testing-library/jest-dom';

expect.extend(matchers);

// Extend Bun's expect types with jest-dom matchers
declare module 'bun:test' {
  interface Matchers<T> {
    toBeInTheDocument(): T;
    toHaveTextContent(text: string | RegExp): T;
    toBeVisible(): T;
    toBeDisabled(): T;
    toBeEnabled(): T;
    toHaveClass(...classNames: string[]): T;
    toHaveAttribute(attr: string, value?: string): T;
    toHaveStyle(style: Record<string, unknown>): T;
  }
}

afterEach(() => {
  cleanup();
});

if (typeof navigator !== 'undefined' && !('clipboard' in navigator)) {
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: () => Promise.resolve(),
    },
    configurable: true,
  });
}


import { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import type { RenderOptions } from '@testing-library/react';

type TestingLibrary = typeof import('@testing-library/react');

let testingLibraryPromise: Promise<TestingLibrary> | null = null;

async function ensureDom() {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return;
  }

  const { Window } = await import('happy-dom');
  const happyWindow = new Window();

  globalThis.window = happyWindow as unknown as typeof globalThis.window;
  globalThis.document = happyWindow.document as unknown as Document;
  globalThis.navigator = happyWindow.navigator as unknown as Navigator;
}

async function loadTestingLibrary() {
  const globalAny = globalThis as Record<string, unknown>;
  const originalBeforeAll = globalAny.beforeAll;
  const originalAfterAll = globalAny.afterAll;

  if (typeof originalBeforeAll === 'function') {
    globalAny.beforeAll = undefined;
  }
  if (typeof originalAfterAll === 'function') {
    globalAny.afterAll = undefined;
  }

  try {
    await ensureDom();
    return import('@testing-library/react');
  } finally {
    if (originalBeforeAll) {
      globalAny.beforeAll = originalBeforeAll;
    }
    if (originalAfterAll) {
      globalAny.afterAll = originalAfterAll;
    }
  }
}

async function getTestingLibrary() {
  if (!testingLibraryPromise) {
    testingLibraryPromise = loadTestingLibrary();
  }

  return testingLibraryPromise;
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function Providers({ children }: { children: ReactNode }) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

export async function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const { render } = await getTestingLibrary();
  return render(ui, {
    wrapper: Providers,
    ...options,
  });
}

export async function createUserEvent() {
  await ensureDom();
  const { default: userEvent } = await import('@testing-library/user-event');
  return userEvent.setup();
}


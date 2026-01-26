import type { ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import { TooltipProvider } from '../components/ui/Tooltip';
import { DistributionModeProvider } from '../context/DistributionModeContext';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

interface AllProvidersProps {
  children: ReactNode;
}

/**
 * Test wrapper using data router (createMemoryRouter) to support
 * data router features like useBlocker.
 */
function AllProviders({ children }: AllProvidersProps) {
  const queryClient = createTestQueryClient();

  // Create a memory router with a single route that renders children
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <ThemeProvider>
            <ToastProvider>
              <TooltipProvider>
                <DistributionModeProvider>{children}</DistributionModeProvider>
              </TooltipProvider>
            </ToastProvider>
          </ThemeProvider>
        ),
      },
    ],
    {
      initialEntries: ['/'],
    }
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

const customRender = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

/**
 * App Root
 *
 * Main application component with React Router routing
 */

import { Routes, Route } from 'react-router-dom';
import { MarketPage } from './pages/MarketPage';
import { AddressDetailPage } from './pages/AddressDetailPage';
import { SignalsPage } from './pages/SignalsPage';
import { SmartMoneyPage } from './pages/SmartMoneyPage';
import Header from '@/components/layout/header';
import { ToastContainer, toastStore } from '@/components/ui/toast';
import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';

//RainbowKit and wagmi config
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { WagmiProvider, useAccount } from 'wagmi';
import { RainbowKitProvider, RainbowKitAuthenticationProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { config } from './wagmi';

// SIWE Authentication
import { authenticationAdapter } from '@/lib/auth/authentication-adapter';
import { useAuthStatus } from '@/hooks/use-auth-status';
import { useAutoAuthentication } from '@/hooks/use-auto-authentication';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 2,
    },
  },
});


function AppContent() {
  const [toasts, setToasts] = useState(toastStore.getToasts());

  useEffect(() => {
    const unsubscribe = toastStore.subscribe(setToasts);
    return unsubscribe;
  }, []);

  return (
    <div className="min-h-screen bg-base text-txt-main">
      {/* Mock Data Notification Banner
      <div className="bg-brand/10 border-b border-brand/20 px-4 py-2 text-center text-xs font-medium text-brand">
        <span className="mr-2">⚠️</span>
        {zh.app.banner}
      </div> */}

      <Header />

      <main className="container py-6">
        <Routes>
          <Route path="/" element={<SmartMoneyPage />} />
          <Route path="/market" element={<MarketPage />} />
          <Route path="/address/:id" element={<AddressDetailPage />} />
          <Route path="/signals" element={<SignalsPage />} />
        </Routes>
      </main>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={(id) => toastStore.remove(id)} />
    </div>
  );
}

/**
 * Authentication wrapper component
 * Manages authentication status for RainbowKitAuthenticationProvider
 * Automatically fetches user data when authentication is successful
 */
function AuthWrapper({ children }: { children: React.ReactNode }) {
  const status = useAuthStatus();
  const { address } = useAccount();
  const queryClient = useQueryClient();

  // Auto-authentication: Trigger SIWE signing when wallet connects
  useAutoAuthentication({
    onAuthSuccess: () => {
      logger.info('[AuthWrapper] Auto-authentication successful');
    },
    onAuthFailed: (reason) => {
      logger.info('[AuthWrapper] Auto-authentication failed:', reason);
    },
  });

  // Automatically fetch user data when authentication succeeds
  useEffect(() => {
    if (status === 'authenticated' && address) {
      // Invalidate and refetch user data query
      // This triggers useUserData hook to fetch data from backend
      queryClient.invalidateQueries({ queryKey: ['userData', address] });
      
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, address]);

  return (
    <RainbowKitAuthenticationProvider adapter={authenticationAdapter} status={status} enabled={false}>
      <RainbowKitProvider
        theme={darkTheme({
          accentColor: '#00F0FF', // Signal Cyan (brand color)
          accentColorForeground: '#05070A', // Deep Space Black
          borderRadius: 'medium',
          fontStack: 'system',
          overlayBlur: 'small',
        })}
        coolMode
      >
        {children}
      </RainbowKitProvider>
    </RainbowKitAuthenticationProvider>
  );
}

export function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {/*
          SIWE Authentication Integration

          Correct provider hierarchy:
          1. WagmiProvider - Wallet connection
          2. QueryClientProvider - Data caching
          3. RainbowKitAuthenticationProvider - SIWE authentication
          4. RainbowKitProvider - UI components
          5. AppContent - Application

        */}
        <AuthWrapper>
          <AppContent />
        </AuthWrapper>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
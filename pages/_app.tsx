import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import '../styles/globals.css';
import { useEffect, useState } from 'react';
import Head from 'next/head';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function App({ 
  Component, 
  pageProps: { session, ...pageProps } 
}: AppProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <Head>
        <title>AFMS - Attendance & Fingerprint Management System</title>
        <meta name="description" content="Advanced Fingerprint Management System for attendance tracking" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <QueryClientProvider client={queryClient}>
        <SessionProvider session={session}>
          <ToastProvider>
            <AuthProvider>
              <div className="min-h-screen bg-gray-50">
                <Component {...pageProps} />
              </div>
            </AuthProvider>
          </ToastProvider>
        </SessionProvider>
      </QueryClientProvider>
    </>
  );
}
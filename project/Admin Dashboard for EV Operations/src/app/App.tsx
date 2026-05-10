import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { TenantProvider } from './contexts/TenantContext';
import { Toaster } from './components/ui/sonner';
import { router } from './routes';

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TenantProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" />
      </TenantProvider>
    </ThemeProvider>
  );
}


import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setShowRestored(true);
      setTimeout(() => setShowRestored(false), 4000);
    };
    const handleOffline = () => {
      setOnline(false);
      setShowRestored(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online && !showRestored) return null;

  if (!online) {
    return (
      <div className="fixed top-16 left-0 right-0 z-50 md:left-64 bg-orange-500 text-white px-4 py-2.5 flex items-center gap-3 text-sm shadow-lg">
        <WifiOff className="h-4 w-4 flex-shrink-0" />
        <span>
          <strong>Offline mode</strong> — displaying cached data.
          Changes will not be saved until connectivity is restored.
        </span>
      </div>
    );
  }

  return (
    <div className="fixed top-16 left-0 right-0 z-50 md:left-64 bg-green-600 text-white px-4 py-2.5 flex items-center gap-3 text-sm shadow-lg">
      <Wifi className="h-4 w-4 flex-shrink-0" />
      <span>Connection restored — you are back online.</span>
    </div>
  );
}

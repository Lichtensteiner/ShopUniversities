import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl p-4 max-w-sm w-full">
      <div className="mb-4">
        {offlineReady ? (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            L'application est prête à fonctionner hors ligne.
          </span>
        ) : (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Une nouvelle version est disponible. Cliquez sur recharger pour mettre à jour.
          </span>
        )}
      </div>
      <div className="flex gap-3 justify-end">
        {needRefresh && (
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            onClick={() => updateServiceWorker(true)}
          >
            Recharger
          </button>
        )}
        <button
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          onClick={() => close()}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

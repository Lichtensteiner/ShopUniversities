import React from 'react';
import { Settings as SettingsIcon, Shield, Bell, Database, Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('system_settings')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('global_app_config')}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Monitor size={20} className="text-indigo-600 dark:text-indigo-400" />
          {t('system_appearance')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('choose_theme_desc')}</p>
        
        <div className="grid grid-cols-3 gap-4 max-w-lg">
          <button
            onClick={() => setTheme('light')}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
              theme === 'light' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            <Sun size={24} className="mb-2" />
            <span className="font-medium">{t('light')}</span>
          </button>
          
          <button
            onClick={() => setTheme('dark')}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
              theme === 'dark' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            <Moon size={24} className="mb-2" />
            <span className="font-medium">{t('dark')}</span>
          </button>

          <button
            onClick={() => setTheme('system')}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
              theme === 'system' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            <Monitor size={24} className="mb-2" />
            <span className="font-medium">{t('system')}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-4">
            <Shield size={24} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('security_access')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('security_access_desc')}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-4">
            <Bell size={24} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Notifications</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('notifications_settings_desc')}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center mb-4">
            <Database size={24} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('database')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('database_desc')}</p>
        </div>
      </div>
    </div>
  );
}

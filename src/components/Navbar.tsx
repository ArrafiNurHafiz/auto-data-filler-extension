import React from 'react';
import {
  Upload,
  PlayCircle,
  History,
  Settings,
  Globe,
  Sliders,
  ExternalLink,
  Sidebar,
  Bot
} from 'lucide-react';

export type TabType = 'upload' | 'mapping' | 'targets' | 'runner' | 'history' | 'settings';

interface NavbarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  dataLoaded: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onSelectTab, dataLoaded }) => {
  const steps = [
    { id: 'upload' as TabType, step: '1', label: 'Data', icon: Upload, badge: dataLoaded },
    { id: 'mapping' as TabType, step: '2', label: 'Mapping', icon: Sliders },
    { id: 'runner' as TabType, step: '3', label: 'Runner', icon: PlayCircle },
  ];

  const handleOpenFullTab = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
    } else {
      window.open(window.location.href, '_blank');
    }
  };

  const handleOpenSidePanel = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
    }
  };

  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 select-none shadow-xs w-full">
      {/* Top Header Row */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-100 dark:border-gray-800/60 gap-1 min-w-0">
        {/* Brand & Badge */}
        <div className="flex items-center gap-1.5 min-w-0 shrink">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-bold shadow-xs shrink-0">
            <Bot className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-bold text-gray-900 dark:text-white tracking-tight truncate">AutoDataFiller</span>
          <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/50 shrink-0">
            v2
          </span>
        </div>

        {/* Secondary Navigation & Tools */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => onSelectTab('targets')}
            title="Kelola Preset Website"
            className={`p-1 rounded-md text-xs transition-colors ${
              activeTab === 'targets'
                ? 'bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 font-semibold'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => onSelectTab('history')}
            title="Riwayat Eksekusi"
            className={`p-1 rounded-md text-xs transition-colors ${
              activeTab === 'history'
                ? 'bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 font-semibold'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <History className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => onSelectTab('settings')}
            title="Pengaturan & Anti-Bot"
            className={`p-1 rounded-md text-xs transition-colors ${
              activeTab === 'settings'
                ? 'bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 font-semibold'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
          </button>

          <div className="h-3 w-px bg-gray-200 dark:bg-gray-800 mx-0.5" />

          {typeof chrome !== 'undefined' && chrome.sidePanel && (
            <button
              onClick={handleOpenSidePanel}
              title="Buka Side Panel"
              className="p-1 text-gray-500 hover:text-sky-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            >
              <Sidebar className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            onClick={handleOpenFullTab}
            title="Buka Tab Penuh"
            className="p-1 text-gray-500 hover:text-sky-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Stepper Tabs Bar (3 Main Steps) */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-gray-50 dark:bg-gray-950/50">
        {steps.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center justify-center gap-1.5 py-1 px-1.5 rounded-md text-xs transition-all ${
                isActive
                  ? 'bg-white dark:bg-gray-900 text-sky-600 dark:text-sky-400 font-bold shadow-xs border border-gray-200/80 dark:border-gray-800'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-800/40 font-medium'
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center font-bold shrink-0 ${
                  isActive
                    ? 'bg-sky-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                {item.step}
              </span>
              <Icon className="h-3 w-3 shrink-0 hidden xs:inline" />
              <span className="truncate">{item.label}</span>
              {item.badge && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Data siap" />
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};


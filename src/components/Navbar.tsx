import React from 'react';
import {
  Upload,
  Layers,
  PlayCircle,
  History,
  Settings,
  Globe,
  Sliders,
  ExternalLink,
  Sidebar
} from 'lucide-react';

export type TabType = 'upload' | 'mapping' | 'targets' | 'runner' | 'history' | 'settings';

interface NavbarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  dataLoaded: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onSelectTab, dataLoaded }) => {
  const navItems = [
    { id: 'upload' as TabType, label: 'Upload Data', icon: Upload, badge: dataLoaded ? 'Ready' : undefined },
    { id: 'mapping' as TabType, label: 'Mapping Field', icon: Sliders },
    { id: 'targets' as TabType, label: 'Target Web', icon: Globe },
    { id: 'runner' as TabType, label: 'Runner', icon: PlayCircle },
    { id: 'history' as TabType, label: 'Riwayat & Log', icon: History },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
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
    <nav className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 shadow-xs select-none">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white font-bold shadow-xs">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
            AutoDataFiller
          </h1>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">Web Form Automator</p>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors relative ${
                isActive
                  ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/50'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-1 inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

        {typeof chrome !== 'undefined' && chrome.sidePanel && (
          <button
            onClick={handleOpenSidePanel}
            title="Buka di Panel Samping (Side Panel)"
            className="p-1.5 text-gray-500 hover:text-sky-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Sidebar className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          onClick={handleOpenFullTab}
          title="Buka di Tab Penuh (Agar tidak tertutup saat klik website)"
          className="p-1.5 text-gray-500 hover:text-sky-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </nav>
  );
};


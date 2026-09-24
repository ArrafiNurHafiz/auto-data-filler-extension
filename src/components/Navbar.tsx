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
  const primarySteps = [
    { id: 'upload' as TabType, step: '1', label: 'Upload Data', icon: Upload, badge: dataLoaded ? 'Siap' : undefined },
    { id: 'mapping' as TabType, step: '2', label: 'Mapping', icon: Sliders },
    { id: 'runner' as TabType, step: '3', label: 'Runner', icon: PlayCircle },
  ];

  const secondaryTabs = [
    { id: 'targets' as TabType, label: 'Presets', icon: Globe },
    { id: 'history' as TabType, label: 'Log', icon: History },
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
    <nav className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800/80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xs px-3.5 py-2 select-none shadow-xs">
      {/* Brand Logo & Title */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-500 text-white font-bold shadow-xs">
          <Layers className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xs font-bold text-gray-900 dark:text-white leading-none">AutoDataFiller</h1>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
              v2
            </span>
          </div>
        </div>
      </div>

      {/* Main Workflow Tabs */}
      <div className="flex items-center gap-1">
        <div className="flex items-center bg-gray-100 dark:bg-gray-800/80 p-0.5 rounded-lg">
          {primarySteps.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-white dark:bg-gray-900 text-sky-600 dark:text-sky-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                    isActive
                      ? 'bg-sky-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {item.step}
                </span>
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Data siap" />
                )}
              </button>
            );
          })}
        </div>

        <div className="h-4 w-px bg-gray-200 dark:border-gray-800 mx-1" />

        {/* Secondary Navigation */}
        <div className="flex items-center gap-0.5">
          {secondaryTabs.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="h-4 w-px bg-gray-200 dark:border-gray-800 mx-1" />

        {/* View Mode Shortcuts */}
        <div className="flex items-center gap-0.5">
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
            title="Buka di Tab Penuh"
            className="p-1.5 text-gray-500 hover:text-sky-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </nav>
  );
};


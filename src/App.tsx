import React, { useState, useEffect } from 'react';
import { Navbar, TabType } from './components/Navbar';
import { UploadPage } from './pages/UploadPage';
import { MappingPage } from './pages/MappingPage';
import { TargetWebPage } from './pages/TargetWebPage';
import { RunnerPage } from './pages/RunnerPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { TargetConfig, AutomationSettings } from './types';
import { ParsedSheetData } from './utils/excel';
import { StorageService, defaultSettings, initialMockConfigs } from './services/storage';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [sheetData, setSheetData] = useState<ParsedSheetData | null>(null);
  const [configs, setConfigs] = useState<TargetConfig[]>(initialMockConfigs);
  const [activeConfigId, setActiveConfigId] = useState<string>(initialMockConfigs[0].id);
  const [settings, setSettings] = useState<AutomationSettings>(defaultSettings);

  useEffect(() => {
    // Load persisted configs, settings & sheetData
    StorageService.getConfigs().then((loaded) => {
      if (loaded.length > 0) {
        setConfigs(loaded);
        setActiveConfigId(loaded[0].id);
      }
    });

    StorageService.getSettings().then((loadedSettings) => {
      setSettings(loadedSettings);
      applyTheme(loadedSettings.theme);
    });

    StorageService.getSheetData().then((loadedSheet) => {
      if (loadedSheet) {
        setSheetData(loadedSheet);
      }
    });
  }, []);

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleDataParsed = (data: ParsedSheetData | null) => {
    setSheetData(data);
    StorageService.saveSheetData(data);
  };

  const handleSaveConfig = async (updated: TargetConfig) => {
    await StorageService.saveConfig(updated);
    const refreshed = await StorageService.getConfigs();
    setConfigs(refreshed);
  };

  const handleDeleteConfig = async (configId: string) => {
    await StorageService.deleteConfig(configId);
    const refreshed = await StorageService.getConfigs();
    setConfigs(refreshed);
    if (activeConfigId === configId && refreshed.length > 0) {
      setActiveConfigId(refreshed[0].id);
    }
  };

  const handleImportConfigs = async (importedList: TargetConfig[]) => {
    const merged = [...configs];
    for (const item of importedList) {
      const idx = merged.findIndex((m) => m.id === item.id);
      if (idx >= 0) {
        merged[idx] = item;
      } else {
        merged.push(item);
      }
    }
    await StorageService.saveConfigs(merged);
    setConfigs(merged);
  };

  const handleSaveSettings = async (updatedSettings: AutomationSettings) => {
    await StorageService.saveSettings(updatedSettings);
    setSettings(updatedSettings);
    applyTheme(updatedSettings.theme);
  };

  const currentConfig = configs.find((c) => c.id === activeConfigId) || configs[0];

  return (
    <div className="w-full min-w-[360px] sm:w-[780px] max-w-full h-screen sm:max-h-[600px] sm:min-h-[560px] flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 antialiased overflow-hidden">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        dataLoaded={sheetData !== null && sheetData.totalRows > 0}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'upload' && (
          <UploadPage
            data={sheetData}
            onDataParsed={handleDataParsed}
            onGoToMapping={() => setActiveTab('mapping')}
          />
        )}

        {activeTab === 'mapping' && (
          <MappingPage
            excelHeaders={sheetData?.headers || []}
            activeConfig={currentConfig}
            onSaveConfig={handleSaveConfig}
            onGoToRunner={() => setActiveTab('runner')}
          />
        )}

        {activeTab === 'targets' && (
          <TargetWebPage
            configs={configs}
            activeConfigId={activeConfigId}
            onSelectConfig={setActiveConfigId}
            onSaveConfig={handleSaveConfig}
            onDeleteConfig={handleDeleteConfig}
            onImportConfigs={handleImportConfigs}
          />
        )}

        {activeTab === 'runner' && (
          <RunnerPage
            sheetData={sheetData}
            config={currentConfig}
            configs={configs}
            onSelectConfig={setActiveConfigId}
            settings={settings}
            onGoToUpload={() => setActiveTab('upload')}
          />
        )}

        {activeTab === 'history' && <HistoryPage />}

        {activeTab === 'settings' && (
          <SettingsPage
            settings={settings}
            onSaveSettings={handleSaveSettings}
          />
        )}
      </main>
    </div>
  );
};

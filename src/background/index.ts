chrome.runtime.onInstalled.addListener(async () => {
  console.log('[AutoDataFiller] Extension successfully installed/updated.');
  // Enable sidePanel on action click if supported
  if (chrome.sidePanel && 'setPanelBehavior' in chrome.sidePanel) {
    (chrome.sidePanel as any).setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
  }

  // Auto-inject content script into open tabs so existing tabs work immediately without refresh
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (
        tab.id &&
        tab.url &&
        (tab.url.startsWith('http://') || tab.url.startsWith('https://') || tab.url.startsWith('file://')) &&
        !tab.url.startsWith('chrome://') &&
        !tab.url.startsWith('chrome-extension://')
      ) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js'],
        }).catch(() => {});
      }
    }
  } catch {}
});

// Relay communication between popup and tabs
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_ACTIVE_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        sendResponse({ tab: tabs[0] });
      } else {
        // Fallback: search any active tab across windows
        chrome.tabs.query({ active: true }, (allActive) => {
          const valid = allActive?.find(
            (t) => t.url && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('chrome://')
          );
          sendResponse({ tab: valid || null });
        });
      }
    });
    return true;
  }

  if (message.type === 'GET_WEB_TABS') {
    chrome.tabs.query({}, (tabs) => {
      const webTabs = (tabs || []).filter(
        (t) =>
          t.url &&
          !t.url.startsWith('chrome-extension://') &&
          !t.url.startsWith('chrome://') &&
          !t.url.startsWith('devtools://') &&
          !t.url.startsWith('edge://')
      );
      sendResponse({ tabs: webTabs });
    });
    return true;
  }

  if (message.type === 'OPEN_SIDE_PANEL') {
    if (chrome.sidePanel && chrome.sidePanel.open) {
      if (sender.tab?.id) {
        chrome.sidePanel.open({ tabId: sender.tab.id }).then(() => sendResponse({ success: true })).catch((e) => sendResponse({ success: false, error: e.message }));
      } else {
        chrome.windows.getCurrent((w) => {
          if (w.id) {
            chrome.sidePanel.open({ windowId: w.id }).then(() => sendResponse({ success: true })).catch((e) => sendResponse({ success: false, error: e.message }));
          }
        });
      }
      return true;
    } else {
      // Fallback: open in new tab
      chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
      sendResponse({ success: true, fallbackTab: true });
    }
    return false;
  }

  if (message.type === 'ELEMENT_PICKED') {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ lastPickedElement: { ...message.payload, timestamp: Date.now() } });
    }
    return false;
  }

  if (message.type === 'OPEN_FULL_TAB') {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
    sendResponse({ success: true });
    return false;
  }
});


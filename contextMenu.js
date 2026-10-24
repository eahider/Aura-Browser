// Aura Browser - Professional Desktop Context Menu Manager
const { Menu, MenuItem, clipboard } = require('electron');

function setupContextMenu(webContents, callbacks = {}) {
  webContents.on('context-menu', (_event, params) => {
    const menu = new Menu();

    // Link context
    if (params.linkURL) {
      menu.append(new MenuItem({
        label: 'Open Link in New Tab',
        click: () => callbacks.onOpenLinkInNewTab && callbacks.onOpenLinkInNewTab(params.linkURL)
      }));
      menu.append(new MenuItem({
        label: 'Copy Link Address',
        click: () => clipboard.writeText(params.linkURL)
      }));
      menu.append(new MenuItem({ type: 'separator' }));
    }

    // Selected text context
    if (params.selectionText && params.selectionText.trim().length > 0) {
      const query = params.selectionText.trim();
      const truncated = query.length > 25 ? query.substring(0, 25) + '...' : query;
      menu.append(new MenuItem({
        label: `Search for "${truncated}"`,
        click: () => callbacks.onSearch && callbacks.onSearch(query)
      }));
      menu.append(new MenuItem({
        label: 'Copy',
        role: 'copy'
      }));
      menu.append(new MenuItem({ type: 'separator' }));
    }

    // Editable text input context
    if (params.isEditable) {
      menu.append(new MenuItem({ label: 'Undo', role: 'undo' }));
      menu.append(new MenuItem({ label: 'Redo', role: 'redo' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ label: 'Cut', role: 'cut' }));
      menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
      menu.append(new MenuItem({ label: 'Paste', role: 'paste' }));
      menu.append(new MenuItem({ label: 'Select All', role: 'selectAll' }));
      menu.append(new MenuItem({ type: 'separator' }));
    }

    // Navigation items
    menu.append(new MenuItem({
      label: 'Back',
      enabled: webContents.navigationHistory ? webContents.navigationHistory.canGoBack() : webContents.canGoBack(),
      click: () => {
        if (webContents.navigationHistory) webContents.navigationHistory.goBack();
        else webContents.goBack();
      }
    }));
    menu.append(new MenuItem({
      label: 'Forward',
      enabled: webContents.navigationHistory ? webContents.navigationHistory.canGoForward() : webContents.canGoForward(),
      click: () => {
        if (webContents.navigationHistory) webContents.navigationHistory.goForward();
        else webContents.goForward();
      }
    }));
    menu.append(new MenuItem({
      label: 'Reload',
      accelerator: 'CmdOrCtrl+R',
      click: () => webContents.reload()
    }));

    menu.append(new MenuItem({ type: 'separator' }));

    // Developer tools / Inspect
    menu.append(new MenuItem({
      label: 'Inspect Element',
      click: () => {
        webContents.inspectElement(params.x, params.y);
        if (!webContents.isDevToolsOpened()) {
          webContents.openDevTools({ mode: 'detach' });
        }
      }
    }));

    menu.popup();
  });
}

module.exports = { setupContextMenu };

// Electron shell for the admin dashboard.
//
// The dashboard itself is unchanged — this loads the same built React app and
// points it at the API. The API address is NOT baked into the renderer: it is read
// from an env var at build time and injected here, so the same code can be pointed
// at a staging server without editing the app.

const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

// The deployed backend. This is BAKED IN, not read from the environment at run
// time: the client's machine has no env vars set, so anything read at startup
// would be empty and the app would silently talk to nothing.
//
// A developer can still override it (API_URL=http://localhost:5000 npm run electron).
const API_URL = process.env.API_URL || 'https://heritage-hospital-1.onrender.com';

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#F6EFE6',
    title: 'Heritage Diagnostics — Admin',
    icon: path.join(__dirname, 'icon.png'),
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // The renderer needs the API address before it makes its first request.
      additionalArguments: [`--api-url=${API_URL}`],
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // No flash of an empty window while React boots.
  win.once('ready-to-show', () => win.show());

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // A prescription or report opens in the user's browser, not inside the shell —
  // an Electron window with no chrome is a bad PDF viewer.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  return win;
}

app.whenReady().then(() => {
  // A desktop app that ships with Chrome's default menu looks unfinished.
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'Heritage',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools', visible: isDev },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ]));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

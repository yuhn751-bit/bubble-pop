const { app, BrowserWindow, protocol } = require("electron");
const fs = require("fs");
const path = require("path");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
};

protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

function distDir() {
  return path.join(app.getAppPath(), "shell", "dist");
}

function resolveDistFile(requestUrl) {
  let pathname = "/";
  try {
    pathname = decodeURIComponent(new URL(requestUrl).pathname);
  } catch {
    return null;
  }
  if (pathname === "/" || pathname === "") pathname = "/index.html";
  const root = path.resolve(distDir());
  const target = path.resolve(root, `.${pathname}`);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return target;
}

function contentType(file) {
  return MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
}

let mainWindow = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 540,
    height: 960,
    minWidth: 360,
    minHeight: 640,
    title: "버블팝",
    backgroundColor: "#070B14",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      devTools: false,
    },
  });
  win.setMenuBarVisibility(false);
  win.removeMenu();
  win.once("ready-to-show", () => win.show());
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("app://localhost/")) event.preventDefault();
  });
  win.webContents.on("before-input-event", (event, input) => {
    const key = input.key.toLowerCase();
    const devtools =
      key === "f12" ||
      (input.control && input.shift && (key === "i" || key === "j" || key === "c"));
    const zoom = (input.control || input.meta) && ["+", "-", "=", "_", "0"].includes(input.key);
    if (devtools || zoom) {
      event.preventDefault();
      return;
    }
    if (key === "f11") {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });
  void win.loadURL("app://localhost/index.html");
  mainWindow = win;
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    if (process.platform === "win32") {
      app.setAppUserModelId("com.bubblepop.game");
    }
    protocol.handle("app", (request) => {
      const file = resolveDistFile(request.url);
      if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        return new Response("Not found", {
          status: 404,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }
      const data = fs.readFileSync(file);
      return new Response(data, {
        headers: {
          "content-type": contentType(file),
          "content-length": String(data.length),
        },
      });
    });
    createWindow();
  });

  app.on("window-all-closed", () => {
    app.quit();
  });
}

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { spawn } = require('child_process');
const crypto = require('crypto');
const http = require('http');
const path = require('path');
const fs = require('fs');

const APP_URL = 'http://localhost:3000';
const DESKTOP_TOKEN_EXCHANGE_URL = 'https://inumis-node-backend.onrender.com/api/oauth/google/desktop/token';
const GOOGLE_DESKTOP_CLIENT_ID = '211237775065-c5l25t57c5oe9bl02gkl2p93qq0mchok.apps.googleusercontent.com';
const GOOGLE_AUTH_TIMEOUT_MS = 5 * 60 * 1000;
let serverProcess = null;

function toBase64Url(value) {
  return value.toString('base64url');
}

function safeStateEquals(received, expected) {
  const receivedBuffer = Buffer.from(received || '');
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

function callbackPage(success) {
  const title = success ? 'Anmeldung abgeschlossen' : 'Anmeldung fehlgeschlagen';
  const message = success
    ? 'Sie können dieses Fenster schließen und zu inumis.app zurückkehren.'
    : 'Die Google-Anmeldung konnte nicht abgeschlossen werden. Kehren Sie zu inumis.app zurück.';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title></head><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:3rem;background:#12100f;color:#f8fafc"><h1>${title}</h1><p>${message}</p></body></html>`;
}

async function authenticateWithGoogleInSystemBrowser() {
  const state = toBase64Url(crypto.randomBytes(32));
  const codeVerifier = toBase64Url(crypto.randomBytes(64));
  const codeChallenge = toBase64Url(crypto.createHash('sha256').update(codeVerifier).digest());

  let callbackServer;
  let timeout;
  const callbackResult = new Promise((resolve, reject) => {
    callbackServer = http.createServer((request, response) => {
      const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
      if (request.method !== 'GET' || requestUrl.pathname !== '/oauth2/callback') {
        response.writeHead(404).end();
        return;
      }

      const receivedState = requestUrl.searchParams.get('state');
      const error = requestUrl.searchParams.get('error');
      const code = requestUrl.searchParams.get('code');

      if (!safeStateEquals(receivedState, state)) {
        response.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(callbackPage(false));
        reject(Object.assign(new Error('OAuth state validation failed.'), { code: 'oauth/state-mismatch' }));
        return;
      }

      if (error || !code) {
        response.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(callbackPage(false));
        reject(Object.assign(new Error(error || 'OAuth callback contained no authorization code.'), {
          code: error ? `oauth/${error}` : 'oauth/missing-code',
        }));
        return;
      }

      response.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
      });
      response.end(callbackPage(true));
      resolve(code);
    });

    callbackServer.once('error', reject);
    callbackServer.listen(0, '127.0.0.1');
    timeout = setTimeout(() => {
      reject(Object.assign(new Error('Google authentication timed out.'), { code: 'oauth/timeout' }));
    }, GOOGLE_AUTH_TIMEOUT_MS);
  });

  try {
    await new Promise((resolve, reject) => {
      if (callbackServer.listening) {
        resolve();
        return;
      }
      callbackServer.once('listening', resolve);
      callbackServer.once('error', reject);
    });

    const address = callbackServer.address();
    if (!address || typeof address === 'string') {
      throw Object.assign(new Error('Unable to determine OAuth callback port.'), { code: 'oauth/callback-port' });
    }

    const redirectUri = `http://127.0.0.1:${address.port}/oauth2/callback`;
    const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authorizationUrl.searchParams.set('client_id', GOOGLE_DESKTOP_CLIENT_ID);
    authorizationUrl.searchParams.set('redirect_uri', redirectUri);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('scope', 'openid email profile');
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('code_challenge', codeChallenge);
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');
    authorizationUrl.searchParams.set('prompt', 'select_account');

    await shell.openExternal(authorizationUrl.toString());
    const code = await callbackResult;

    const tokenResponse = await fetch(DESKTOP_TOKEN_EXCHANGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        codeVerifier,
        redirectUri,
      }),
      signal: AbortSignal.timeout(90_000),
    });

    const tokenResult = await tokenResponse.json();
    if (!tokenResponse.ok) {
      const errorCode = typeof tokenResult.error === 'string' ? tokenResult.error : 'oauth/token-exchange-failed';
      throw Object.assign(new Error(errorCode), {
        code: errorCode.startsWith('oauth/') ? errorCode : `oauth/${errorCode}`,
      });
    }
    if (typeof tokenResult.idToken !== 'string') {
      throw Object.assign(new Error('Google token response contained no ID token.'), { code: 'oauth/missing-id-token' });
    }

    return {
      idToken: tokenResult.idToken,
      accessToken: typeof tokenResult.accessToken === 'string' ? tokenResult.accessToken : null,
    };
  } finally {
    clearTimeout(timeout);
    if (callbackServer?.listening) callbackServer.close();
  }
}

function isServerReady() {
  return new Promise((resolve) => {
    const request = http.get(APP_URL, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 500);
    });
    request.setTimeout(1000, () => request.destroy());
    request.on('error', () => resolve(false));
  });
}

async function ensureServer() {
  if (await isServerReady()) return;

  const serverPath = path.join(__dirname, '../dist/server.cjs');
  if (!fs.existsSync(serverPath)) {
    throw new Error(`Bundled server not found: ${serverPath}`);
  }

  serverProcess = spawn(process.execPath, [serverPath], {
    cwd: app.isPackaged ? app.getPath('userData') : path.join(__dirname, '..'),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
    },
    stdio: 'inherit',
  });

  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (await isServerReady()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Local server did not become ready at ${APP_URL}`);
}

async function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 960,
    minHeight: 640,
    title: 'Numisma - Münzsammlung Manager',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  await ensureServer();
  await mainWindow.loadURL(APP_URL);
}

app.whenReady().then(async () => {
  ipcMain.handle('electron-google-auth', authenticateWithGoogleInSystemBrowser);
  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
}).catch((error) => {
  console.error('Failed to start Electron app:', error);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
});

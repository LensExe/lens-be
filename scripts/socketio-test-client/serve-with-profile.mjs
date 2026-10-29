import { spawn } from 'node:child_process';
import { createReadStream, readFileSync, realpathSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

const [distArgument, profileArgument] = process.argv.slice(2);

if (!distArgument || !profileArgument) {
  console.error('Usage: serve-with-profile.mjs <client-dist> <profile-json>');
  process.exit(2);
}

const distRoot = realpathSync(distArgument);
const profileExport = JSON.parse(readFileSync(profileArgument, 'utf8'));
const baseProfile = profileExport.profiles?.[0];

if (!baseProfile?.id || !baseProfile.address || !baseProfile.options) {
  console.error('No usable profile found in ' + profileArgument);
  process.exit(2);
}

const jsonForScript = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');
const profileLiteral = jsonForScript(baseProfile);
const bootstrap = [
  '<script>',
  '(() => {',
  "  const key = 'socketio-client';",
  '  const baseProfile = ' + profileLiteral + ';',
  '  try {',
  "    const persisted = JSON.parse(localStorage.getItem(key) || 'null');",
  '    const isCurrentVersion = persisted?.version === 3;',
  "    const state = isCurrentVersion && persisted.state && typeof persisted.state === 'object' ? persisted.state : {};",
  '    const profiles = Array.isArray(state.profiles) ? state.profiles : [];',
  '    const previous = profiles.find((item) => item.id === baseProfile.id);',
  '    const isActive = state.activeProfileId === baseProfile.id;',
  '    const previousOptions = previous?.options || {};',
  '    const activeOptions = isActive && state.options ? state.options : {};',
  '    const options = {',
  '      ...baseProfile.options,',
  '      ...previousOptions,',
  '      ...activeOptions,',
  '      auth: {',
  '        ...(baseProfile.options.auth || {}),',
  '        ...(previousOptions.auth || {}),',
  '        ...(activeOptions.auth || {}),',
  '      },',
  '      extraHeaders: {',
  '        ...(baseProfile.options.extraHeaders || {}),',
  '        ...(previousOptions.extraHeaders || {}),',
  '        ...(activeOptions.extraHeaders || {}),',
  '      },',
  '    };',
  '    const savedListeners = Array.isArray(previous?.listeners) && previous.listeners.length > 0',
  '      ? previous.listeners',
  '      : (isActive && Array.isArray(state.listeners) && state.listeners.length > 0',
  '        ? state.listeners',
  '        : []);',
  '    const listenerMap = new Map();',
  '    for (const listener of savedListeners) {',
  '      if (listener && typeof listener.title === "string") listenerMap.set(listener.title, listener);',
  '    }',
  '    for (const listener of Array.isArray(baseProfile.listeners) ? baseProfile.listeners : []) {',
  '      if (listener && typeof listener.title === "string" && !listenerMap.has(listener.title)) {',
  '        listenerMap.set(listener.title, listener);',
  '      }',
  '    }',
  '    const listeners = Array.from(listenerMap.values());',
  '    const profile = {',
  '      ...previous,',
  '      ...baseProfile,',
  '      options,',
  '      listeners: Array.isArray(listeners) ? listeners : [],',
  '      requestHistory: Array.isArray(previous?.requestHistory) ? previous.requestHistory : [],',
  '    };',
  '    const nextProfiles = profiles.filter((item) => item.id !== profile.id);',
  '    nextProfiles.push(profile);',
  '    const nextState = {',
  '      ...state,',
  '      address: profile.address,',
  '      options: profile.options,',
  '      profiles: nextProfiles,',
  '      activeProfileId: profile.id,',
  '      requestHistory: profile.requestHistory,',
  '      listeners: profile.listeners,',
  '    };',
  '    localStorage.setItem(key, JSON.stringify({ state: nextState, version: 3 }));',
  '  } catch (error) {',
  "    console.error('Could not load the local notification profile:', error);",
  '  }',
  '})();',
  '</script>',
].join('\n');

const indexPath = path.join(distRoot, 'index.html');
const indexHtml = readFileSync(indexPath, 'utf8').replace('<head>', '<head>\n' + bootstrap);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};
const host = '127.0.0.1';
const port = 8888;
const appUrl = 'http://' + host + ':' + port + '/';

function resolveRequestPath(requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, appUrl).pathname);
  } catch {
    return null;
  }

  const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = path.resolve(distRoot, relativePath);
  return filePath === distRoot || filePath.startsWith(distRoot + path.sep)
    ? filePath
    : null;
}

const server = createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  let filePath = resolveRequestPath(request.url || '/');
  if (!filePath) {
    response.writeHead(400).end('Invalid path');
    return;
  }

  let fileStat;
  try {
    fileStat = statSync(filePath);
    if (fileStat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      fileStat = statSync(filePath);
    }
  } catch {
    response.writeHead(404).end('Not found');
    return;
  }

  const isIndex = filePath === indexPath;
  response.writeHead(200, {
    'Content-Length': isIndex ? Buffer.byteLength(indexHtml) : fileStat.size,
    'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream',
    'Cache-Control': isIndex ? 'no-store' : 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  });

  if (request.method === 'HEAD') {
    response.end();
  } else if (isIndex) {
    response.end(indexHtml);
  } else {
    createReadStream(filePath).pipe(response);
  }
});

server.on('error', (error) => {
  console.error('Could not start Socket.IO Test Client on ' + appUrl + ': ' + error.message);
  if (error.code === 'EADDRINUSE') {
    console.error('Port 8888 is already in use. Close the existing client first.');
  }
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log('Socket.IO Test Client is running on ' + appUrl);
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', appUrl] : [appUrl];
  const browser = spawn(opener, args, { detached: true, stdio: 'ignore' });
  browser.unref();
});

process.on('SIGINT', () => server.close(() => process.exit(130)));

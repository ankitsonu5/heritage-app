// Hands the API address to the renderer before it makes its first request.
//
// contextIsolation is on and nodeIntegration is off, so the dashboard cannot reach
// Node. This is the only thing it is given — a string.

const { contextBridge } = require('electron');

const arg = process.argv.find(a => a.startsWith('--api-url='));
const apiUrl = arg ? arg.replace('--api-url=', '') : '';

contextBridge.exposeInMainWorld('HERITAGE', { apiUrl });

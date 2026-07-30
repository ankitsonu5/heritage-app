// Web connectivity. The agent's offline outbox drains on the 'online' event just
// as it does on a device regaining signal.
export function onConnectivityChange(handler: (online: boolean) => void) {
  const online = () => handler(true);
  const offline = () => handler(false);
  window.addEventListener('online', online);
  window.addEventListener('offline', offline);
  return () => {
    window.removeEventListener('online', online);
    window.removeEventListener('offline', offline);
  };
}

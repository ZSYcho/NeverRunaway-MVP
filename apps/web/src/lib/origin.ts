const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

/** Whether the app is served from this computer, so links to it won't open on a phone. */
export function isServedLocally(): boolean {
  return LOOPBACK_HOSTS.has(window.location.hostname)
}

export function AppearanceBootstrapScript() {
  // eslint-disable-next-line @next/next/no-sync-scripts -- ADR 0010: synchronous same-origin script prevents first-paint flash
  return <script src="/appearance-bootstrap.js" />;
}

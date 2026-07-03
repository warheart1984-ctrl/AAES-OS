import { DeveloperNav } from '../DeveloperNav';
import { styles } from '../../../lib/styles';

export default function KeysPage() {
  return (
    <main style={styles.page}>
      <DeveloperNav />
      <h1 style={styles.heading}>API Key Management</h1>
      <p>Create and manage API keys for programmatic access. Keys are scoped to your governance profile.</p>
      <KeysPanel />
    </main>
  );
}

async function KeysPanel() {
  const base = process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? 'http://localhost:4100';
  let keys: Array<{ id: string; label: string; keyPrefix: string; governanceProfile: string }> = [];

  try {
    const loginRes = await fetch(`${base}/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ownerId: 'dashboard', governanceProfile: 'balanced' }),
      cache: 'no-store',
    });
    const session = (await loginRes.json()) as { sessionId: string };
    const keysRes = await fetch(`${base}/v1/auth/keys`, {
      headers: { 'x-session-id': session.sessionId },
      cache: 'no-store',
    });
    if (keysRes.ok) keys = await keysRes.json();
  } catch {
    keys = [];
  }

  return (
    <div>
      <div style={styles.card}>
        <p>Use <code>organism keys generate --label my-key</code> to create keys via CLI.</p>
        <form action="/api/developer/keys" method="post">
          <label>
            Label{' '}
            <input name="label" defaultValue="dashboard-key" required />
          </label>{' '}
          <button type="submit">Generate Key</button>
        </form>
      </div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Label</th>
            <th style={styles.th}>Prefix</th>
            <th style={styles.th}>Profile</th>
          </tr>
        </thead>
        <tbody>
          {keys.length === 0 ? (
            <tr>
              <td style={styles.td} colSpan={3}>
                No keys yet — generate one above or via CLI.
              </td>
            </tr>
          ) : (
            keys.map((k) => (
              <tr key={k.id}>
                <td style={styles.td}>{k.label}</td>
                <td style={styles.td}>{k.keyPrefix}…</td>
                <td style={styles.td}>{k.governanceProfile}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

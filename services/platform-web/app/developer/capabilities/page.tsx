import { DeveloperNav } from '../DeveloperNav';
import { styles } from '../../../lib/styles';
import { getPlatform } from '../../../lib/platform';

export default function CapabilitiesPage() {
  const platform = getPlatform();
  const caps = platform.versions.list();

  return (
    <main style={styles.page}>
      <DeveloperNav />
      <h1 style={styles.heading}>Capability Publishing</h1>
      <div style={styles.card}>
        <form action="/api/developer/capabilities/publish" method="post">
          <div style={{ display: 'grid', gap: '0.5rem', maxWidth: 480 }}>
            <input name="id" placeholder="cap.my-module" required />
            <input name="name" placeholder="Display Name" required />
            <input name="organId" placeholder="organ-id" required />
            <input name="version" placeholder="1.0.0" required />
            <textarea name="description" placeholder="Description" rows={2} />
            <button type="submit">Publish Capability</button>
          </div>
        </form>
      </div>

      <h2>Published Capabilities</h2>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Current</th>
            <th style={styles.th}>Versions</th>
            <th style={styles.th}>Profile</th>
          </tr>
        </thead>
        <tbody>
          {caps.length === 0 ? (
            <tr>
              <td style={styles.td} colSpan={4}>
                No capabilities published yet.
              </td>
            </tr>
          ) : (
            caps.map((c) => (
              <tr key={c.id}>
                <td style={styles.td}>{c.id}</td>
                <td style={styles.td}>{c.currentVersion}</td>
                <td style={styles.td}>{c.versions.map((v) => v.version).join(', ')}</td>
                <td style={styles.td}>{c.governanceProfile}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </main>
  );
}

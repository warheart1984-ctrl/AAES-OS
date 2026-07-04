import { DeveloperNav } from '../DeveloperNav';
import { styles } from '../../../lib/styles';
import { getMesh, getPsom } from '../../../lib/platform';

export default function MeshPage() {
  const mesh = getMesh();
  const psom = getPsom();
  const organisms = mesh.discover();
  const connections = mesh.listConnections();
  const topology = psom.topology();
  const drift = psom.drift.scan();

  return (
    <main style={styles.page}>
      <DeveloperNav />
      <h1 style={styles.heading}>Mesh Network (PSOM)</h1>
      <p>Planet-Scale Organism Mesh — discovery, federation, topology, and drift detection.</p>

      {drift.length > 0 && (
        <div style={{ ...styles.card, borderColor: '#f4a261' }}>
          <strong>Governance drift detected:</strong> {drift.length} node(s)
        </div>
      )}

      <h2>Topology ({topology.nodes.length} nodes)</h2>
      <svg viewBox="0 0 600 200" style={{ width: '100%', maxWidth: 600, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        {topology.nodes.map((n, i) => {
          const x = 60 + (i % 4) * 140;
          const y = 60 + Math.floor(i / 4) * 80;
          return (
            <g key={n.nodeId}>
              <circle cx={x} cy={y} r={24} fill={n.status === 'online' ? '#22c55e' : '#ef4444'} opacity={0.85} />
              <text x={x} y={y + 40} textAnchor="middle" fill="#334155" fontSize={10}>{n.nodeId.slice(0, 14)}</text>
            </g>
          );
        })}
        {topology.edges.map((e, i) => {
          const fromIdx = topology.nodes.findIndex((n) => n.nodeId === e.from);
          const toIdx = topology.nodes.findIndex((n) => n.nodeId === e.to);
          if (fromIdx < 0 || toIdx < 0) return null;
          const x1 = 60 + (fromIdx % 4) * 140;
          const y1 = 60 + Math.floor(fromIdx / 4) * 80;
          const x2 = 60 + (toIdx % 4) * 140;
          const y2 = 60 + Math.floor(toIdx / 4) * 80;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3b82f6" strokeWidth={2} opacity={0.4} />;
        })}
      </svg>

      <h2>Discovered Organisms</h2>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Organism ID</th>
            <th style={styles.th}>Endpoint</th>
            <th style={styles.th}>Capabilities</th>
            <th style={styles.th}>Profile</th>
          </tr>
        </thead>
        <tbody>
          {organisms.map((o) => (
            <tr key={o.organismId}>
              <td style={styles.td}>{o.organismId}</td>
              <td style={styles.td}>{o.endpoint}</td>
              <td style={styles.td}>{o.capabilities.join(', ') || '—'}</td>
              <td style={styles.td}>{o.governanceProfile}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Connections</h2>
      {connections.length === 0 ? (
        <p style={styles.card}>No active connections. Use CLI: <code>organism connect --organism &lt;id&gt;</code></p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Connection</th>
              <th style={styles.th}>Remote</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Shared Caps</th>
            </tr>
          </thead>
          <tbody>
            {connections.map((c) => (
              <tr key={c.connectionId}>
                <td style={styles.td}>{c.connectionId}</td>
                <td style={styles.td}>{c.remoteOrganismId}</td>
                <td style={styles.td}>{c.status}</td>
                <td style={styles.td}>{c.sharedCapabilities.join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={styles.card}>
        <h3>Announce Remote Organism</h3>
        <form action="/api/developer/mesh/announce" method="post">
          <input name="organismId" placeholder="organism-id" required />{' '}
          <input name="endpoint" placeholder="https://..." required />{' '}
          <input name="capabilities" placeholder="cap.a,cap.b" />{' '}
          <button type="submit">Announce</button>
        </form>
      </div>
    </main>
  );
}

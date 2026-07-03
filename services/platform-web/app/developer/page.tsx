import { DeveloperNav } from './DeveloperNav';
import { styles } from '../../lib/styles';
import { getPlatform } from '../../lib/platform';
import { listGovernanceProfiles } from '@aaes-os/platform-core';

export default function DeveloperPage() {
  const platform = getPlatform();
  const caps = platform.versions.list();
  const profiles = listGovernanceProfiles();

  return (
    <main style={styles.page}>
      <DeveloperNav />
      <h1 style={styles.heading}>Developer Dashboard</h1>
      <p>Governed runtime super-platform — manage capabilities, governance, and mesh connections.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={styles.card}>
          <h3>Capabilities</h3>
          <p style={{ fontSize: '2rem', margin: 0 }}>{caps.length}</p>
        </div>
        <div style={styles.card}>
          <h3>Governance Profiles</h3>
          <p style={{ fontSize: '2rem', margin: 0 }}>{profiles.length}</p>
        </div>
        <div style={styles.card}>
          <h3>Platform Version</h3>
          <p style={{ fontSize: '1.25rem', margin: 0 }}>0.1.0</p>
        </div>
      </div>

      <section style={{ marginTop: '2rem' }}>
        <h2>Quick Start</h2>
        <pre style={{ ...styles.card, overflow: 'auto' }}>
{`# Login via CLI
organism login --owner you --profile balanced

# Publish a capability
organism publish --id cap.demo --name "Demo" --organ organ-1 --version 1.0.0

# Connect organisms
organism connect --organism remote-node`}
        </pre>
      </section>
    </main>
  );
}

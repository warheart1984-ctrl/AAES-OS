import { DeveloperNav } from '../DeveloperNav';
import { styles } from '../../../lib/styles';
import { getPlatform } from '../../../lib/platform';

export default function UsagePage() {
  const platform = getPlatform();
  const usage = platform.meter.summary('dashboard');

  return (
    <main style={styles.page}>
      <DeveloperNav />
      <h1 style={styles.heading}>Usage Metering</h1>
      <div style={styles.card}>
        <h3>Total Units</h3>
        <p style={{ fontSize: '2rem', margin: 0 }}>{usage.totalUnits}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={styles.card}>
          <h3>By Operation</h3>
          <ul>
            {Object.entries(usage.byOperation).map(([op, units]) => (
              <li key={op}>
                {op}: {units}
              </li>
            ))}
            {Object.keys(usage.byOperation).length === 0 && <li>No usage recorded</li>}
          </ul>
        </div>
        <div style={styles.card}>
          <h3>By Governance Profile</h3>
          <ul>
            {Object.entries(usage.byProfile).map(([profile, units]) => (
              <li key={profile}>
                {profile}: {units}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}

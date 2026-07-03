import { listGovernanceProfiles } from '@aaes-os/platform-core';

import { DeveloperNav } from '../DeveloperNav';
import { styles } from '../../../lib/styles';
import { getPsom } from '../../../lib/platform';

const PROFILE_COLORS: Record<string, string> = {
  strict: '#dc2626',
  balanced: '#2563eb',
  experimental: '#7c3aed',
};

export default function GovernancePage() {
  const profiles = listGovernanceProfiles();
  const psom = getPsom();
  const strictVsExp = psom.governance.negotiate('strict', 'experimental');
  const drift = psom.drift.scan();

  return (
    <main style={styles.page}>
      <DeveloperNav />
      <h1 style={styles.heading}>Governance Profiles</h1>
      <p>Select a governance mode for your organism. Profiles define invariants, risk thresholds, and allowed behaviors.</p>

      <div style={styles.card}>
        <h3>Profile Comparison: Strict ↔ Experimental</h3>
        <p>Negotiated: <strong>{strictVsExp.negotiatedProfile}</strong> · Agreed: {strictVsExp.agreed ? 'yes' : 'no'}</p>
        {strictVsExp.blockedBehaviors.length > 0 && (
          <p style={{ color: '#dc2626' }}>Blocked behaviors: {strictVsExp.blockedBehaviors.join(', ')}</p>
        )}
      </div>

      {drift.length > 0 && (
        <div style={styles.card}>
          <h3>Drift Heatmap</h3>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Node</th>
                <th style={styles.th}>Expected</th>
                <th style={styles.th}>Observed</th>
                <th style={styles.th}>Score</th>
              </tr>
            </thead>
            <tbody>
              {drift.map((d) => (
                <tr key={d.nodeId}>
                  <td style={styles.td}>{d.nodeId}</td>
                  <td style={styles.td}>{d.expectedProfile}</td>
                  <td style={styles.td}>{d.observedProfile}</td>
                  <td style={{ ...styles.td, color: d.driftScore > 0.5 ? '#dc2626' : '#16a34a' }}>
                    {(d.driftScore * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {profiles.map((p) => (
          <div key={p.id} style={styles.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={styles.badge(PROFILE_COLORS[p.id] ?? '#64748b')}>{p.name}</span>
              <strong>{p.billingTier}</strong>
              <span style={{ color: '#64748b' }}>API: {p.apiAccessLevel}</span>
            </div>
            <p>{p.description}</p>
            <p>
              <strong>Risk threshold:</strong> {p.riskThreshold} · <strong>Marketplace:</strong>{' '}
              {p.marketplaceAccess ? 'yes' : 'no'}
            </p>
            <p>
              <strong>Invariants:</strong> {p.invariantSets.join(', ')}
            </p>
            <p>
              <strong>Allowed behaviors:</strong> {p.allowedAgentBehaviors.join(', ')}
            </p>
            <form action="/api/developer/governance/select" method="post">
              <input type="hidden" name="profile" value={p.id} />
              <button type="submit">Select {p.name}</button>
            </form>
          </div>
        ))}
      </div>
    </main>
  );
}

import Link from 'next/link';

import { styles } from '../lib/styles';

const LINKS = [
  { href: '/developer', label: 'Overview' },
  { href: '/developer/keys', label: 'API Keys' },
  { href: '/developer/usage', label: 'Usage' },
  { href: '/developer/capabilities', label: 'Capabilities' },
  { href: '/developer/governance', label: 'Governance' },
  { href: '/developer/mesh', label: 'Mesh' },
];

export function DeveloperNav() {
  return (
    <nav style={styles.nav}>
      <strong style={{ marginRight: 'auto' }}>AAES Developer</strong>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} style={styles.link}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

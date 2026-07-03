export const styles = {
  page: {
    fontFamily: 'system-ui, sans-serif',
    maxWidth: 1100,
    margin: '0 auto',
    padding: '2rem 1.5rem',
    color: '#0f172a',
  } as React.CSSProperties,
  nav: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap' as const,
    marginBottom: '2rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #e2e8f0',
  },
  link: {
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: 500,
  },
  card: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '1.25rem',
    marginBottom: '1rem',
  },
  heading: {
    marginTop: 0,
    fontSize: '1.5rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    textAlign: 'left' as const,
    padding: '0.5rem',
    borderBottom: '2px solid #cbd5e1',
  },
  td: {
    padding: '0.5rem',
    borderBottom: '1px solid #e2e8f0',
  },
  badge: (color: string) =>
    ({
      display: 'inline-block',
      padding: '0.15rem 0.5rem',
      borderRadius: 4,
      fontSize: '0.75rem',
      background: color,
      color: '#fff',
    }) as React.CSSProperties,
};

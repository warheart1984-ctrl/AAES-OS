export const metadata = {
  title: 'AAES Developer Platform',
  description: 'Developer dashboard for the governed runtime super-platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#fff' }}>{children}</body>
    </html>
  );
}

import '../src/index.css';

export const metadata = {
  title: 'Maple Infinity',
  description: 'A neon-themed promotional website for the Maple Infinity event happening on January 3rd, 2027.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

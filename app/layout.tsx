import type { Metadata } from 'next';
import './globals.css';


export const metadata: Metadata = {
  title: 'Life and Adventures of Swango',
  description: 'Step into Lantern Alley. A small 2.5D city story about the lives you cross after dark.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

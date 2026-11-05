import './globals.css';

export const metadata = {
  title: 'Clover Motion | Type, Shape & Sound in Motion',
  description:
    'Clover Motion — Interactive kinetic typography, Swiss graphic systems, and procedural sound studio ready for Feed (4:5), Square (1:1), and Story (9:16).',
  icons: {
    icon: '/favicon.svg?v=clover',
    shortcut: '/favicon.svg?v=clover',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#0a0a0a] text-[#f5f5f5] selection:bg-[#16a34a] selection:text-white">
        {children}
      </body>
    </html>
  );
}

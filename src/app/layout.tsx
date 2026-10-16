import './globals.css';
import './dark-theme.css';
import './command-center.css';
import './proclair-blue.css';
import './proclair-ui-polish.css';
export const metadata = { title: 'Proclair OS · Lavage de vitres', description: 'Pilotage, prospection et opérations de lavage de vitres Proclair' };
export default function RootLayout({ children }: {children: React.ReactNode}) { return <html lang="fr"><body>{children}</body></html>; }

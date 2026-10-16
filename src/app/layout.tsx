import './globals.css';
import './dark-theme.css';
import './command-center.css';
export const metadata = { title: 'Proclair · Opérations', description: 'CRM et planification des interventions Proclair' };
export default function RootLayout({ children }: {children: React.ReactNode}) { return <html lang="fr"><body>{children}</body></html>; }

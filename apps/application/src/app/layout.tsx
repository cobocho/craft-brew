import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { ScrollToTop } from '@/components/scroll-to-top';
import { ClientErrorReporter } from '@/components/client-error-reporter';

const ibmPlexSans = IBM_Plex_Sans({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	title: 'Craft Brew',
	description: 'Craft Brew',
};

export const viewport: Viewport = {
	themeColor: '#191919',
	initialScale: 1,
	minimumScale: 1,
	maximumScale: 1,
	userScalable: false,
	viewportFit: 'cover',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className="dark min-h-screen"
		>
			<body className={`${ibmPlexSans.variable} antialiased min-h-screen`}>
				<ClientErrorReporter />
				<ScrollToTop />
				{children}
				<Toaster />
			</body>
		</html>
	);
}

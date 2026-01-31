import { Container } from '@/components/ui/container';

export default function BeerCreateLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <Container>{children}</Container>;
}

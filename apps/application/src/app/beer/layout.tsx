import { Container } from '@/components/ui/container';

export default function BeerLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <Container>{children}</Container>;
}

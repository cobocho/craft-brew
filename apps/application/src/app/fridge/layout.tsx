import { Container } from '@/components/ui/container';

export default function FridgeLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <Container>{children}</Container>;
}

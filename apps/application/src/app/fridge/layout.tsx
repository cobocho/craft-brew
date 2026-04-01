import { FridgeStreamProvider } from '@/contexts/fridge-stream-context';

export default function FridgeLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<FridgeStreamProvider>
			<div className="container mx-auto box-border h-[100svh] min-h-0 overflow-hidden px-4 pb-6 pt-16">
				{children}
			</div>
		</FridgeStreamProvider>
	);
}

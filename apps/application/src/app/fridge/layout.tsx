export default function FridgeLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="container mx-auto box-border h-[100svh] min-h-0 overflow-hidden px-4 pb-6 pt-16">
			{children}
		</div>
	);
}

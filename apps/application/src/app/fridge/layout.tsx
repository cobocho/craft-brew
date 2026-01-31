import { PageHeader } from '@/components/page-header';

export default function FridgeLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="h-dvh overflow-y-hidden px-4 pb-10 pt-16">
			<PageHeader title="냉장고" />
			<div className="h-full overflow-y-hidden">{children}</div>
		</div>
	);
}

'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
	title: string;
	showBackButton?: boolean;
	backHref?: string;
	action?: React.ReactNode;
}

export function PageHeader({
	title,
	showBackButton = false,
	backHref,
	action,
}: PageHeaderProps) {
	const router = useRouter();

	const handleBack = () => {
		if (backHref) {
			router.push(backHref);
		} else {
			router.back();
		}
	};

	return (
		<div className="mb-6 fixed top-0 left-0 right-0 z-[999] bg-neutral-900">
			<div className="flex items-center gap-3 px-3 py-3">
				{showBackButton && (
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={handleBack}
						aria-label="뒤로가기"
					>
						<ArrowLeft className="size-5" />
					</Button>
				)}
				<h1 className="text-2xl font-semibold tracking-tight text-foreground flex-1">
					{title}
				</h1>
				{action && <div>{action}</div>}
			</div>
		</div>
	);
}

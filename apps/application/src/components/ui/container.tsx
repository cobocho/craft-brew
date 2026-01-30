import { cn } from '@/lib/utils';

export const Container = ({
	children,
	className,
	...props
}: {
	children: React.ReactNode;
	className?: string;
} & React.HTMLAttributes<HTMLDivElement>) => {
	return (
		<div
			className={cn('container mx-auto px-4 py-6', className)}
			{...props}
		>
			{children}
		</div>
	);
};

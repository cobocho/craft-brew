import * as React from 'react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { RefreshCcwIcon } from 'lucide-react';

type DateTimePickerProps = Omit<
	React.ComponentProps<'input'>,
	'type' | 'onChange'
> & {
	onChange?: (value: string) => void;
	onReset?: () => void;
	containerClassName?: string;
	inputClassName?: string;
};

function DateTimePicker({
	id,
	value,
	onReset,
	onChange,
	containerClassName,
	inputClassName,
	...props
}: DateTimePickerProps) {
	return (
		<div className="flex items-center gap-2">
			<Input
				id={id}
				type="datetime-local"
				value={value}
				onChange={(event) => {
					onChange?.(event.target.value);
				}}
				className={cn('h-9 w-fit', inputClassName, containerClassName)}
				{...props}
			/>
			<RefreshCcwIcon
				className="size-4 cursor-pointer"
				onClick={() => {
					onReset?.();
				}}
			/>
		</div>
	);
}

export { DateTimePicker };

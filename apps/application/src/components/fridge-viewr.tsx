'use client';

import dayjs from 'dayjs';
import type { ReactNode } from 'react';

interface FridgeViewerProps {
	currentTemp: number;
	targetTemp: number;
	power: number;
	humidity: number;
	updatedAt: number;
	peltierEnabled: boolean;
	actions?: ReactNode;
}

export function FridgeViewer({
	currentTemp,
	targetTemp,
	power,
	humidity,
	updatedAt,
	peltierEnabled,
	actions,
}: FridgeViewerProps) {
	return (
		<div className="p-4 w-full aspect-[1/1.5] border border-border rounded-lg flex flex-col justify-between items-center relative">
			{actions && <div className="absolute top-4 right-4">{actions}</div>}
			<div className="absolute top-6 left-4 flex flex-col gap-2">
				<div className="flex flex-col">
					<span className="text-xs text-muted-foreground mb-2">
						{dayjs(updatedAt * 1000).format('YYYY-MM-DD HH:mm:ss')}
					</span>
					<span className="text-sm text-muted-foreground">
						온도 <span className="text-xs">/ 목표 온도</span>
					</span>
					<span className="text-2xl font-bold">
						{currentTemp}°C
						<span className="text-muted-foreground text-sm font-normal">
							{' '}
							/ {targetTemp}°C
						</span>
					</span>
				</div>
				<div className="flex flex-col">
					<span className="text-sm text-muted-foreground">습도</span>
					<span className="text-2xl font-bold">{humidity}%</span>
				</div>
				<div className="flex flex-col">
					<span className="text-sm text-muted-foreground">펠티어 가동률</span>
					<span className="text-2xl font-bold">{power}%</span>
				</div>
			</div>
		</div>
	);
}

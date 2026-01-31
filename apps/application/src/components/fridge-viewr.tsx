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
	info?: ReactNode;
}

export function FridgeViewer({
	currentTemp,
	targetTemp,
	power,
	humidity,
	updatedAt,
	peltierEnabled,
	actions,
	info,
}: FridgeViewerProps) {
	return (
		<div className="p-4 w-full h-full rounded-lg flex flex-col justify-between items-center relative">
			{actions && <div className="absolute top-4 right-4">{actions}</div>}
			<div className="absolute top-6 left-4 flex flex-col gap-2">
				<div className="flex flex-col">
					<span className="text-sm text-muted-foreground mb-2">
						{dayjs(updatedAt * 1000).format('YYYY-MM-DD HH:mm:ss')}
					</span>
					<span className="text-lg text-muted-foreground">
						온도 <span className="text-sm">/ 목표 온도</span>
					</span>
					<span className="text-3xl font-bold">
						{currentTemp}°C
						<span className="text-muted-foreground text-lg font-normal">
							{' '}
							/ {targetTemp}°C
						</span>
					</span>
				</div>
				<div className="flex flex-col">
					<span className="text-lg text-muted-foreground">습도</span>
					<span className="text-3xl font-bold">{humidity}%</span>
				</div>
				<div className="flex flex-col">
					<span className="text-lg text-muted-foreground">펠티어 가동률</span>
					<span className="text-3xl font-bold">{power}%</span>
				</div>
			</div>
			{info && <div className="absolute bottom-4 left-4 right-4">{info}</div>}
		</div>
	);
}

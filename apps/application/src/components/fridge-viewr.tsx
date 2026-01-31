'use client';

interface FridgeViewerProps {
	currentTemp: number;
	targetTemp: number;
	power: number;
	humidity: number;
	updatedAt: string;
	peltierEnabled: boolean;
}

export function FridgeViewer({
	currentTemp,
	targetTemp,
	power,
	humidity,
	updatedAt,
	peltierEnabled,
}: FridgeViewerProps) {
	return (
		<div className="p-4 border border-border rounded-lg h-full flex flex-col justify-between items-center relative">
			<div className="absolute top-6 left-4 flex flex-col gap-2">
				<div className="flex flex-col">
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

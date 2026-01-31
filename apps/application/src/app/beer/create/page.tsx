'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BEER_TYPES } from '@/constants/beer-types';

export default function BeerCreatePage() {
	const [fermentationStart, setFermentationStart] = useState('');
	const [fermentationEnd, setFermentationEnd] = useState('');
	const [agingStart, setAgingStart] = useState('');
	const [agingEnd, setAgingEnd] = useState('');

	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<div className="mb-6">
				<h1 className="text-2xl font-semibold tracking-tight text-foreground">
					맥주 생성
				</h1>
			</div>

			{/* Form Container with Tabs */}
			<Tabs
				defaultValue="basic"
				className="pb-12"
			>
				<TabsList
					variant="line"
					className="mb-6"
				>
					<TabsTrigger value="basic">기본 정보</TabsTrigger>
					<TabsTrigger value="brewing">양조 과정</TabsTrigger>
					<TabsTrigger value="memo">메모</TabsTrigger>
				</TabsList>

				{/* Tab 1: 기본 정보 */}
				<TabsContent
					value="basic"
					className="space-y-6"
				>
					{/* 기본 정보 */}
					<section className="space-y-5">
						<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
							기본 정보
						</h2>
						<div className="space-y-4">
							<div className="space-y-1.5">
								<Label
									htmlFor="name"
									required
								>
									맥주 이름
								</Label>
								<Input
									id="name"
									placeholder="페일 에일"
									className="h-11"
								/>
							</div>
							<div className="space-y-1.5">
								<Label
									htmlFor="type"
									required
								>
									맥주 타입
								</Label>
								<Select>
									<SelectTrigger className="h-11">
										<SelectValue placeholder="맥주 타입 선택" />
									</SelectTrigger>
									<SelectContent>
										{BEER_TYPES.map((beerType) => (
											<SelectItem
												key={beerType.value}
												value={beerType.value}
											>
												<div
													className="w-2 h-2 rounded-full"
													style={{ backgroundColor: beerType.color }}
												/>
												{beerType.value}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1.5">
								<Label
									htmlFor="volume"
									required
								>
									용량 (L)
								</Label>
								<Input
									id="volume"
									type="number"
									inputMode="decimal"
									step="0.1"
									placeholder="20.0"
									className="h-11"
								/>
							</div>
						</div>
					</section>

					{/* 재료 */}
					<section className="space-y-5">
						<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
							재료
						</h2>
						<div className="space-y-4">
							<div className="space-y-1.5">
								<Label
									htmlFor="malt"
									required
								>
									맥아
								</Label>
								<Input
									id="malt"
									placeholder="사용한 맥아"
									className="h-11"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="hop">홉</Label>
								<Input
									id="hop"
									placeholder="사용한 홉 종류"
									className="h-11"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="water">물</Label>
								<Input
									id="water"
									placeholder="물 종류"
									className="h-11"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="yeast">효모</Label>
								<Input
									id="yeast"
									placeholder="US-05"
									className="h-11"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="additives">첨가물</Label>
								<Input
									id="additives"
									placeholder="기타 첨가물"
									className="h-11"
								/>
							</div>
						</div>
					</section>
				</TabsContent>

				{/* Tab 2: 양조 과정 */}
				<TabsContent
					value="brewing"
					className="space-y-6"
				>
					{/* 비중 */}
					<section className="space-y-5">
						<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
							비중
						</h2>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<Label htmlFor="og">OG</Label>
								<Input
									id="og"
									type="number"
									inputMode="decimal"
									step="0.001"
									placeholder="1.050"
									className="h-11"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="fg">FG</Label>
								<Input
									id="fg"
									type="number"
									inputMode="decimal"
									step="0.001"
									placeholder="1.010"
									className="h-11"
								/>
							</div>
						</div>
					</section>

					{/* 발효 정보 */}
					<section className="space-y-5">
						<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
							발효
						</h2>
						<div className="space-y-4">
							<div className="flex flex-col gap-4">
								<div className="space-y-1.5">
									<Label htmlFor="fermentationStart">시작일</Label>
									<DateTimePicker
										id="fermentationStart"
										value={fermentationStart}
										onChange={setFermentationStart}
										onReset={() => {
											setFermentationStart('');
										}}
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="fermentationEnd">종료일</Label>
									<DateTimePicker
										id="fermentationEnd"
										value={fermentationEnd}
										onChange={setFermentationEnd}
										onReset={() => {
											setFermentationEnd('');
										}}
									/>
								</div>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="fermentationTemp">목표 온도 (°C)</Label>
								<Input
									id="fermentationTemp"
									type="number"
									inputMode="decimal"
									step="0.1"
									placeholder="18.0"
									className="h-11"
								/>
							</div>
						</div>
					</section>

					{/* 숙성 정보 */}
					<section className="space-y-5">
						<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
							숙성
						</h2>
						<div className="space-y-4">
							<div className="flex flex-col gap-4">
								<div className="space-y-1.5">
									<Label htmlFor="agingStart">시작일</Label>
									<DateTimePicker
										id="agingStart"
										value={agingStart}
										onChange={setAgingStart}
										onReset={() => {
											setAgingStart('');
										}}
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="agingEnd">종료일</Label>
									<DateTimePicker
										id="agingEnd"
										value={agingEnd}
										onChange={setAgingEnd}
										onReset={() => {
											setAgingEnd('');
										}}
									/>
								</div>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="agingTemp">목표 온도 (°C)</Label>
								<Input
									id="agingTemp"
									type="number"
									inputMode="decimal"
									step="0.1"
									placeholder="4.0"
									className="h-11"
								/>
							</div>
						</div>
					</section>
				</TabsContent>

				{/* Tab 3: 메모 */}
				<TabsContent
					value="memo"
					className="space-y-6"
				>
					<section className="space-y-5">
						<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
							메모
						</h2>
						<div className="space-y-1.5">
							<Textarea
								id="memo"
								placeholder="추가 메모나 특이사항"
								className="min-h-[120px] resize-none"
							/>
						</div>
					</section>
				</TabsContent>
			</Tabs>

			{/* Bottom Action Bar */}
			<div className="w-full pb-4">
				<Button className="w-full h-12 font-medium shadow-sm">등록</Button>
			</div>
		</div>
	);
}

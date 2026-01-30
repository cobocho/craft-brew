'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function BeerCreatePage() {
	const [fermentationStart, setFermentationStart] = useState<Date>();
	const [fermentationEnd, setFermentationEnd] = useState<Date>();
	const [agingStart, setAgingStart] = useState<Date>();
	const [agingEnd, setAgingEnd] = useState<Date>();

	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<div className="mb-6">
				<h1 className="text-2xl font-semibold tracking-tight text-foreground">
					맥주 생성
				</h1>
			</div>

			{/* Form Container */}
			<div className="pb-12 space-y-6">
				{/* 기본 정보 */}
				<section className="space-y-5">
					<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
						기본 정보
					</h2>
					<div className="space-y-4">
						<div className="space-y-1.5">
							<Label
								htmlFor="name"
								className="text-sm font-medium text-foreground"
							>
								맥주 이름 *
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
								className="text-sm font-medium text-foreground"
							>
								맥주 타입 *
							</Label>
							<Select>
								<SelectTrigger className="h-11">
									<SelectValue placeholder="맥주 타입 선택" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ipa">IPA</SelectItem>
									<SelectItem value="pale-ale">Pale Ale</SelectItem>
									<SelectItem value="stout">Stout</SelectItem>
									<SelectItem value="porter">Porter</SelectItem>
									<SelectItem value="lager">Lager</SelectItem>
									<SelectItem value="pilsner">Pilsner</SelectItem>
									<SelectItem value="wheat">Wheat Beer</SelectItem>
									<SelectItem value="sour">Sour Beer</SelectItem>
									<SelectItem value="etc">기타</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label
								htmlFor="volume"
								className="text-sm font-medium text-foreground"
							>
								용량 (L) *
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
								className="text-sm font-medium text-foreground"
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
							<Label
								htmlFor="hop"
								className="text-sm font-medium text-foreground"
							>
								홉
							</Label>
							<Input
								id="hop"
								placeholder="사용한 홉 종류"
								className="h-11"
							/>
						</div>
						<div className="space-y-1.5">
							<Label
								htmlFor="water"
								className="text-sm font-medium text-foreground"
							>
								물
							</Label>
							<Input
								id="water"
								placeholder="물 종류"
								className="h-11"
							/>
						</div>
						<div className="space-y-1.5">
							<Label
								htmlFor="yeast"
								className="text-sm font-medium text-foreground"
							>
								효모
							</Label>
							<Input
								id="yeast"
								placeholder="US-05"
								className="h-11"
							/>
						</div>
						<div className="space-y-1.5">
							<Label
								htmlFor="additives"
								className="text-sm font-medium text-foreground"
							>
								첨가물
							</Label>
							<Input
								id="additives"
								placeholder="기타 첨가물"
								className="h-11"
							/>
						</div>
					</div>
				</section>

				{/* 비중 */}
				<section className="space-y-5">
					<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
						비중
					</h2>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<Label
								htmlFor="og"
								className="text-sm font-medium text-foreground"
							>
								OG
							</Label>
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
							<Label
								htmlFor="fg"
								className="text-sm font-medium text-foreground"
							>
								FG
							</Label>
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
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<Label className="text-sm font-medium text-foreground">
									시작일 *
								</Label>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className="w-full h-11 justify-start text-left font-normal"
										>
											<CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
											{fermentationStart ? (
												<span className="text-sm">
													{format(fermentationStart, 'PPP', { locale: ko })}
												</span>
											) : (
												<span className="text-sm text-muted-foreground">
													선택
												</span>
											)}
										</Button>
									</PopoverTrigger>
									<PopoverContent
										className="w-auto p-0"
										align="start"
									>
										<Calendar
											mode="single"
											selected={fermentationStart}
											onSelect={setFermentationStart}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
							</div>
							<div className="space-y-1.5">
								<Label className="text-sm font-medium text-foreground">
									종료일 *
								</Label>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className="w-full h-11 justify-start text-left font-normal"
										>
											<CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
											{fermentationEnd ? (
												<span className="text-sm">
													{format(fermentationEnd, 'PPP', { locale: ko })}
												</span>
											) : (
												<span className="text-sm text-muted-foreground">
													선택
												</span>
											)}
										</Button>
									</PopoverTrigger>
									<PopoverContent
										className="w-auto p-0"
										align="start"
									>
										<Calendar
											mode="single"
											selected={fermentationEnd}
											onSelect={setFermentationEnd}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
							</div>
						</div>
						<div className="space-y-1.5">
							<Label
								htmlFor="fermentationTemp"
								className="text-sm font-medium text-foreground"
							>
								목표 온도 (°C) *
							</Label>
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
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<Label className="text-sm font-medium text-foreground">
									시작일 *
								</Label>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className="w-full h-11 justify-start text-left font-normal"
										>
											<CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
											{agingStart ? (
												<span className="text-sm">
													{format(agingStart, 'PPP', { locale: ko })}
												</span>
											) : (
												<span className="text-sm text-muted-foreground">
													선택
												</span>
											)}
										</Button>
									</PopoverTrigger>
									<PopoverContent
										className="w-auto p-0"
										align="start"
									>
										<Calendar
											mode="single"
											selected={agingStart}
											onSelect={setAgingStart}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
							</div>
							<div className="space-y-1.5">
								<Label className="text-sm font-medium text-foreground">
									종료일 *
								</Label>
								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className="w-full h-11 justify-start text-left font-normal"
										>
											<CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
											{agingEnd ? (
												<span className="text-sm">
													{format(agingEnd, 'PPP', { locale: ko })}
												</span>
											) : (
												<span className="text-sm text-muted-foreground">
													선택
												</span>
											)}
										</Button>
									</PopoverTrigger>
									<PopoverContent
										className="w-auto p-0"
										align="start"
									>
										<Calendar
											mode="single"
											selected={agingEnd}
											onSelect={setAgingEnd}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
							</div>
						</div>
						<div className="space-y-1.5">
							<Label
								htmlFor="agingTemp"
								className="text-sm font-medium text-foreground"
							>
								목표 온도 (°C) *
							</Label>
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

				{/* 메모 */}
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
			</div>

			{/* Bottom Action Bar */}
			<div className="w-full pb-4">
				<Button className="w-full h-12 font-medium shadow-sm">등록</Button>
			</div>
		</div>
	);
}

'use client';

import { Input } from '@/components/ui/input';
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
import {
	CreateBeerInput,
	CreateBeerSchema,
	UpdateBeerInput,
	UpdateBeerSchema,
} from '@/api/beer/schema';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Beer } from '@craft-brew/database';
import { createBeer, updateBeer } from '@/api/beer/action';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface CreateBeerFormProps {
	mode: 'create';
	defaultValues?: never;
}

interface UpdateBeerFormProps {
	mode: 'update';
	defaultValues: Beer;
}

type BeerFormProps = CreateBeerFormProps | UpdateBeerFormProps;

export function BeerForm({ mode, defaultValues }: BeerFormProps) {
	const router = useRouter();
	const form = useForm({
		resolver: zodResolver(
			mode === 'create' ? CreateBeerSchema : UpdateBeerSchema,
		),
		defaultValues: defaultValues ?? {
			name: '',
			type: '',
			volume: '10.0',
		},
	});

	const handleCreate = async (data: CreateBeerInput) => {
		try {
			const result = await createBeer(data);

			if (result.success) {
				toast.success('맥주가 성공적으로 등록되었습니다.');
				router.back();
				return;
			}
			if (result.error) {
				toast.error(result.error);
			}
		} catch (error) {
			console.error(error);
		}
	};

	const handleUpdate = async (data: UpdateBeerInput) => {
		try {
			const result = await updateBeer(data);
			if (result.success) {
				toast.success('맥주가 성공적으로 수정되었습니다.');
				router.back();
				return;
			}
			if (result.error) {
				toast.error(result.error);
			}
		} catch (error) {
			console.error(error);
		}
	};

	return (
		<Form {...form}>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					if (mode === 'create') {
						form.handleSubmit((data) =>
							handleCreate(data as CreateBeerInput),
						)();
					} else {
						form.handleSubmit((data) =>
							handleUpdate(data as UpdateBeerInput),
						)();
					}
				}}
				onKeyDown={(e) => {
					if (e.key === 'Enter' && e.target instanceof HTMLElement) {
						const tagName = e.target.tagName.toLowerCase();
						if (tagName !== 'button' && tagName !== 'textarea') {
							e.preventDefault();
						}
					}
				}}
			>
				<Tabs
					defaultValue="basic"
					className="pb-12 w-full"
					id="beer-form-tabs"
					suppressHydrationWarning
					onValueChange={() => {
						window.scrollTo({ top: 0, behavior: 'smooth' });
					}}
				>
					<TabsList
						variant="line"
						className="mb-6 sticky top-13 bg-background z-10 w-full"
					>
						<TabsTrigger value="basic">기본 정보</TabsTrigger>
						<TabsTrigger value="brewing">양조 과정</TabsTrigger>
						<TabsTrigger value="memo">메모</TabsTrigger>
					</TabsList>

					<TabsContent
						value="basic"
						className="space-y-6"
					>
						<section className="space-y-5">
							<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
								기본 정보
							</h2>
							<div className="space-y-4">
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel required>맥주 이름</FormLabel>
											<FormControl>
												<Input
													placeholder="페일 에일"
													className="h-11"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="type"
									render={({ field }) => (
										<FormItem>
											<FormLabel required>맥주 타입</FormLabel>
											<Select
												onValueChange={field.onChange}
												defaultValue={field.value}
												value={field.value}
											>
												<FormControl>
													<SelectTrigger className="h-11">
														<SelectValue placeholder="맥주 타입 선택" />
													</SelectTrigger>
												</FormControl>
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
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="volume"
									render={({ field }) => (
										<FormItem>
											<FormLabel required>용량 (L)</FormLabel>
											<FormControl>
												<Input
													type="number"
													inputMode="decimal"
													step="0.1"
													placeholder="20.0"
													className="h-11"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</section>

						<section className="space-y-5">
							<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
								재료
							</h2>
							<div className="space-y-4">
								<FormField
									control={form.control}
									name="malt"
									render={({ field }) => (
										<FormItem>
											<FormLabel>맥아</FormLabel>
											<FormControl>
												<Input
													placeholder="사용한 맥아"
													className="h-11"
													value={field.value || ''}
													onChange={field.onChange}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="hop"
									render={({ field }) => (
										<FormItem>
											<FormLabel>홉</FormLabel>
											<FormControl>
												<Input
													placeholder="사용한 홉 종류"
													className="h-11"
													value={field.value || ''}
													onChange={field.onChange}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="water"
									render={({ field }) => (
										<FormItem>
											<FormLabel>물</FormLabel>
											<FormControl>
												<Input
													placeholder="물 종류"
													className="h-11"
													value={field.value || ''}
													onChange={field.onChange}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="yeast"
									render={({ field }) => (
										<FormItem>
											<FormLabel>효모</FormLabel>
											<FormControl>
												<Input
													placeholder="US-05"
													className="h-11"
													value={field.value || ''}
													onChange={field.onChange}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="additives"
									render={({ field }) => (
										<FormItem>
											<FormLabel>첨가물</FormLabel>
											<FormControl>
												<Input
													placeholder="기타 첨가물"
													className="h-11"
													value={field.value || ''}
													onChange={field.onChange}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</section>
					</TabsContent>

					<TabsContent
						value="brewing"
						className="space-y-6"
					>
						<section className="space-y-5">
							<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
								비중
							</h2>
							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="og"
									render={({ field }) => (
										<FormItem>
											<FormLabel>OG</FormLabel>
											<FormControl>
												<Input
													type="number"
													inputMode="decimal"
													step="0.001"
													placeholder="1.050"
													className="h-11"
													value={field.value || ''}
													onChange={field.onChange}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="fg"
									render={({ field }) => (
										<FormItem>
											<FormLabel>FG</FormLabel>
											<FormControl>
												<Input
													type="number"
													inputMode="decimal"
													step="0.001"
													placeholder="1.010"
													className="h-11"
													value={field.value || ''}
													onChange={field.onChange}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</section>

						<section className="space-y-5">
							<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
								발효
							</h2>
							<div className="space-y-4">
								<div className="flex flex-col gap-4">
									<FormField
										control={form.control}
										name="fermentationStart"
										render={({ field }) => (
											<FormItem>
												<FormLabel>시작일</FormLabel>
												<FormControl>
													<DateTimePicker
														value={
															field.value
																? new Date(field.value).toISOString()
																: ''
														}
														onChange={(value) =>
															field.onChange(value ? new Date(value) : null)
														}
														onReset={() => field.onChange(null)}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="fermentationEnd"
										render={({ field }) => (
											<FormItem>
												<FormLabel>종료일</FormLabel>
												<FormControl>
													<DateTimePicker
														value={
															field.value
																? new Date(field.value).toISOString()
																: ''
														}
														onChange={(value) =>
															field.onChange(value ? new Date(value) : null)
														}
														onReset={() => field.onChange(null)}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
								<FormField
									control={form.control}
									name="fermentationTemp"
									render={({ field }) => (
										<FormItem>
											<FormLabel>목표 온도 (°C)</FormLabel>
											<FormControl>
												<Input
													type="number"
													inputMode="decimal"
													step="0.1"
													placeholder="18.0"
													className="h-11"
													value={field.value || ''}
													onChange={field.onChange}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</section>

						<section className="space-y-5">
							<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
								숙성
							</h2>
							<div className="space-y-4">
								<div className="flex flex-col gap-4">
									<FormField
										control={form.control}
										name="agingStart"
										render={({ field }) => (
											<FormItem>
												<FormLabel>시작일</FormLabel>
												<FormControl>
													<DateTimePicker
														value={
															field.value
																? new Date(field.value).toISOString()
																: ''
														}
														onChange={(value) =>
															field.onChange(value ? new Date(value) : null)
														}
														onReset={() => field.onChange(null)}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="agingEnd"
										render={({ field }) => (
											<FormItem>
												<FormLabel>종료일</FormLabel>
												<FormControl>
													<DateTimePicker
														value={
															field.value
																? new Date(field.value).toISOString()
																: ''
														}
														onChange={(value) =>
															field.onChange(value ? new Date(value) : null)
														}
														onReset={() => field.onChange(null)}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
								<FormField
									control={form.control}
									name="agingTemp"
									render={({ field }) => (
										<FormItem>
											<FormLabel>목표 온도 (°C)</FormLabel>
											<FormControl>
												<Input
													type="number"
													inputMode="decimal"
													step="0.1"
													placeholder="4.0"
													className="h-11"
													value={field.value || ''}
													onChange={field.onChange}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</section>
					</TabsContent>

					<TabsContent
						value="memo"
						className="space-y-6"
					>
						<section className="space-y-5">
							<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
								메모
							</h2>
							<FormField
								control={form.control}
								name="memo"
								render={({ field }) => (
									<FormItem>
										<FormControl>
											<Textarea
												placeholder="추가 메모나 특이사항"
												className="min-h-[120px] resize-none"
												value={field.value || ''}
												onChange={field.onChange}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</section>
					</TabsContent>
				</Tabs>

				<div className="w-full pb-4">
					<Button
						type="submit"
						className="w-full h-12 font-medium shadow-sm"
					>
						{mode === 'create' ? '등록' : '수정'}
					</Button>
				</div>
			</form>
		</Form>
	);
}

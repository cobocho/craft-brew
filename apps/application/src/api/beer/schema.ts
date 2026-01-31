import { z } from 'zod';

export const CreateBeerSchema = z.object({
	name: z.string().min(1, { message: '맥주 이름을 입력해주세요.' }),
	type: z.string().min(1, { message: '맥주 종류를 선택해주세요.' }),

	volume: z.string({ message: '용량을 입력해주세요.' }),

	malt: z.string().optional().nullable(),
	hop: z.string().optional().nullable(),
	water: z.string().optional().nullable(),
	yeast: z.string().optional().nullable(),
	additives: z.string().optional().nullable(),

	og: z.string().optional().nullable(),
	fg: z.string().optional().nullable(),

	memo: z.string().optional().nullable(),

	fermentationStart: z.date().optional().nullable(),
	fermentationEnd: z.date().optional().nullable(),

	fermentationTemp: z.string().optional().nullable(),
	fermentationActualTemp: z.string().optional().nullable(),
	fermentationActualHumidity: z.string().optional().nullable(),

	agingStart: z.date().optional().nullable(),
	agingEnd: z.date().optional().nullable(),

	agingTemp: z.string().optional().nullable(),
	agingActualTemp: z.string().optional().nullable(),
	agingActualHumidity: z.string().optional().nullable(),
});

export type CreateBeerInput = z.infer<typeof CreateBeerSchema>;

export const UpdateBeerSchema = CreateBeerSchema.extend({
	id: z.number().int().positive(),
});

export type UpdateBeerInput = z.infer<typeof UpdateBeerSchema>;

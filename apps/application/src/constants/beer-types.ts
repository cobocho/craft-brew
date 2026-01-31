export interface BeerType {
	value: string;
	color: string;
	// 발효 권장 온도 (°C)
	fermentationTemp: number;
	// 발효 권장 기간 (일)
	fermentationDays: number;
	// 숙성(컨디셔닝/라거링) 권장 온도 (°C)
	agingTemp: number;
	// 숙성 권장 기간 (일)
	agingDays: number;
}

// ✅ 유지보수 편하게 "스타일 프로파일"로 묶어둠
const PROFILES = {
	// Hoppy Ales (IPA 계열) — 너무 오래 숙성하면 홉 향이 빠져서 비교적 짧게
	HOPPY_ALE: {
		fermentationTemp: 20,
		fermentationDays: 7,
		agingTemp: 4,
		agingDays: 5,
	},

	// Standard Ales (페일/앰버/블론드 등)
	STANDARD_ALE: {
		fermentationTemp: 19,
		fermentationDays: 10,
		agingTemp: 4,
		agingDays: 7,
	},

	// Malty/Darker Ales (브라운/레드/ESB 등) — 약간 더 숙성
	MALTY_ALE: {
		fermentationTemp: 19,
		fermentationDays: 10,
		agingTemp: 4,
		agingDays: 14,
	},

	// Roasty Ales (포터/스타우트) — 로스티/알코올 거친맛 정리 위해 더 숙성
	ROASTY_ALE: {
		fermentationTemp: 19,
		fermentationDays: 14,
		agingTemp: 4,
		agingDays: 21,
	},

	// Strong Ales (발리와인/임페리얼 계열)
	STRONG_ALE: {
		fermentationTemp: 20,
		fermentationDays: 21,
		agingTemp: 12,
		agingDays: 180,
	},

	// Belgian Abbey (두벨/트리펠/쿼드 등)
	BELGIAN: {
		fermentationTemp: 22,
		fermentationDays: 14,
		agingTemp: 12,
		agingDays: 21,
	},
	BELGIAN_STRONG: {
		fermentationTemp: 22,
		fermentationDays: 21,
		agingTemp: 12,
		agingDays: 90,
	},

	// Saison/Farmhouse
	SAISON: {
		fermentationTemp: 27,
		fermentationDays: 10,
		agingTemp: 12,
		agingDays: 14,
	},

	// Wheat (헤페/바이젠 계열)
	WHEAT: {
		fermentationTemp: 19,
		fermentationDays: 10,
		agingTemp: 4,
		agingDays: 5,
	},
	WEIZENBOCK: {
		fermentationTemp: 19,
		fermentationDays: 14,
		agingTemp: 12,
		agingDays: 30,
	},

	// Lager 기본 (라거/헬레스/필스/비엔나 등)
	LAGER: {
		fermentationTemp: 12,
		fermentationDays: 14,
		agingTemp: 1,
		agingDays: 35,
	},

	// Lager 숙성 더 길게 (메르첸/둔켈/슈바르츠 등)
	LAGER_LONG: {
		fermentationTemp: 12,
		fermentationDays: 14,
		agingTemp: 1,
		agingDays: 42,
	},

	// Strong Lager (복/도펠복/마이복/아이스복)
	LAGER_STRONG: {
		fermentationTemp: 12,
		fermentationDays: 21,
		agingTemp: 1,
		agingDays: 56,
	},
	LAGER_VERY_STRONG: {
		fermentationTemp: 12,
		fermentationDays: 21,
		agingTemp: 1,
		agingDays: 90,
	},

	// Kölsch/Alt/Steam Beer (하이브리드) — 비교적 저온 발효 + 짧은 저온 숙성
	KOLSCH: {
		fermentationTemp: 15,
		fermentationDays: 14,
		agingTemp: 2,
		agingDays: 14,
	},
	ALT: {
		fermentationTemp: 16,
		fermentationDays: 10,
		agingTemp: 2,
		agingDays: 21,
	},
	CALIFORNIA_COMMON: {
		fermentationTemp: 15,
		fermentationDays: 10,
		agingTemp: 4,
		agingDays: 14,
	},

	// Sour (케틀 사워/클린 사워) — 비교적 빠른 턴어라운드
	SOUR_FAST: {
		fermentationTemp: 20,
		fermentationDays: 10,
		agingTemp: 4,
		agingDays: 14,
	},

	// Mixed-fermentation Sour (플랑드르/오드브라운/와일드 등)
	SOUR_MIXED: {
		fermentationTemp: 20,
		fermentationDays: 14,
		agingTemp: 15,
		agingDays: 180,
	},

	// Lambic 계열 (장기 숙성)
	LAMBIC: {
		fermentationTemp: 20,
		fermentationDays: 30,
		agingTemp: 15,
		agingDays: 365,
	},
	GUEUZE: {
		fermentationTemp: 20,
		fermentationDays: 30,
		agingTemp: 15,
		agingDays: 730,
	},
};

export const BEER_TYPES: BeerType[] = [
	// -------------------------
	// IPA & Hoppy
	// -------------------------
	{ value: 'IPA', color: '#F59E0B', ...PROFILES.HOPPY_ALE },
	{ value: '웨스트 코스트 IPA', color: '#F97316', ...PROFILES.HOPPY_ALE },
	{
		value: '뉴 잉글랜드 IPA',
		color: '#FDE047',
		fermentationTemp: 20,
		fermentationDays: 7,
		agingTemp: 4,
		agingDays: 3,
	},
	{
		value: '더블 IPA',
		color: '#EA580C',
		fermentationTemp: 20,
		fermentationDays: 10,
		agingTemp: 4,
		agingDays: 14,
	},
	{ value: '브뤼트 IPA', color: '#FBBF24', ...PROFILES.HOPPY_ALE },
	{ value: '세션 IPA', color: '#FBBF24', ...PROFILES.HOPPY_ALE },
	{ value: '블랙 IPA', color: '#18181B', ...PROFILES.HOPPY_ALE },
	{ value: '라이 IPA', color: '#D97706', ...PROFILES.HOPPY_ALE },
	{
		value: '벨지안 IPA',
		color: '#F59E0B',
		fermentationTemp: 22,
		fermentationDays: 10,
		agingTemp: 12,
		agingDays: 14,
	},
	{
		value: '인디아 페일 라거(IPL)',
		color: '#FDE047',
		fermentationTemp: 12,
		fermentationDays: 14,
		agingTemp: 1,
		agingDays: 42,
	},

	// -------------------------
	// Pale / Amber / Malt-forward ales
	// -------------------------
	{ value: '페일에일', color: '#F97316', ...PROFILES.STANDARD_ALE },
	{ value: '블론드 에일', color: '#FEF9C3', ...PROFILES.STANDARD_ALE },
	{
		value: '크림 에일',
		color: '#FEF08A',
		fermentationTemp: 18,
		fermentationDays: 10,
		agingTemp: 2,
		agingDays: 14,
	},
	{ value: '앰버에일', color: '#D97706', ...PROFILES.MALTY_ALE },
	{ value: '레드에일', color: '#DC2626', ...PROFILES.MALTY_ALE },
	{ value: '브라운에일', color: '#92400E', ...PROFILES.MALTY_ALE },
	{
		value: '스카치 에일(위 헤비)',
		color: '#7C2D12',
		fermentationTemp: 18,
		fermentationDays: 14,
		agingTemp: 12,
		agingDays: 60,
	},
	{
		value: '비터',
		color: '#F59E0B',
		fermentationTemp: 19,
		fermentationDays: 7,
		agingTemp: 4,
		agingDays: 7,
	},
	{ value: 'ESB', color: '#D97706', ...PROFILES.MALTY_ALE },
	{
		value: '마일드',
		color: '#B45309',
		fermentationTemp: 19,
		fermentationDays: 7,
		agingTemp: 4,
		agingDays: 7,
	},

	// -------------------------
	// Porter / Stout
	// -------------------------
	{ value: '포터', color: '#374151', ...PROFILES.ROASTY_ALE },
	{
		value: '발틱 포터',
		color: '#111827',
		fermentationTemp: 12,
		fermentationDays: 21,
		agingTemp: 1,
		agingDays: 70,
	},
	{ value: '스타우트', color: '#1F2937', ...PROFILES.ROASTY_ALE },
	{
		value: '드라이 스타우트',
		color: '#0F172A',
		fermentationTemp: 19,
		fermentationDays: 10,
		agingTemp: 4,
		agingDays: 14,
	},
	{
		value: '밀크 스타우트',
		color: '#111827',
		fermentationTemp: 19,
		fermentationDays: 10,
		agingTemp: 4,
		agingDays: 21,
	},
	{
		value: '오트밀 스타우트',
		color: '#0F172A',
		fermentationTemp: 19,
		fermentationDays: 10,
		agingTemp: 4,
		agingDays: 21,
	},
	{
		value: '포린 엑스트라 스타우트',
		color: '#0B1220',
		fermentationTemp: 20,
		fermentationDays: 14,
		agingTemp: 12,
		agingDays: 60,
	},
	{ value: '임페리얼 스타우트', color: '#0F172A', ...PROFILES.STRONG_ALE },

	// -------------------------
	// Lagers
	// -------------------------
	{ value: '라거', color: '#FDE047', ...PROFILES.LAGER },
	{ value: '라이트 라거', color: '#FEF9C3', ...PROFILES.LAGER },
	{
		value: '필스너',
		color: '#FEF08A',
		fermentationTemp: 12,
		fermentationDays: 14,
		agingTemp: 1,
		agingDays: 42,
	},
	{ value: '헬레스', color: '#FDE68A', ...PROFILES.LAGER },
	{ value: '도르트문더 엑스포트', color: '#FBBF24', ...PROFILES.LAGER_LONG },
	{ value: '비엔나 라거', color: '#F59E0B', ...PROFILES.LAGER_LONG },
	{ value: '메르첸', color: '#EA580C', ...PROFILES.LAGER_LONG },
	{ value: '뮌헨 둔켈', color: '#92400E', ...PROFILES.LAGER_LONG },
	{ value: '슈바르츠비어', color: '#111827', ...PROFILES.LAGER_LONG },
	{
		value: '켈러비어/츠비켈',
		color: '#FBBF24',
		fermentationTemp: 12,
		fermentationDays: 14,
		agingTemp: 4,
		agingDays: 14,
	},
	{ value: '라우흐비어', color: '#7C2D12', ...PROFILES.LAGER_LONG },
	{ value: '복', color: '#92400E', ...PROFILES.LAGER_STRONG },
	{ value: '마이복(헬레스 복)', color: '#D97706', ...PROFILES.LAGER_STRONG },
	{
		value: '도펠복',
		color: '#7C2D12',
		fermentationTemp: 12,
		fermentationDays: 21,
		agingTemp: 1,
		agingDays: 70,
	},
	{ value: '아이스복', color: '#451A03', ...PROFILES.LAGER_VERY_STRONG },

	// -------------------------
	// Hybrid / Cool-fermented ales
	// -------------------------
	{ value: '쾰시', color: '#FEF9C3', ...PROFILES.KOLSCH },
	{ value: '알트비어', color: '#B45309', ...PROFILES.ALT },
	{
		value: '캘리포니아 커먼(스팀 비어)',
		color: '#F59E0B',
		...PROFILES.CALIFORNIA_COMMON,
	},

	// -------------------------
	// Wheat
	// -------------------------
	{ value: '헤페바이젠', color: '#FDE68A', ...PROFILES.WHEAT },
	{ value: '덩켈바이젠', color: '#B45309', ...PROFILES.WHEAT },
	{ value: '바이젠복', color: '#D97706', ...PROFILES.WEIZENBOCK },
	{
		value: '비트비어',
		color: '#FEF3C7',
		fermentationTemp: 20,
		fermentationDays: 10,
		agingTemp: 4,
		agingDays: 7,
	},
	{ value: '아메리칸 위트', color: '#FEF08A', ...PROFILES.WHEAT },

	// -------------------------
	// Belgian / Farmhouse
	// -------------------------
	{ value: '세종', color: '#FBBF24', ...PROFILES.SAISON },
	{
		value: '그리젯',
		color: '#FDE047',
		fermentationTemp: 24,
		fermentationDays: 10,
		agingTemp: 4,
		agingDays: 7,
	},
	{
		value: '비에르 드 가르드',
		color: '#D97706',
		fermentationTemp: 15,
		fermentationDays: 14,
		agingTemp: 1,
		agingDays: 60,
	},
	{ value: '벨지안 에일', color: '#D97706', ...PROFILES.BELGIAN },
	{ value: '벨지안 블론드', color: '#FDE68A', ...PROFILES.BELGIAN },
	{
		value: '벨지안 골든 스트롱',
		color: '#F59E0B',
		fermentationTemp: 22,
		fermentationDays: 14,
		agingTemp: 12,
		agingDays: 45,
	},
	{
		value: '두벨',
		color: '#78350F',
		fermentationTemp: 22,
		fermentationDays: 14,
		agingTemp: 12,
		agingDays: 30,
	},
	{
		value: '트리펠',
		color: '#F59E0B',
		fermentationTemp: 22,
		fermentationDays: 14,
		agingTemp: 12,
		agingDays: 45,
	},
	{ value: '벨지안 다크 스트롱', color: '#451A03', ...PROFILES.BELGIAN_STRONG },
	{ value: '쿼드루펠', color: '#451A03', ...PROFILES.BELGIAN_STRONG },

	// -------------------------
	// Sours / Wild
	// -------------------------
	{ value: '사워', color: '#EC4899', ...PROFILES.SOUR_FAST },
	{ value: '프루트 사워', color: '#F472B6', ...PROFILES.SOUR_FAST },
	{ value: '고제', color: '#F472B6', ...PROFILES.SOUR_FAST },
	{
		value: '베를리너 바이세',
		color: '#FEF9C3',
		fermentationTemp: 20,
		fermentationDays: 10,
		agingTemp: 4,
		agingDays: 14,
	},
	{ value: '플랑드르 레드 에일', color: '#B91C1C', ...PROFILES.SOUR_MIXED },
	{
		value: '오드 브라운',
		color: '#7C2D12',
		fermentationTemp: 20,
		fermentationDays: 14,
		agingTemp: 15,
		agingDays: 120,
	},
	{ value: '람빅', color: '#FBBF24', ...PROFILES.LAMBIC },
	{ value: '괴즈', color: '#F59E0B', ...PROFILES.GUEUZE },
	{
		value: '크릭',
		color: '#DC2626',
		fermentationTemp: 20,
		fermentationDays: 30,
		agingTemp: 15,
		agingDays: 365,
	},
	{ value: '아메리칸 와일드 에일', color: '#A855F7', ...PROFILES.SOUR_MIXED },

	// -------------------------
	// Strong
	// -------------------------
	{ value: '발리와인', color: '#B91C1C', ...PROFILES.STRONG_ALE },
];

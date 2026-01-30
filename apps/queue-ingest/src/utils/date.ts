import dayjs from 'dayjs';

export function getDateKey(timestamp?: number): string {
	const date = timestamp ? dayjs.unix(timestamp) : dayjs();
	return date.format('YYYYMMDD');
}

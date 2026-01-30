export interface StatusPayload {
	qos: 1;
	/** 온도 (°C) */
	temp: number;
	/** 습도 (%) */
	humidity: number;
	/** 펠티어 사용 여부 */
	peltier_enabled: boolean;
	/** 펠티어 활성화 정도 (%) */
	power: number;
	/** 목표 온도 (°C) */
	target: number;
	/** 타임스탬프 (ms) */
	ts: number;
}

export interface ConnectPayload {
	qos: 1;
	/** 타임스탬프 (ms) */
	ts: number;
}

export type Command = 'set_target' | 'set_peltier' | 'restart';

export interface AckPayload {
	qos: 2;
	/** 명령 ID */
	id: string;
	/** 명령 */
	cmd: Command;
	/** 명령 값 */
	value: number | boolean | null;
	/** 성공 여부 */
	success: boolean;
	/** 에러 메시지 */
	error: string | null;
	/** 타임스탬프 (ms) */
	ts: number;
}

export interface CommandPayload {
	qos: 2;
	/** 명령 ID */
	id: string;
	/** 명령 값 */
	value: number | null;
	/** 명령 */
	cmd: Command;
	/** 타임스탬프 (ms) */
	ts: number;
}

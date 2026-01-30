# Queue Ingest Service

MQTT 메시지를 수신하여 데이터베이스에 저장하는 서비스입니다.

## 기능

- MQTT 브로커에서 온도 및 히터 상태 메시지 수신
- 수신된 데이터를 PostgreSQL 데이터베이스에 저장
- 자동 재연결 및 에러 핸들링

## 환경 변수

`.env.example`을 참고하여 `.env` 파일 생성:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/craft_brew
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_TOPIC=brew/temperature
```

## 실행

```bash
# 개발 모드 (핫 리로드)
bun run dev

# 프로덕션
bun run start
```

## MQTT 메시지 포맷

```json
{
  "brewId": 1,
  "temperature": 65.5,
  "heaterStatus": "on",
  "timestamp": "2024-01-29T12:00:00Z"
}
```

## 의존성

- `@craft-brew/database`: 공유 데이터베이스 스키마
- `mqtt`: MQTT 클라이언트 라이브러리

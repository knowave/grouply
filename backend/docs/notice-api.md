# 공지 API 명세

프론트엔드가 공지 기능을 구현할 때 기준으로 삼는 API 명세입니다. 모든 내용은 서버 코드(라우터, 컨트롤러, 서비스, DTO, 엔티티, 템플릿)에서 확인한 값입니다.

- Base URL: `/api/v1`
- Content-Type: `application/json`
- 발송 채널은 서버 설정으로 고정되어 있으며 요청에 포함하지 않습니다.

---

## 1. 전체 흐름

1. `GET /notice-templates`로 템플릿 목록을 가져와 사용자에게 선택하게 합니다.
2. `GET /notice-templates/{code}`로 선택한 템플릿의 입력 필드를 가져옵니다.
3. 필드 정의(`name`, `label`, `type`, `required`)로 동적 폼을 그립니다.
4. `POST /notices/preview`로 입력값을 검증하고 Slack 메시지 미리보기를 받습니다.
5. `POST /notices`로 저장합니다. 저장된 공지는 `PENDING` 상태입니다.
6. 이후 둘 중 하나를 선택합니다.
   - 즉시 발송: `POST /notices/{id}/send`
   - 예약 발송: `scheduledAt`에 지정한 시각이 지나면 서버 스케줄러가 발송합니다.

---

## 2. 상태 전이

| 상태 | 의미 | 수정 (`PATCH /notices/{id}`) | 취소 (`POST .../cancel`) | 발송 (`POST .../send`) |
|------|------|------|------|------|
| `PENDING` | 대기 중 (저장 직후, 예약 대기) | 가능 | 가능 → `CANCELED` | 가능 → `PROCESSING` |
| `PROCESSING` | 발송 중 (내부 전이 상태) | 불가 (409) | 불가 (409) | 불가 (409) |
| `SENT` | 발송 완료 | 불가 (409) | 불가 (409) | 불가 (409) |
| `FAILED` | Slack 발송 실패 | 불가 (409) | 불가 (409) | 가능 (재발송) → `PENDING` 복귀 후 발송 |
| `CANCELED` | 취소됨 | 불가 (409) | 불가 (409) | 불가 (409) |

전이 요약:

```
PENDING --send--> PROCESSING --성공--> SENT
   |                   |
   |                   +--실패--> FAILED --send(재발송)--> PENDING --> PROCESSING ...
   +--cancel--> CANCELED
```

- `FAILED` 공지는 수정과 취소가 불가능하고 재발송만 가능합니다.
- 예약 스케줄러는 `PENDING` 중 `scheduledAt <= 현재 시각`인 공지만 발송합니다.
- 즉시 발송(`send`)은 `scheduledAt`과 무관하게 `PENDING`이면 바로 발송합니다. `scheduledAt`이 미래여도 즉시 발송됩니다.

---

## 3. 공통 사항

### 3.1 에러 응답

| HTTP | 발생 조건 | 본문 |
|------|------|------|
| 400 | 검증 실패 (템플릿 필드 오류, `scheduledAt` 오류) | `{"error": "<메시지>", "messages": ["<필드>: <사유>", ...]}` |
| 400 | JSON 바인딩 실패 (예: `templateCode` 누락, `data` 값이 문자열이 아님) | `{"error": "<서버 바인딩 메시지>"}` (`messages` 없음) |
| 400 | 잘못된 ID / 잘못된 쿼리 | `{"error": "잘못된 ID"}`, `{"error": "잘못된 page 값"}`, `{"error": "잘못된 size 값"}` |
| 404 | 공지 없음 | `{"error": "공지를 찾을 수 없습니다"}` |
| 404 | 템플릿 코드 없음 (템플릿 조회) | `{"error": "존재하지 않는 템플릿입니다"}` |
| 409 | 현재 상태에서 허용되지 않는 작업 | `{"error": "대기 중(PENDING)인 공지만 처리할 수 있습니다"}` |
| 502 | Slack 발송 실패 (발송 API 전용) | `{"error": "Slack 발송 실패", "notice": <NoticeResponse, status=FAILED>}` |
| 500 | 그 외 서버 오류 | `{"error": "처리 실패"}` |

`messages`는 `"필드명: 사유"` 형식의 문자열 배열입니다. `error`는 같은 내용을 `"; "`로 이어 붙인 문자열입니다. 폼 필드별 오류 표시에는 `messages`를 사용합니다.

### 3.2 공지 응답 객체 (`NoticeResponse`)

모든 공지 응답은 아래 형태입니다. 키는 camelCase입니다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | number | 공지 ID |
| `templateCode` | string | 템플릿 코드 |
| `data` | object<string, string> | 입력 필드 값 |
| `message` | string | 렌더링된 Slack 메시지 (mrkdwn) |
| `scheduledAt` | string (RFC3339) | 예약 시각 (응답은 RFC3339, 요청은 `YYYY-MM-DD HH:mm`) |
| `status` | string | `PENDING` / `PROCESSING` / `SENT` / `FAILED` / `CANCELED` |
| `sentAt` | string \| null | 발송 완료 시각. 발송 전이면 `null` |
| `errorMessage` | string (선택) | 실패 사유. 값이 없으면 키 자체가 없습니다 |
| `createdAt` | string (RFC3339) | 생성 시각 |
| `updatedAt` | string (RFC3339) | 수정 시각 |

---

## 4. 엔드포인트

### 4.1 템플릿 목록 조회

`GET /api/v1/notice-templates`

**Response 200**

```json
{
  "templates": [
    { "code": "TOWN_HALL", "name": "타운홀 공지" },
    { "code": "COMPANY_EVENT", "name": "사내 행사" },
    { "code": "TRAINING", "name": "교육 안내" },
    { "code": "GENERAL", "name": "일반 공지" }
  ]
}
```

### 4.2 템플릿 상세 조회

`GET /api/v1/notice-templates/{code}`

| 경로 파라미터 | 타입 | 설명 |
|------|------|------|
| `code` | string | `TOWN_HALL` / `COMPANY_EVENT` / `TRAINING` / `GENERAL` |

**Response 200**

```json
{
  "code": "GENERAL",
  "name": "일반 공지",
  "fields": [
    { "name": "title", "label": "공지 제목", "type": "text", "required": true },
    { "name": "description", "label": "공지 내용", "type": "markdown", "required": true }
  ]
}
```

**Errors:** 404 (`존재하지 않는 템플릿입니다`)

### 4.3 미리보기

`POST /api/v1/notices/preview`

저장하지 않고 렌더링 결과만 반환합니다. `scheduledAt`은 무시됩니다.

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `templateCode` | string | 필수 | 템플릿 코드 |
| `data` | object<string, string> | 선택 | 필드 이름 → 값. 템플릿에 없는 키는 렌더링에 쓰이지 않습니다 |
| `scheduledAt` | string | 무시됨 | 미리보기에서는 사용하지 않습니다 |

```json
{
  "templateCode": "GENERAL",
  "data": { "title": "점검 안내", "description": "내일 오전 점검이 있습니다." }
}
```

**Response 200**

```json
{
  "message": "📢 [점검 안내]\n\n안녕하세요!\n\n내일 오전 점검이 있습니다.\n\n감사합니다!"
}
```

**Errors:** 400 (검증 실패 또는 바인딩 실패), 400 (`존재하지 않는 템플릿입니다`는 `messages`에도 같은 문자열이 들어갑니다)

### 4.4 공지 생성

`POST /api/v1/notices`

저장 시 `status`는 `PENDING`으로 시작합니다. `scheduledAt`은 필수입니다.

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `templateCode` | string | 필수 | 템플릿 코드 |
| `scheduledAt` | string | 필수 | 예약 시각, 한국 시간 `YYYY-MM-DD HH:mm` (예: `2026-10-20 13:50`) |
| `data` | object<string, string> | 선택 | 템플릿 필드 값 |

```json
{
  "templateCode": "TOWN_HALL",
  "scheduledAt": "2026-10-20 13:50",
  "data": {
    "title": "10월 타운홀",
    "eventDate": "2026-10-20",
    "startTime": "14:00",
    "location": "3층 대회의실",
    "locationUrl": "https://example.com/map",
    "description": "간식 제공"
  }
}
```

**Response 201**

```json
{
  "id": 1,
  "templateCode": "TOWN_HALL",
  "data": {
    "title": "10월 타운홀",
    "eventDate": "2026-10-20",
    "startTime": "14:00",
    "location": "3층 대회의실",
    "locationUrl": "https://example.com/map",
    "description": "간식 제공"
  },
  "message": "📢 [10월 타운홀]\n\n안녕하세요!\n타운홀 미팅 일정을 안내드립니다.\n\n📅 일시: 2026-10-20 14:00\n📍 장소: 3층 대회의실\n\n📝 안내 사항\n간식 제공\n\n많은 관심과 참여 부탁드립니다.\n감사합니다!",
  "scheduledAt": "2026-10-20T13:50:00+09:00",
  "status": "PENDING",
  "sentAt": null,
  "createdAt": "2026-10-16T10:00:00+09:00",
  "updatedAt": "2026-10-16T10:00:00+09:00"
}
```

**Errors:**

- 400 `scheduledAt` 누락: `{"error": "scheduledAt: 필수 항목입니다", "messages": ["scheduledAt: 필수 항목입니다"]}`
- 400 `scheduledAt` 형식 오류: `messages`에 `"scheduledAt: YYYY-MM-DD HH:mm 형식이어야 합니다"`
- 400 템플릿 필드 오류 (예: `eventDate` 형식 오류)
- 400 존재하지 않는 `templateCode`

`scheduledAt`과 템플릿 필드 오류가 함께 있으면 `scheduledAt` 오류만 반환됩니다.

### 4.5 공지 목록 조회

`GET /api/v1/notices?page=1&size=10&status=PENDING`

정렬은 `id` 내림차순(최신순)입니다.

| 쿼리 | 타입 | 기본값 | 설명 |
|------|------|------|------|
| `page` | number | `1` | 1 이상 |
| `size` | number | `10` | 1 이상 |
| `status` | string | (전체) | `PENDING` / `PROCESSING` / `SENT` / `FAILED` / `CANCELED`. 대문자로 보냅니다. 그 외 값은 검증 없이 결과 0건이 됩니다 |

**Response 200**

```json
{
  "items": [
    {
      "id": 1,
      "templateCode": "TOWN_HALL",
      "data": { "eventDate": "2026-10-20", "startTime": "14:00", "location": "3층 대회의실" },
      "message": "📢 [타운홀 미팅 안내]\n\n...",
      "scheduledAt": "2026-10-20T13:50:00+09:00",
      "status": "PENDING",
      "sentAt": null,
      "createdAt": "2026-10-16T10:00:00+09:00",
      "updatedAt": "2026-10-16T10:00:00+09:00"
    }
  ],
  "total": 1,
  "page": 1,
  "size": 10
}
```

`total`은 `status` 필터를 적용한 전체 건수입니다.

**Errors:** 400 (`잘못된 page 값`, `잘못된 size 값`)

### 4.6 공지 상세 조회

`GET /api/v1/notices/{id}`

**Response 200:** `NoticeResponse` (4.4의 응답과 같은 형태)

**Errors:** 400 (`잘못된 ID`), 404 (`공지를 찾을 수 없습니다`)

### 4.7 공지 수정

`PATCH /api/v1/notices/{id}`

`PENDING` 상태에서만 가능합니다. 요청 본문은 생성(4.4)과 같고 전체 값을 보냅니다. 기존 값을 부분적으로 바꾸는 방식이 아닙니다.

**Request Body:** 4.4와 같음 (`templateCode`, `scheduledAt`, `data`)

**Response 200:** 수정된 `NoticeResponse`

**Errors:**

- 400 검증 실패 (4.4와 같음)
- 404 `공지를 찾을 수 없습니다`
- 409 `대기 중(PENDING)인 공지만 처리할 수 있습니다` (PENDING이 아닌 상태)

### 4.8 공지 취소

`POST /api/v1/notices/{id}/cancel`

`PENDING` 상태에서만 가능합니다. 요청 본문은 없습니다.

**Response 200:** 상태가 `CANCELED`로 바뀐 `NoticeResponse`

```json
{
  "id": 1,
  "status": "CANCELED",
  "sentAt": null
}
```

(실제 응답은 `NoticeResponse` 전체 필드를 포함합니다.)

**Errors:** 400 (`잘못된 ID`), 404 (`공지를 찾을 수 없습니다`), 409 (`대기 중(PENDING)인 공지만 처리할 수 있습니다`)

### 4.9 즉시 발송

`POST /api/v1/notices/{id}/send`

요청 본문은 없습니다. `PENDING`이면 바로 Slack으로 발송합니다. `FAILED`이면 재발송합니다. 그 외 상태는 409입니다.

**Response 200:** 발송 완료된 `NoticeResponse` (`status: "SENT"`, `sentAt` 채워짐)

```json
{
  "id": 1,
  "templateCode": "TOWN_HALL",
  "data": { "eventDate": "2026-10-20", "startTime": "14:00", "location": "3층 대회의실" },
  "message": "📢 [타운홀 미팅 안내]\n\n...",
  "scheduledAt": "2026-10-20T13:50:00+09:00",
  "status": "SENT",
  "sentAt": "2026-10-16T10:05:00+09:00",
  "createdAt": "2026-10-16T10:00:00+09:00",
  "updatedAt": "2026-10-16T10:05:00+09:00"
}
```

**Response 502:** Slack 발송 또는 발송 설정 실패. 공지는 `FAILED`로 저장되며 `errorMessage`에 사유가 들어갑니다.

```json
{
  "error": "Slack 발송 실패",
  "notice": {
    "id": 1,
    "status": "FAILED",
    "errorMessage": "<Slack 응답 오류 사유>",
    "sentAt": null
  }
}
```

(실제 응답은 `NoticeResponse` 전체 필드를 포함합니다.)

**Errors:** 400 (`잘못된 ID`), 404 (`공지를 찾을 수 없습니다`), 409 (`대기 중(PENDING)인 공지만 처리할 수 있습니다`, `PROCESSING`/`SENT`/`CANCELED` 상태), 502 (위 본문), 500 (`처리 실패`)

---

## 5. 템플릿

필드 타입은 다음과 같습니다.

| 타입 | 입력 형식 |
|------|------|
| `text` | 문자열 (앞뒤 공백은 제거됨) |
| `markdown` | 여러 줄 문자열 |
| `date` | `YYYY-MM-DD` |
| `time` | `HH:MM` (00~23, 두 자리) |
| `url` | `http://` 또는 `https://`로 시작, 공백·`|`·`<`·`>` 불가 |

`required`가 `true`인 필드는 비어 있으면 안 됩니다. 값이 있으면 타입 형식을 검사합니다. 빈 값의 선택 필드는 검사하지 않습니다.

### 5.1 `TOWN_HALL` 타운홀 공지

| name | label | type | required |
|------|------|------|------|
| `title` | 제목 | text | false |
| `eventDate` | 진행 날짜 | date | true |
| `startTime` | 시작 시간 | time | true |
| `location` | 진행 장소 | text | true |
| `locationUrl` | 장소 링크 | url | false |
| `description` | 추가 안내 사항 | markdown | false |

렌더링 예시 (`title` = `10월 타운홀`, `locationUrl` 있음, `description` = `간식 제공`):

```
📢 [10월 타운홀]

안녕하세요!
타운홀 미팅 일정을 안내드립니다.

📅 일시: 2026-10-20 14:00
📍 장소: 3층 대회의실

📝 안내 사항
간식 제공

많은 관심과 참여 부탁드립니다.
감사합니다!
```

`title`을 비우면 제목은 `타운홀 미팅 안내`가 됩니다.

### 5.2 `COMPANY_EVENT` 사내 행사

| name | label | type | required |
|------|------|------|------|
| `eventName` | 행사명 | text | true |
| `eventDate` | 행사 날짜 | date | true |
| `startTime` | 시작 시간 | time | true |
| `location` | 행사 장소 | text | true |
| `locationUrl` | 장소 링크 | url | false |
| `description` | 행사 관련 안내 | markdown | false |

렌더링 예시 (`eventName` = `신년회`, `eventDate` = `2026-10-20`, `startTime` = `18:00`, `location` = `본사 1층 라운지`, `locationUrl` = `https://example.com/event`, `description` = `드레스코드 자유`):

```
🎉 [신년회 안내]

안녕하세요!
신년회 일정을 안내드립니다.

📅 일시: 2026-10-20 18:00
📍 장소: 본사 1층 라운지

📝 안내 사항
드레스코드 자유

많은 참여 부탁드립니다.
감사합니다!
```

### 5.3 `TRAINING` 교육 안내

| name | label | type | required |
|------|------|------|------|
| `trainingName` | 교육명 | text | true |
| `eventDate` | 교육 날짜 | date | true |
| `startTime` | 교육 시작 시간 | time | true |
| `location` | 교육 장소 또는 온라인 | text | true |
| `locationUrl` | 교육 장소 또는 참여 링크 | url | false |
| `description` | 교육 관련 안내 | markdown | false |

렌더링 예시 (`trainingName` = `Go 기초`, `eventDate` = `2026-11-01`, `startTime` = `09:30`, `location` = `온라인`, `locationUrl` = `http://x.io`, `description` 없음):

```
📚 [Go 기초 안내]

안녕하세요!
사내 교육 일정을 안내드립니다.

📅 일시: 2026-11-01 09:30
📍 장소: 온라인

참석 대상자분들께서는 일정 확인 부탁드립니다.
감사합니다!
```

`description`이 있으면 `📝 교육 안내` 블록이 추가됩니다.

### 5.4 `GENERAL` 일반 공지

| name | label | type | required |
|------|------|------|------|
| `title` | 공지 제목 | text | true |
| `description` | 공지 내용 | markdown | true |

렌더링 예시 (`title` = `점검`, `description` = `내일 점검`):

```
📢 [점검]

안녕하세요!

내일 점검

감사합니다!
```

---

## 6. 입력 형식 규칙

- `templateCode`는 `TOWN_HALL`, `COMPANY_EVENT`, `TRAINING`, `GENERAL` 중 하나입니다(대소문자 구분).
- `data`는 템플릿별로 정해진 키만 받습니다. 템플릿에 없는 키(오타 포함)를 보내면 400(`data: <코드> 형식에 맞지 않습니다 (json: unknown field "...")`)이 반환됩니다. 값은 모두 문자열입니다.
- 템플릿별 키 정의는 `GET /notice-templates/:code`의 `fields`와 같습니다(백엔드 `template.TownHallData` 등 구조체 태그가 원본).

| 항목 | 형식 | 예시 | 잘못된 예 |
|------|------|------|------|
| `date` (`eventDate` 등) | `YYYY-MM-DD`, 실제로 존재하는 날짜 | `2026-10-20` | `2026-13-40`, `2026-1-5` |
| `time` (`startTime`) | `HH:MM`, 두 자리, 00~23 | `09:30`, `14:00` | `9:00`, `25:00` |
| `url` (`locationUrl`) | `http://` 또는 `https://` 시작 | `https://example.com/map` | `example.com`, `javascript:alert(1)` |
| `scheduledAt` (요청) | `YYYY-MM-DD HH:mm`, 한국 시간, 초 없음 | `2026-10-20 13:50` | `2026-10-20T13:50:00+09:00`, `2026-10-20 13:50:00`, `2026-10-20 9:05` |

- `&`, `<`, `>` 이스케이프(`&amp;`, `&lt;`, `&gt;`)는 Slack 발송본에만 적용됩니다. 응답의 `message`는 원문 그대로입니다.
- 값은 앞뒤 공백을 제거한 뒤 검증합니다.

---

## 7. 참고 사항

- `description`(`type: markdown`)은 Markdown으로 받습니다. `message`/미리보기에는 Markdown 원문 그대로 들어가므로 FE에서 Markdown으로 렌더링하세요. Slack 발송본에서는 서버가 Slack 문법으로 변환합니다: `**굵게**`/`__굵게__`/`# 제목` → 굵게, `*기울임*` → 기울임, `~~취소~~` → 취소선, `[텍스트](https://…)` → 링크, `- 항목` → `• 항목`, `> 인용`·코드는 유지. 표·이미지·중첩 강조는 지원하지 않습니다.
- Slack 발송본에서는 `일시:`, `장소:`, `안내 사항` 같은 소제목도 굵게 표시됩니다.
- 발송 채널은 서버 설정으로 고정되어 있습니다. 요청에 채널 값을 보내지 않습니다.
- 예약 발송: 서버가 **평일(월~금) 08:00~19:00(한국 시간)** 동안 1분마다 `PENDING`이면서 `scheduledAt`이 지난 공지를 자동 발송합니다. 이 시간대 안의 예약은 최대 1분 안에 발송되고, 시간대 밖(평일 19:01 이후, 08:00 이전, 주말)으로 잡힌 예약은 다음 평일 08:00에 발송됩니다.
- 즉시 발송(`POST .../send`)은 `scheduledAt`과 무관하게 동작합니다.
- `message`는 사람이 읽는 원문 그대로입니다(`&`, `<`, `>` 이스케이프 없음). 미리보기에 그대로 표시하면 되며, Slack 발송본은 생성/수정 시 서버가 따로 만들어 둡니다: 첫 줄(제목) 굵게, `&<>` 이스케이프, `locationUrl`이 있으면 `📍 장소` 값에 링크(`<url|장소>`)를 겁니다. 별도의 `🔗` 줄은 없습니다. 미리보기에서 Slack과 같게 보이려면 첫 줄을 굵게, 장소에 `data.locationUrl` 링크를 걸어 표시하세요.
- 발송 중 서버가 종료되면 공지가 `PROCESSING` 상태로 남을 수 있습니다. 이 상태는 자동으로 복구되지 않습니다. 현재 코드에 복구 로직이 없습니다.
- `data`는 객체 전체가 저장되므로 템플릿에 없는 키를 보내도 저장은 됩니다. 단, 렌더링에는 쓰이지 않습니다.
- 응답 시각(`scheduledAt`, `sentAt`, `createdAt`, `updatedAt`)의 UTC 오프셋 표기는 DB 연결 설정에 따라 달라질 수 있습니다. 프론트엔드는 오프셋을 가정하지 말고 Date 객체로 파싱해서 표시합니다.

---

## 8. 검증 상태

- 템플릿 렌더링 단위 테스트 통과.
- 실제 서버(로컬 DB)에서 확인: 템플릿 목록/상세/404, 미리보기(전체 필드, 필수 필드만, 형식 오류 400, 알 수 없는 코드 400), 생성 201, `scheduledAt` 누락/형식 오류 400, 상세, 목록(`status` 필터), 수정, 취소, 취소된 공지의 재취소/수정/발송 409, 없는 ID 404, 잘못된 ID 400.
- **즉시 발송(`/send`) 성공 경로와 예약 스케줄러 발송은 실행하지 않았습니다.** 실제 Slack 발송은 백엔드 담당자가 직접 검증합니다.

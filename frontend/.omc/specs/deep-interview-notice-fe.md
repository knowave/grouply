# Deep Interview Spec: Slack 공지 발송 프론트엔드

## Metadata
- Interview ID: notice-fe-20261016
- Rounds: 4 (+Round 0)
- Final Ambiguity Score: 13%
- Type: brownfield
- Generated: 2026-10-16
- Threshold: 0.2
- Threshold Source: default
- Initial Context Summarized: yes (backend-ca 작업 지시 → 요약)
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.92 | 0.35 | 0.322 |
| Constraint Clarity | 0.85 | 0.25 | 0.213 |
| Success Criteria | 0.80 | 0.25 | 0.200 |
| Context Clarity | 0.90 | 0.15 | 0.135 |
| **Total Clarity** | | | **0.87** |
| **Ambiguity** | | | **0.13** |

## Topology
| Component | Status | Description | Coverage |
|-----------|--------|-------------|----------|
| 작성 화면 | active | 템플릿 선택 → 동적 폼 → 예약 일시 → 미리보기 → 저장 | AC 1–6 |
| 목록/상세 | active | 페이지네이션, 상태 필터, 상태 배지, 상세 | AC 7–8 |
| 수정/취소/즉시 발송 | active | 상태별 버튼 노출, 409/502 처리 | AC 9–11 |
| 공통 에러 처리 | active | 400 messages[] 필드별 표시 | AC 12 |

## Goal
`backend/docs/notice-api.md`의 공지 API로 공지를 작성(템플릿 기반 동적 폼 + 예약 일시 + 미리보기), 저장, 조회, 수정, 취소, 즉시 발송할 수 있는 화면 3개(`/notices`, `/notices/new`, `/notices/:id`)를 기존 FE 패턴으로 추가한다.

## Constraints
- 기존 구조를 따른다: `pages/`, `api/noticeApi.ts`(기존 `request<T>` 패턴, same-origin `/api/v1`), `types/notice.ts`, Tailwind, lucide-react, `MESSAGES` 상수 패턴.
- 의존성은 `react-markdown`, `remark-gfm`만 추가. 편집기는 textarea. raw HTML 렌더링 금지(react-markdown 기본값 유지).
- 예약 시각: 입력은 KST `YYYY-MM-DD HH:mm`로 전송(초 없음). 응답 RFC3339는 Date로 파싱해 KST로 변환 후 폼에 채운다(오프셋 가정 금지).
- 예약 시간대: 선택은 자유. 평일 08:00~19:00(KST) 밖이면 실제 발송 시각(다음 평일 08:00, 예 "10/19(월) 08:00")을 계산해 경고로 표시. 저장은 막지 않는다.
- 수정 시 템플릿 변경 불가. PATCH는 전체 값 전송.
- data에는 템플릿 fields에 있는 키만 보낸다(빈 선택 필드는 빈 문자열 또는 생략).
- Claude는 `/send` 호출, 공지 생성/수정/취소 요청, 백엔드 기동을 하지 않는다. 쓰기 동작 검증은 사용자가 한다.

## Non-Goals
- 리치 Markdown 에디터, 공지 삭제, 템플릿 관리, 인증, 자동 재시도, PROCESSING 복구 UI, 공통 레이아웃/네비게이션 리팩터.

## Acceptance Criteria
1. [ ] `/notices/new`에서 `GET /notice-templates` 4종 중 선택 시 `GET /notice-templates/:code` fields로 폼이 생성된다(type별 input: date, time, text, url, markdown→textarea; required 표시).
2. [ ] 예약 일시 입력이 `YYYY-MM-DD HH:mm`로 직렬화된다.
3. [ ] 시간대 밖 예약 시 실제 발송 시각 경고가 뜬다. 계산 함수는 assert 기반 자체 테스트가 있다(평일 낮/평일 19:01/금 20:00/토/일/평일 07:59/19:00 경계).
4. [ ] [미리보기] 버튼 → `POST /notices/preview`의 message 표시: 첫 줄 굵게, `일시:`/`장소:`/`안내 사항` 소제목 굵게, locationUrl이 있으면 장소 값에 링크, description 부분은 Markdown 렌더링.
5. [ ] 저장 → `POST /notices` 성공 시 `/notices/:id`로 이동.
6. [ ] 응답 RFC3339 scheduledAt이 수정 폼에 KST `YYYY-MM-DD`/`HH:mm`로 채워진다.
7. [ ] `/notices`: `GET /notices?page&size&status` 목록, 상태 필터(전체+5종), 페이지네이션, 상태 배지 5색.
8. [ ] `/notices/:id`: `GET /notices/:id` 상세, 예약/발송/생성 시각 KST 표시, FAILED면 errorMessage 표시.
9. [ ] PENDING: 폼 수정 + [수정 저장](PATCH)/[취소](confirm 후 cancel)/[즉시 발송](confirm 후 send). 그 외 상태는 읽기 전용.
10. [ ] FAILED: [재발송](confirm 후 send)만 노출.
11. [ ] 409 → 에러 토스트 + 상세 재조회. 502 → `notice`로 화면 갱신(FAILED + errorMessage) + 에러 표시.
12. [ ] 400 `messages[]`의 `"필드: 사유"`를 해당 필드 아래에 표시. 매칭되지 않는 메시지(바인딩 오류 등)는 폼 상단에 표시.
13. [ ] UsersPage 헤더에 '공지' 링크(기존 Link 패턴).
14. [ ] `yarn build`, `yarn lint` 통과. 백엔드가 떠 있으면 GET 템플릿/목록과 POST preview만 실제 호출로 확인.

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| 시간대 밖 예약은 막아야 한다 | 저장 허용 + 안내 vs 선택 제한 | 허용 + 실제 발송 시각 경고 |
| Markdown 편집기 필요 | 리치 에디터 vs textarea | textarea + react-markdown/remark-gfm |
| Claude가 전체 흐름 E2E 검증 | DB 쓰기/Slack 발송 금지 규칙 | 읽기·preview만, 쓰기는 사용자 |
| 상세와 수정은 별도 화면 | 하나의 폼 공유 가능? | 상세에서 PENDING이면 바로 수정, 템플릿 고정 |
| 미리보기 자동 갱신 | (인터뷰 외 기본값) | 버튼 클릭 시 호출 — 입력 중 400 남발 방지 |

## Technical Context
- React 19, Vite 7, Tailwind 3, react-router-dom 7, lucide-react. Vite proxy `/api` → `:8080`.
- 라우트: `src/App.tsx`. 네비 링크 패턴: `src/pages/UsersPage.tsx:51-71`.
- API 패턴: `src/api/restaurantApi.ts`의 `request<T>`는 `error`만 추출 → 공지 API에서는 status와 body(messages, notice)를 담은 에러를 던지도록 한다.
- 원본 필드 정의: `backend/domains/notice/template/template.go`.

## Ontology (Key Entities)
| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| Template | core | code, name, fields[] | has many Field |
| Field | supporting | name, label, type, required | belongs to Template |
| Notice | core | id, templateCode, data, message, scheduledAt, status, sentAt, errorMessage | uses Template |
| Status | supporting | PENDING/PROCESSING/SENT/FAILED/CANCELED | gates actions |
| ScheduledAt | supporting | KST input, RFC3339 response, effective send time | belongs to Notice |
| Preview | supporting | message | rendered from Template+data |

## Ontology Convergence
| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|----------------|
| 1 | 6 | 6 | - | - | - |
| 2 | 6 | 0 | 0 | 6 | 100% |
| 3 | 6 | 0 | 0 | 6 | 100% |
| 4 | 6 | 0 | 0 | 6 | 100% |

## Interview Transcript
<details>
<summary>Full Q&A (5 rounds)</summary>

- R0 구성 4개(작성/목록·상세/액션/에러) → 맞음
- R1 예약 시간대 → 허용 + 실제 발송 시각 안내 (34%)
- R2 Markdown → textarea + react-markdown/remark-gfm (30%)
- R3 검증 범위 → Claude는 빌드/계산 테스트/읽기·preview 호출, 쓰기는 사용자 (24%)
- R4 화면 구성 → /notices, /notices/new, /notices/:id(PENDING이면 인라인 수정), 템플릿 고정, UsersPage 링크 (13%)
</details>

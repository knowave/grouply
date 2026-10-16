# Deep Interview Spec: Slack 공지 템플릿 발송

## Metadata
- Interview ID: notice-2026-10-16
- Rounds: 6 (+ Round 0)
- Final Ambiguity Score: 13%
- Type: brownfield
- Generated: 2026-10-16
- Threshold: 0.2
- Threshold Source: default
- Initial Context Summarized: yes
- Status: PASSED (pending approval)

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|---|---|---|---|
| Goal Clarity | 0.90 | 0.35 | 0.315 |
| Constraint Clarity | 0.88 | 0.25 | 0.220 |
| Success Criteria | 0.82 | 0.25 | 0.205 |
| Context Clarity | 0.90 | 0.15 | 0.135 |
| **Total Clarity** | | | **0.875** |
| **Ambiguity** | | | **0.125** |

## Topology
| Component | Status | Description | Coverage |
|---|---|---|---|
| 템플릿/렌더링 | active | Go 코드 템플릿 4종, 필드 검증, 빈 선택 항목 줄 제거 | AC 1–3 |
| 공지 API/저장 | active | 템플릿 조회, 공지 CRUD+취소, MySQL(GORM) 저장 | AC 4–8 |
| 발송 | active | 즉시 발송 API + 예약 스케줄러(기본 OFF) | AC 9–11 |
| FE 인계 | active | 검증 완료 후 grouply_fe에 명세서+작업 지시 | AC 12–13 |

## Goal
경영지원 담당자가 템플릿을 고르고 필요한 값만 입력하면, 백엔드가 고정 문구로 Slack 메시지를 렌더링해 저장하고, 즉시 발송 API 또는 scheduledAt 기준 스케줄러로 Slack에 발송한다.

## Constraints
- 스택: Go(Gin) + GORM + MySQL. markdown 원안의 TypeScript/MongoDB 설계는 Go 엔티티/코드로 번역한다.
- 레이어: 기존 `domains/<name>/{entity,repository,service,controller,dto}` 구조로 `domains/notice` 추가. 라우트는 `/api/v1/notices`, `/api/v1/notice-templates`.
- 템플릿 4종(TOWN_HALL, COMPANY_EVENT, TRAINING, GENERAL)의 필드·문구는 markdown 원안 그대로. 문구는 Go 코드 한 곳에서 관리.
- 최종 메시지는 생성/수정 시점에 렌더링해 `message` 컬럼에 저장(이후 템플릿 수정이 기존 예약에 영향 없음).
- Slack 토큰: config 키 `SLACK_NOTI_BOT_TOKEN`. 채널: 기존 config 키 `SLACK_CHANNEL` 공유(생일 알림과 동일). 요청으로 채널을 받지 않는다.
- 발송은 `infrastructure/slack.go` `SendMessage`(chat.postMessage) 재사용 — 공지용 Client는 `SLACK_NOTI_BOT_TOKEN`으로 생성.
- 예약 스케줄러: 1분 주기, `status=PENDING AND scheduled_at <= now`를 원자적으로 PROCESSING 전환 후 발송 → SENT/FAILED. config `NOTICE_SCHEDULER_ENABLED`(기본 false)일 때만 동작.
- 즉시 발송: `POST /api/v1/notices/:id/send` — scheduledAt 무관하게 바로 발송, SENT/CANCELED 공지는 거부.
- 수정/취소는 PENDING 상태에서만 허용.
- **Claude는 실제 Slack 발송(send API 호출, 스케줄러 ON)을 하지 않는다. 발송 테스트는 사용자가 직접 한다.**
- 인증 없음 → `createdBy` 필드는 넣지 않는다.

## Non-Goals
- 커스텀 템플릿(DB 저장 템플릿), 사용자 인증, 발송 실패 자동 재시도, 다중 인스턴스 분산 락(단일 서버 전제, 상태 조건부 UPDATE로 충분), FE 구현(별도 세션).

## Acceptance Criteria
1. [ ] `GET /api/v1/notice-templates` → 4종 code/name 목록.
2. [ ] `GET /api/v1/notice-templates/:code` → 필드(name, label, type, required) 목록. 없는 code는 404.
3. [ ] 렌더링: 선택 항목(endTime, locationUrl, description) 누락 시 해당 줄(및 `~ {{endTime}}` 부분) 제거, TOWN_HALL title 기본값 적용. 렌더링 로직에 테이블 기반 단위 테스트 존재.
4. [ ] `POST /api/v1/notices/preview` → 저장 없이 렌더링된 message 반환.
5. [ ] `POST /api/v1/notices` → 필수 필드 누락/잘못된 templateCode/날짜 형식 오류 시 400, 정상 시 PENDING으로 저장되고 message 포함 응답.
6. [ ] `GET /api/v1/notices`(페이지네이션, status 필터), `GET /api/v1/notices/:id`.
7. [ ] `PATCH /api/v1/notices/:id` → PENDING만 수정 가능, message 재렌더링. 그 외 상태는 409.
8. [ ] `POST /api/v1/notices/:id/cancel` → PENDING만 CANCELED.
9. [ ] `POST /api/v1/notices/:id/send` → 즉시 발송, 성공 시 SENT + sent_at + slack ts 저장, 실패 시 FAILED + 에러 메시지. (사용자가 직접 검증)
10. [ ] 스케줄러는 `NOTICE_SCHEDULER_ENABLED != "true"`면 아무것도 발송하지 않는다.
11. [ ] 같은 공지가 두 번 발송되지 않는다(PENDING→PROCESSING 조건부 UPDATE의 RowsAffected 확인).
12. [ ] `backend/docs/notice-api.md`에 전체 API 명세(요청/응답 예시, 에러 코드, 상태 전이) 작성.
13. [ ] 사용자가 "검증 완료"라고 말한 뒤에만 `grouply_fe` 세션에 명세서 경로와 화면 작업 지시(템플릿 선택 → 동적 폼 → 미리보기 → 저장/즉시 발송 → 목록/수정/취소)를 SendMessage로 전달.

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|---|---|---|
| 테스트용 즉시 발송 스위치가 필요 | 운영에도 즉시 발송이 필수 | 별도 `/send` API로 분리, 스위치 없음 |
| 실제 공지 샘플로 템플릿 재정의 필요 | 확정 지연 | markdown 그대로 확정, 문구는 검증 중 수정 |
| 테스트 중 sj_all_notice로 발송됨 | 전사 채널 오발송 위험 | 사용자가 SLACK_CHANNEL 값을 테스트 채널로 바꾸고 직접 발송 |
| 공지 전용 채널 키 | 생일 알림과 분리 여부 | SLACK_CHANNEL 공유(사용자 결정) |
| 스케줄러 즉시 가동 | "발송은 내가 직접" 제약과 충돌 | 구현하되 config로 기본 OFF |

## Technical Context
- `infrastructure/slack.go`: `NewClient(token)`, `SendMessage(channel, text)` — 응답 ts는 현재 버리므로 ts 저장하려면 반환값 확장 필요.
- `domains/config/service`: `GetValue(key)`, `GetSlackChannel()`, `GetSlackBotToken()`.
- `domains/scheduler`: robfig/cron v3, Asia/Seoul.
- `infrastructure/database.go`: AutoMigrate 목록에 Notice 추가.
- ⚠️ `SLACK_NOTI_BOT_TOKEN`은 로컬 3306 DB configs에만 존재, 192.168.198.194:3309 configs에는 없음.
- `data`는 MySQL JSON 컬럼(gorm `datatypes.JSON` 또는 `[]byte`)으로 저장.

## Ontology (Key Entities)
| Entity | Type | Fields | Relationships |
|---|---|---|---|
| Notice | core domain | id, template_code, data(JSON), message, scheduled_at, status, sent_at, slack_ts, error_message, created_at, updated_at | uses NoticeTemplate |
| NoticeTemplate | supporting (code) | code, name, fields, render | has many TemplateField |
| TemplateField | supporting | name, label, type, required | belongs to NoticeTemplate |
| NoticeStatus | supporting | PENDING, PROCESSING, SENT, FAILED, CANCELED | Notice has one |
| SlackChannel | external | config SLACK_CHANNEL | Notice sent to |
| SlackBotToken | external | config SLACK_NOTI_BOT_TOKEN | Slack client auth |

## Ontology Convergence
| Round | Entity Count | New | Changed | Stable | Stability |
|---|---|---|---|---|---|
| 1 | 5 | 5 | - | - | - |
| 2 | 5 | 0 | 0 | 5 | 100% |
| 3 | 6 | 1 | 0 | 5 | 83% |
| 4–6 | 6 | 0 | 0 | 6 | 100% |

## Interview Transcript
<details><summary>6 rounds</summary>

- R0 구성: 템플릿/API·저장/발송/FE 인계 4개 → 확정
- R1 즉시 발송 방식 → 별도 `POST /notices/:id/send` (40%)
- R2 템플릿 → markdown 그대로 확정 (34%)
- R3 채널 → 토큰은 `SLACK_NOTI_BOT_TOKEN`, 테스트 채널은 사용자가 값 변경, 실제 발송은 사용자만 (27%)
- R4 채널 키 → `SLACK_CHANNEL` 공유 (25%)
- R5 스케줄러 → 구현 + `NOTICE_SCHEDULER_ENABLED` 기본 OFF (20%)
- R6 검증/인계 → Claude 비발송 검증 → docs/notice-api.md → 사용자 send 검증 + "검증 완료" → grouply_fe 지시 (13%)
</details>

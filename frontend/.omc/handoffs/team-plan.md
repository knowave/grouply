## Handoff: team-plan → team-exec

- **Decided**: 4 workers, file-scoped. Shared contracts (types/api/utils/component props) fixed by lead in prompts so all run in parallel. Notice UI strings live as local consts in notice files (only nav label goes into MESSAGES) to avoid edit conflicts on messages.ts.
- **Decided**: Preview = plain `message` (unescaped, verified template.go:157). Description span located via `message.indexOf(data.description.trim())` and rendered with ReactMarkdown; fallback plain text.
- **Rejected**: Lead-written foundation first (serializes work).
- **Risks**: Contract drift between workers → caught by `yarn build` in verify. TZ logic must not depend on machine TZ.
- **Files**: types/notice.ts, api/noticeApi.ts, utils/noticeSchedule.ts(+check), components/notice/*, pages/Notice*.tsx, App.tsx, UsersPage.tsx, constants/messages.ts
- **Remaining**: Doc mismatches to report to backend-ca (§6 escape, §5.3 TRAINING link line).

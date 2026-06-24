# Grouply

조건만 입력하세요. 팀 구성은 Grouply가 합니다.

Grouply는 사람 목록, 팀 목록, 분리 조건, 같은 팀 조건을 받아 조건을 만족하는 균등한 팀 구성을 생성하는 MVP 서비스입니다.

## Stack

- Backend: Go, Gin
- Frontend: React, Vite, TypeScript, Tailwind CSS

## Run

```sh
cd backend
go run .
```

```sh
cd frontend
yarn install
yarn dev
```

Backend runs on `http://localhost:8080`.
Frontend runs on `http://localhost:5173`.

## API

```http
POST /api/v1/groups/generate
```

```json
{
  "people": ["김민수", "이서연", "박지훈", "최유진"],
  "teams": ["A팀", "B팀"],
  "separateRules": [["김민수", "이서연"]],
  "sameTeamRules": [["김민수", "박지훈"]]
}
```

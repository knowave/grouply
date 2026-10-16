package template

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"
)

func TestRender(t *testing.T) {
	townReq := map[string]string{"eventDate": "2026-10-20", "startTime": "14:00", "location": "3층 대회의실"}
	with := func(base map[string]string, kv ...string) map[string]string {
		m := map[string]string{}
		for k, v := range base {
			m[k] = v
		}
		for i := 0; i < len(kv); i += 2 {
			m[kv[i]] = kv[i+1]
		}
		return m
	}

	tests := []struct {
		name string
		code Code
		data map[string]string
		want string // exact output
		has  []string
		not  []string
		verr []string // expected ValidationError substrings
		err  error
	}{
		{
			name: "town hall full",
			code: "TOWN_HALL",
			data: with(townReq, "title", "10월 타운홀", "locationUrl", "https://example.com/map", "description", "간식 제공"),
			want: "📢 [10월 타운홀]\n\n안녕하세요!\n타운홀 미팅 일정을 안내드립니다.\n\n" +
				"📅 일시: 2026-10-20 14:00\n📍 장소: 3층 대회의실\n\n" +
				"📝 안내 사항\n간식 제공\n\n많은 관심과 참여 부탁드립니다.\n감사합니다!",
		},
		{
			name: "town hall required only",
			code: "TOWN_HALL",
			data: townReq,
			want: "📢 [타운홀 미팅 안내]\n\n안녕하세요!\n타운홀 미팅 일정을 안내드립니다.\n\n" +
				"📅 일시: 2026-10-20 14:00\n📍 장소: 3층 대회의실\n\n" +
				"많은 관심과 참여 부탁드립니다.\n감사합니다!",
		},
		{
			name: "general",
			code: "GENERAL",
			data: map[string]string{"title": " 점검 ", "description": "내일 점검"},
			want: "📢 [점검]\n\n안녕하세요!\n\n내일 점검\n\n감사합니다!",
		},
		{
			name: "training link label",
			code: "TRAINING",
			data: map[string]string{"trainingName": "Go", "eventDate": "2026-11-01", "startTime": "09:30", "location": "온라인", "locationUrl": "http://x.io"},
			has:  []string{"📚 [Go 안내]", "📍 장소: 온라인"},
			not:  []string{"📝", "🔗", "http://x.io"},
		},
		{
			name: "render keeps plain text",
			code: "GENERAL",
			data: map[string]string{"title": "<b>&", "description": "a > b"},
			has:  []string{"[<b>&]", "a > b"},
			not:  []string{"&amp;"},
		},
		{name: "missing required", code: "COMPANY_EVENT", data: map[string]string{}, verr: []string{"eventName: 필수 항목입니다", "eventDate: 필수 항목입니다", "startTime: 필수 항목입니다", "location: 필수 항목입니다"}},
		{name: "bad date", code: "TOWN_HALL", data: with(townReq, "eventDate", "2026-13-40"), verr: []string{"eventDate: YYYY-MM-DD"}},
		{name: "bad time", code: "TOWN_HALL", data: with(townReq, "startTime", "9:00"), verr: []string{"startTime: HH:MM"}},
		{name: "bad url", code: "TOWN_HALL", data: with(townReq, "locationUrl", "javascript:alert(1)"), verr: []string{"locationUrl:"}},
		{name: "unknown code", code: "NOPE", err: ErrUnknownTemplate},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			raw, _ := json.Marshal(tt.data)
			got, err := Render(tt.code, raw)
			if tt.err != nil {
				if !errors.Is(err, tt.err) {
					t.Fatalf("err = %v, want %v", err, tt.err)
				}
				return
			}
			if tt.verr != nil {
				var ve *ValidationError
				if !errors.As(err, &ve) {
					t.Fatalf("err = %v, want *ValidationError", err)
				}
				for _, s := range tt.verr {
					if !strings.Contains(ve.Error(), s) {
						t.Errorf("error %q missing %q", ve.Error(), s)
					}
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if tt.want != "" && got != tt.want {
				t.Errorf("got:\n%s\nwant:\n%s", got, tt.want)
			}
			for _, s := range tt.has {
				if !strings.Contains(got, s) {
					t.Errorf("missing %q in:\n%s", s, got)
				}
			}
			for _, s := range tt.not {
				if strings.Contains(got, s) {
					t.Errorf("unexpected %q in:\n%s", s, got)
				}
			}
		})
	}
}

func TestRenderRejectsEndTime(t *testing.T) {
	_, err := Render(TownHall, json.RawMessage(`{"eventDate":"2026-10-30","startTime":"13:30","endTime":"17:00","location":"a"}`))
	if err == nil || !strings.Contains(err.Error(), "endTime") {
		t.Fatalf("err = %v, want unknown field endTime", err)
	}
}

func TestRenderRejectsUnknownKey(t *testing.T) {
	_, err := Render(General, json.RawMessage(`{"title":"a","description":"b","titel":"typo"}`))
	var ve *ValidationError
	if !errors.As(err, &ve) || !strings.Contains(ve.Error(), "titel") {
		t.Fatalf("err = %v, want ValidationError naming titel", err)
	}
}

func TestFieldsFromStructTags(t *testing.T) {
	for _, tpl := range All() {
		for _, f := range tpl.Fields {
			if f.Name == "" || strings.TrimSpace(f.Name) != f.Name {
				t.Fatalf("%s has bad json tag %q", tpl.Code, f.Name)
			}
		}
	}
	tpl, _ := Get(TownHall)
	if len(tpl.Fields) != 6 || tpl.Fields[1] != (Field{"eventDate", "진행 날짜", "date", true}) || tpl.Fields[0].Required {
		t.Fatalf("fields = %+v", tpl.Fields)
	}
}

func TestRenderSlack(t *testing.T) {
	data := json.RawMessage(`{"title":"A&B","eventDate":"2026-10-30","startTime":"13:30","location":"우리<집>","locationUrl":"https://naver.me/x?a=1&b=2","description":"x > y"}`)
	got, err := RenderSlack(TownHall, data)
	if err != nil {
		t.Fatal(err)
	}
	want := "*📢 [A&amp;B]*\n\n안녕하세요!\n타운홀 미팅 일정을 안내드립니다.\n\n" +
		"📅 *일시:* 2026-10-30 13:30\n📍 *장소:* <https://naver.me/x?a=1&amp;b=2|우리&lt;집&gt;>\n\n" +
		"📝 *안내 사항*\nx &gt; y\n\n많은 관심과 참여 부탁드립니다.\n감사합니다!"
	if got != want {
		t.Fatalf("got:\n%s\nwant:\n%s", got, want)
	}

	// no url -> plain location, still bold title
	got, _ = RenderSlack(TownHall, json.RawMessage(`{"eventDate":"2026-10-30","startTime":"13:30","location":"우리집"}`))
	if !strings.Contains(got, "📍 *장소:* 우리집\n") || !strings.HasPrefix(got, "*📢 [타운홀 미팅 안내]*") {
		t.Fatalf("got:\n%s", got)
	}

	// url with | would break <url|text>
	_, err = RenderSlack(TownHall, json.RawMessage(`{"eventDate":"2026-10-30","startTime":"13:30","location":"a","locationUrl":"https://x.io/a|b"}`))
	if err == nil {
		t.Fatal("want error for | in url")
	}
}

func TestMarkdownToSlack(t *testing.T) {
	tests := []struct{ in, want string }{
		{"**굵게** 와 __굵게2__", "*굵게* 와 *굵게2*"},
		{"*기울임* 그리고 ~~취소~~", "_기울임_ 그리고 ~취소~"},
		{"# 제목\n## 소제목 ##", "*제목*\n*소제목*"},
		{"- 하나\n* 둘\n  + 셋", "• 하나\n• 둘\n  • 셋"},
		{"[지도](https://naver.me/x?a=1&amp;b=2) 참고", "<https://naver.me/x?a=1&amp;b=2|지도> 참고"},
		{"&gt; 인용\n본문 a &gt; b", "> 인용\n본문 a &gt; b"},
		{"`**코드**` 그대로\n```\n- 블록 *유지*\n```", "`**코드**` 그대로\n```\n- 블록 *유지*\n```"},
		{"2 * 3 * 4", "2 * 3 * 4"},
		{"[링크](javascript:alert(1))", "[링크](javascript:alert(1))"},
	}
	for _, tt := range tests {
		if got := markdownToSlack(tt.in); got != tt.want {
			t.Errorf("markdownToSlack(%q)\n got: %q\nwant: %q", tt.in, got, tt.want)
		}
	}
}

func TestRenderKeepsMarkdownInPlain(t *testing.T) {
	data := json.RawMessage(`{"title":"t","description":"**중요** [지도](https://x.io)"}`)
	plain, _ := Render(General, data)
	sl, _ := RenderSlack(General, data)
	if !strings.Contains(plain, "**중요** [지도](https://x.io)") || !strings.Contains(sl, "*중요* <https://x.io|지도>") {
		t.Fatalf("plain:\n%s\nslack:\n%s", plain, sl)
	}
}

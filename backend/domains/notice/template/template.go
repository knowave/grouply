package template

import (
	"bytes"
	"encoding/json"
	"errors"
	"reflect"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// Code is the notice template type.
type Code string

const (
	TownHall     Code = "TOWN_HALL"
	CompanyEvent Code = "COMPANY_EVENT"
	Training     Code = "TRAINING"
	General      Code = "GENERAL"
)

// Per-template request `data` shapes. Struct tags are the single source of truth:
// json = field name, label/type = form metadata for the frontend, required = validation.
// type: date(YYYY-MM-DD) | time(HH:MM) | text | url(http/https) | markdown

type TownHallData struct {
	Title       string `json:"title" label:"제목" type:"text"` // 비우면 "타운홀 미팅 안내"
	EventDate   string `json:"eventDate" label:"진행 날짜" type:"date" required:"true"`
	StartTime   string `json:"startTime" label:"시작 시간" type:"time" required:"true"`
	Location    string `json:"location" label:"진행 장소" type:"text" required:"true"`
	LocationURL string `json:"locationUrl" label:"장소 링크" type:"url"`
	Description string `json:"description" label:"추가 안내 사항" type:"markdown"`
}

type CompanyEventData struct {
	EventName   string `json:"eventName" label:"행사명" type:"text" required:"true"`
	EventDate   string `json:"eventDate" label:"행사 날짜" type:"date" required:"true"`
	StartTime   string `json:"startTime" label:"시작 시간" type:"time" required:"true"`
	Location    string `json:"location" label:"행사 장소" type:"text" required:"true"`
	LocationURL string `json:"locationUrl" label:"장소 링크" type:"url"`
	Description string `json:"description" label:"행사 관련 안내" type:"markdown"`
}

type TrainingData struct {
	TrainingName string `json:"trainingName" label:"교육명" type:"text" required:"true"`
	EventDate    string `json:"eventDate" label:"교육 날짜" type:"date" required:"true"`
	StartTime    string `json:"startTime" label:"교육 시작 시간" type:"time" required:"true"`
	Location     string `json:"location" label:"교육 장소 또는 온라인" type:"text" required:"true"`
	LocationURL  string `json:"locationUrl" label:"교육 장소 또는 참여 링크" type:"url"`
	Description  string `json:"description" label:"교육 관련 안내" type:"markdown"`
}

type GeneralData struct {
	Title       string `json:"title" label:"공지 제목" type:"text" required:"true"`
	Description string `json:"description" label:"공지 내용" type:"markdown" required:"true"`
}

type Field struct {
	Name     string `json:"name"`
	Label    string `json:"label"`
	Type     string `json:"type"` // date | time | text | url | markdown
	Required bool   `json:"required"`
}

type Template struct {
	Code   Code    `json:"code"`
	Name   string  `json:"name"`
	Fields []Field `json:"fields"`
}

type ValidationError struct{ Messages []string }

func (e *ValidationError) Error() string { return strings.Join(e.Messages, "; ") }

var ErrUnknownTemplate = errors.New("존재하지 않는 템플릿입니다")

var (
	timeRe     = regexp.MustCompile(`^([01]\d|2[0-3]):[0-5]\d$`)
	blankRunRe = regexp.MustCompile(`\n{3,}`)
	slackEsc   = strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;")
)

var templates = []Template{
	{TownHall, "타운홀 공지", fieldsOf(TownHallData{})},
	{CompanyEvent, "사내 행사", fieldsOf(CompanyEventData{})},
	{Training, "교육 안내", fieldsOf(TrainingData{})},
	{General, "일반 공지", fieldsOf(GeneralData{})},
}

func fieldsOf(v any) []Field {
	t := reflect.TypeOf(v)
	fields := make([]Field, t.NumField())
	for i := range fields {
		f := t.Field(i)
		fields[i] = Field{f.Tag.Get("json"), f.Tag.Get("label"), f.Tag.Get("type"), f.Tag.Get("required") == "true"}
	}
	return fields
}

func All() []Template { return templates }

func (c Code) Valid() bool {
	_, ok := Get(c)
	return ok
}

func Get(code Code) (Template, bool) {
	for _, t := range templates {
		if t.Code == code {
			return t, true
		}
	}
	return Template{}, false
}

// Render returns the plain message (preview / stored copy). Same layout as RenderSlack, without markup.
func Render(code Code, data json.RawMessage) (string, error) { return render(code, data, false) }

// RenderSlack returns the Slack mrkdwn version: values escaped, title bold, location linked to locationUrl.
func RenderSlack(code Code, data json.RawMessage) (string, error) { return render(code, data, true) }

// render decodes data into the template's struct, validates it and builds the message.
func render(code Code, data json.RawMessage, slack bool) (string, error) {
	var d any
	switch code {
	case TownHall:
		d = &TownHallData{}
	case CompanyEvent:
		d = &CompanyEventData{}
	case Training:
		d = &TrainingData{}
	case General:
		d = &GeneralData{}
	default:
		return "", ErrUnknownTemplate
	}

	if len(bytes.TrimSpace(data)) == 0 || bytes.Equal(bytes.TrimSpace(data), []byte("null")) {
		data = []byte("{}")
	}
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.DisallowUnknownFields() // a typo'd key is an error, not a silently dropped field
	if err := dec.Decode(d); err != nil {
		t, _ := Get(code)
		names := make([]string, len(t.Fields))
		for i, f := range t.Fields {
			names[i] = f.Name
		}
		return "", &ValidationError{Messages: []string{"data: " + string(code) + " 형식에 맞지 않습니다 (" + err.Error() + "). 허용 필드: " + strings.Join(names, ", ")}}
	}
	if err := validate(d); err != nil {
		return "", err
	}

	if slack {
		escapeValues(d)
	}

	var lines []string
	add := func(s ...string) { lines = append(lines, s...) }
	bold := func(s string) string {
		if slack {
			return "*" + s + "*"
		}
		return s
	}
	header := func(title string) { add(bold(title), "") }
	// description is markdown: kept as-is for the plain copy, converted for Slack
	md := func(desc string) string {
		if slack {
			return markdownToSlack(desc)
		}
		return desc
	}

	// body: date/place block (place linked to url in Slack), then optional description block.
	details := func(date, start, location, url, desc, descHeader string) {
		if slack && url != "" {
			location = "<" + url + "|" + location + ">"
		}
		add("📅 "+bold("일시:")+" "+date+" "+start, "📍 "+bold("장소:")+" "+location)
		if desc != "" {
			add("", "📝 "+bold(descHeader), md(desc))
		}
		add("")
	}

	switch v := d.(type) {
	case *TownHallData:
		title := v.Title
		if title == "" {
			title = "타운홀 미팅 안내"
		}
		header("📢 [" + title + "]")
		add("안녕하세요!", "타운홀 미팅 일정을 안내드립니다.", "")
		details(v.EventDate, v.StartTime, v.Location, v.LocationURL, v.Description, "안내 사항")
		add("많은 관심과 참여 부탁드립니다.", "감사합니다!")
	case *CompanyEventData:
		header("🎉 [" + v.EventName + " 안내]")
		add("안녕하세요!", v.EventName+" 일정을 안내드립니다.", "")
		details(v.EventDate, v.StartTime, v.Location, v.LocationURL, v.Description, "안내 사항")
		add("많은 참여 부탁드립니다.", "감사합니다!")
	case *TrainingData:
		header("📚 [" + v.TrainingName + " 안내]")
		add("안녕하세요!", "사내 교육 일정을 안내드립니다.", "")
		details(v.EventDate, v.StartTime, v.Location, v.LocationURL, v.Description, "교육 안내")
		add("참석 대상자분들께서는 일정 확인 부탁드립니다.", "감사합니다!")
	case *GeneralData:
		header("📢 [" + v.Title + "]")
		add("안녕하세요!", "", md(v.Description), "", "감사합니다!")
	}
	return blankRunRe.ReplaceAllString(strings.Join(lines, "\n"), "\n\n"), nil
}

var (
	mdCodeRe    = regexp.MustCompile("(?s)```.*?```|`[^`\n]+`")
	mdHeadingRe = regexp.MustCompile(`(?m)^#{1,6}[ \t]+(.+?)[ \t]*#*$`)
	mdListRe    = regexp.MustCompile(`(?m)^([ \t]*)[-*+][ \t]+`)
	mdQuoteRe   = regexp.MustCompile(`(?m)^&gt;[ \t]?`)
	mdBoldRe    = regexp.MustCompile(`\*\*(\S(?:.*?\S)?)\*\*|__(\S(?:.*?\S)?)__`)
	mdItalicRe  = regexp.MustCompile(`\*(\S(?:[^*\n]*?\S)?)\*`)
	mdStrikeRe  = regexp.MustCompile(`~~(\S(?:.*?\S)?)~~`)
	mdLinkRe    = regexp.MustCompile(`\[([^\]\n]+)\]\((https?://[^\s)|]+)\)`)
)

// markdownToSlack converts common Markdown (already &<>-escaped) to Slack mrkdwn:
// headings/**bold**/__bold__ -> *bold*, *italic* -> _italic_, ~~strike~~ -> ~strike~,
// [text](url) -> <url|text>, "- item" -> "• item", "> quote" kept. Code spans/blocks are left untouched.
// shortcut: regex subset, not a full CommonMark parser (no tables, nested emphasis, images); swap in goldmark if users need more.
func markdownToSlack(s string) string {
	// protect code so its contents are not reformatted
	var codes []string
	s = mdCodeRe.ReplaceAllStringFunc(s, func(c string) string {
		codes = append(codes, c)
		return "\x00" + strconv.Itoa(len(codes)-1) + "\x00"
	})

	const b = "\x01" // bold marker, so the italic pass doesn't see it
	s = mdHeadingRe.ReplaceAllString(s, b+"$1"+b)
	s = mdListRe.ReplaceAllString(s, "${1}• ")
	s = mdQuoteRe.ReplaceAllString(s, "> ")
	s = mdBoldRe.ReplaceAllString(s, b+"$1$2"+b)
	s = mdItalicRe.ReplaceAllString(s, "_${1}_")
	s = mdStrikeRe.ReplaceAllString(s, "~$1~")
	s = mdLinkRe.ReplaceAllString(s, "<$2|$1>")
	s = strings.ReplaceAll(s, b, "*")

	for i, c := range codes {
		s = strings.Replace(s, "\x00"+strconv.Itoa(i)+"\x00", c, 1)
	}
	return s
}

// escapeValues escapes &, <, > in every string field for Slack mrkdwn.
func escapeValues(ptr any) {
	v := reflect.ValueOf(ptr).Elem()
	for i := 0; i < v.NumField(); i++ {
		v.Field(i).SetString(slackEsc.Replace(v.Field(i).String()))
	}
}

// validate trims every string field in place and checks required/format rules from the struct tags.
func validate(ptr any) error {
	v := reflect.ValueOf(ptr).Elem()
	var msgs []string
	for i, f := range fieldsOf(v.Interface()) {
		val := strings.TrimSpace(v.Field(i).String())
		v.Field(i).SetString(val)
		if val == "" {
			if f.Required {
				msgs = append(msgs, f.Name+": 필수 항목입니다")
			}
			continue
		}
		switch f.Type {
		case "date":
			if d, err := time.Parse("2006-01-02", val); err != nil || d.Format("2006-01-02") != val {
				msgs = append(msgs, f.Name+": YYYY-MM-DD 형식이어야 합니다")
			}
		case "time":
			if !timeRe.MatchString(val) {
				msgs = append(msgs, f.Name+": HH:MM 형식이어야 합니다")
			}
		case "url":
			// |, <, >, whitespace would break the Slack <url|text> link
			if (!strings.HasPrefix(val, "http://") && !strings.HasPrefix(val, "https://")) || strings.ContainsAny(val, "|<> \t\n") {
				msgs = append(msgs, f.Name+": http:// 또는 https://로 시작해야 합니다")
			}
		}
	}
	if len(msgs) > 0 {
		return &ValidationError{Messages: msgs}
	}
	return nil
}

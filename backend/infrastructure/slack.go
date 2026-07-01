package infrastructure

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type Client struct {
	botToken string
	httpClient *http.Client
}

func NewClient(botToken string) *Client {
	return &Client{
		botToken: botToken,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

type Message struct {
	Channel string `json:"channel"`
	Text	string `json:"text"`
}

type Response struct {
	OK 		bool 	`json:"ok"`
	Error 	string 	`json:"error,omitempty"`
}

type BirthdayUser struct {
    Name        string
    SlackUserID string
}

func (c *Client) SendMessage(channel, text string) error {
    msg := Message{
        Channel: channel,
        Text:    text,
    }

    body, err := json.Marshal(msg)
    if err != nil {
        return fmt.Errorf("메시지 JSON 변환 실패: %w", err)
    }

    req, err := http.NewRequest("POST", "https://slack.com/api/chat.postMessage", bytes.NewBuffer(body))
    if err != nil {
        return fmt.Errorf("요청 생성 실패: %w", err)
    }

    req.Header.Set("Content-Type", "application/json; charset=utf-8")
    req.Header.Set("Authorization", "Bearer "+c.botToken)

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return fmt.Errorf("Slack API 요청 실패: %w", err)
    }
    defer resp.Body.Close()

    var slackResp Response
    if err := json.NewDecoder(resp.Body).Decode(&slackResp); err != nil {
        return fmt.Errorf("응답 파싱 실패: %w", err)
    }

    if !slackResp.OK {
        return fmt.Errorf("Slack API 오류: %s", slackResp.Error)
    }

    return nil
}

func (c *Client) SendBirthdayNotification(channel string, name string, slackUserID string) error {
    text := fmt.Sprintf("🎂 *오늘은 %s님의 생일입니다!* 🎉\n\n<@%s> 생일 축하합니다! 🥳🎈", name, slackUserID)
    return c.SendMessage(channel, text)
}

func (c *Client) SendMultipleBirthdayNotification(channel string, users []BirthdayUser) error {
    if len(users) == 0 {
        return nil
    }

    if len(users) == 1 {
        return c.SendBirthdayNotification(channel, users[0].Name, users[0].SlackUserID)
    }

    text := "🎂 *오늘의 생일자들을 축하해주세요!* 🎉\n\n"
    for _, u := range users {
        text += fmt.Sprintf("• <@%s> (%s) 🥳\n", u.SlackUserID, u.Name)
    }
    text += "\n모두 생일 축하합니다! 🎈🎊"

    return c.SendMessage(channel, text)
}
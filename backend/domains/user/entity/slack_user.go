package entity

import "time"

type SlackUser struct {
	ID          uint      `gorm:"primaryKey;autoIncrement"`
	Name        string    `gorm:"type:varchar(100);not null"`
	Email       string    `gorm:"type:varchar(255);uniqueIndex;not null"`
	SlackUserID string    `gorm:"type:varchar(50);uniqueIndex;not null"`
	Birthday    time.Time `gorm:"type:date;not null"`
	CreatedAt   time.Time `gorm:"autoCreateTime"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime"`
}

func NewSlackUser(name, email, slackUserID string, birthday time.Time) *SlackUser {
	return &SlackUser{
		Name:        name,
		Email:       email,
		SlackUserID: slackUserID,
		Birthday:    birthday,
	}
}

func (u *SlackUser) UpdateEmail(email string) {
	u.Email = email
}

func (u *SlackUser) UpdateBirthday(birthday time.Time) {
	u.Birthday = birthday
}

func (u *SlackUser) IsBirthdayToday() bool {
	now := time.Now()
	return u.Birthday.Month() == now.Month() && u.Birthday.Day() == now.Day()
}

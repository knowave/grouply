package entity

import "time"

type User struct {
	ID           uint      `gorm:"primaryKey;autoIncrement"`
	Name         string    `gorm:"type:varchar(100);not null"`
	Email        string    `gorm:"type:varchar(255);uniqueIndex;not null"`
	SlackUserID  string    `gorm:"type:varchar(50);uniqueIndex;not null"`
	Birthday     time.Time `gorm:"type:date;not null"`
	DepartmentID *uint     `gorm:"index"`
	CreatedAt    time.Time `gorm:"autoCreateTime"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime"`
}

func NewUser(name, email, slackUserID string, birthday time.Time, departmentID *uint) *User {
	return &User{
		Name:         name,
		Email:        email,
		SlackUserID:  slackUserID,
		Birthday:     birthday,
		DepartmentID: departmentID,
	}
}

func (u *User) UpdateEmail(email string) {
	u.Email = email
}

func (u *User) UpdateBirthday(birthday time.Time) {
	u.Birthday = birthday
}

func (u *User) UpdateDepartment(departmentID *uint) {
	u.DepartmentID = departmentID
}

func (u *User) IsBirthdayToday() bool {
	now := time.Now()
	return u.Birthday.Month() == now.Month() && u.Birthday.Day() == now.Day()
}

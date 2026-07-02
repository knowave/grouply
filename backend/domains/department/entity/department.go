package entity

import "time"

type Department struct {
	ID          uint      `gorm:"primaryKey;autoIncrement"`
	Name        string    `gorm:"type:varchar(100);uniqueIndex;not null"`
	Description string    `gorm:"type:text"`
	CreatedAt   time.Time `gorm:"autoCreateTime"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime"`
}

func NewDepartment(name, description string) *Department {
	return &Department{
		Name:        name,
		Description: description,
	}
}

func (d *Department) Update(name, description string) {
	d.Name = name
	d.Description = description
}

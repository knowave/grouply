package entity

import "time"

type Config struct {
	ID        uint      `gorm:"primaryKey;autoIncrement"`
	Key       string    `gorm:"type:varchar(100);uniqueIndex;not null"`
	Value     string    `gorm:"type:text;not null"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
	UpdatedAt time.Time `gorm:"autoUpdateTime"`
}

func NewConfig(key, value string) *Config {
	return &Config{
		Key:   key,
		Value: value,
	}
}

func (c *Config) UpdateValue(value string) {
	c.Value = value
}

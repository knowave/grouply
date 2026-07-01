package infrastructure

import (
	"fmt"

	restaurantEntity "grouply/backend/domains/restaurant/entity"
	userEntity "grouply/backend/domains/user/entity"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

type Database struct {
	db *gorm.DB
}

func NewDatabase(host, port, user, password, dbname string) (*Database, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		user, password, host, port, dbname,
	)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("DB 연결 실패: %w", err)
	}

	return &Database{db: db}, nil
}

func (d *Database) AutoMigrate() error {
	return d.db.AutoMigrate(
		&userEntity.Config{},
		&userEntity.SlackUser{},
		&restaurantEntity.Restaurant{},
	)
}

func (d *Database) GetDB() *gorm.DB {
	return d.db
}

package entity

import "time"

type Restaurant struct {
	ID              uint      `gorm:"primaryKey;autoIncrement"`
	Name            string    `gorm:"type:varchar(100);not null"`
	Address         string    `gorm:"type:varchar(255);not null"`
	RecommendedMenu string    `gorm:"type:varchar(255);not null"`
	Remark          string    `gorm:"type:text"`
	CreatedAt       time.Time `gorm:"autoCreateTime"`
	UpdatedAt       time.Time `gorm:"autoUpdateTime"`
}

func NewRestaurant(name, address, recommendedMenu, remark string) *Restaurant {
	return &Restaurant{
		Name:            name,
		Address:         address,
		RecommendedMenu: recommendedMenu,
		Remark:          remark,
	}
}

func (r *Restaurant) Update(name, address, recommendedMenu, remark string) {
	r.Name = name
	r.Address = address
	r.RecommendedMenu = recommendedMenu
	r.Remark = remark
}

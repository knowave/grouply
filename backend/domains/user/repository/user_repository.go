package repository

import (
	"grouply/backend/domains/user/dto"
	"grouply/backend/domains/user/entity"
	"time"

	"gorm.io/gorm"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) FindByID(id uint) (*entity.User, error) {
	var user entity.User
	err := r.db.First(&user, id).Error

	if err != nil {
		return nil, err
	}

	return &user, err
}

func (r *UserRepository) FindByEmail(email string) (*entity.User, error) {
	var user entity.User
	err := r.db.Where("email = ?", email).First(&user).Error

	if err != nil {
		return nil, err
	}

	return &user, err
}

func (r *UserRepository) FindByBirthday(month time.Month, day int) ([]entity.User, error) {
	var users []entity.User
	err := r.db.Where("MONTH(birthday) = ? AND DAY(birthday) = ?", month, day).Find(&users).Error

	if err != nil {
		return nil, err
	}

	return users, nil
}

func (r *UserRepository) FindAll(page, size int, name, department, sort, order string) ([]dto.UserResponse, int64, error) {
	var items []dto.UserResponse
	var total int64

	query := r.db.Model(&entity.User{}).
		Joins("LEFT JOIN departments ON departments.id = users.department_id")
	if name != "" {
		query = query.Where("users.name LIKE ?", "%"+name+"%")
	}
	if department != "" {
		query = query.Where("departments.name LIKE ?", "%"+department+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * size
	err := query.
		Select("users.*, departments.name AS department_name").
		Order(userOrderClause(sort, order)).
		Offset(offset).Limit(size).
		Scan(&items).Error
	if err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func userOrderClause(sort, order string) string {
	direction := "ASC"
	if order == "desc" {
		direction = "DESC"
	}

	switch sort {
	case "name":
		return "users.name " + direction
	default:
		return "MONTH(users.birthday) " + direction + ", DAY(users.birthday) " + direction + ", users.birthday " + direction
	}
}

func (r *UserRepository) Save(user *entity.User) error {
	return r.db.Save(user).Error
}

func (r *UserRepository) SaveAllInBatches(users []*entity.User, batchSize int) error {
	if len(users) == 0 {
		return nil
	}

	if batchSize <= 0 {
		batchSize = 100
	}

	return r.db.CreateInBatches(users, batchSize).Error
}

func (r *UserRepository) Delete(id uint) error {
	return r.db.Delete(&entity.User{}, id).Error
}

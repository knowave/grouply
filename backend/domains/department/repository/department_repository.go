package repository

import (
	"grouply/backend/domains/department/entity"

	"gorm.io/gorm"
)

type DepartmentRepository struct {
	db *gorm.DB
}

func NewDepartmentRepository(db *gorm.DB) *DepartmentRepository {
	return &DepartmentRepository{db: db}
}

func (r *DepartmentRepository) FindAll(page, size int, name string) ([]entity.Department, int64, error) {
	var departments []entity.Department
	var total int64

	query := r.db.Model(&entity.Department{})
	if name != "" {
		query = query.Where("name LIKE ?", "%"+name+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * size
	err := query.Order("created_at ASC").Offset(offset).Limit(size).Find(&departments).Error
	if err != nil {
		return nil, 0, err
	}

	return departments, total, nil
}

func (r *DepartmentRepository) FindByID(id uint) (*entity.Department, error) {
	var department entity.Department
	err := r.db.First(&department, id).Error
	if err != nil {
		return nil, err
	}
	return &department, nil
}

func (r *DepartmentRepository) FindByIDs(ids []uint) ([]entity.Department, error) {
	var departments []entity.Department
	err := r.db.Find(&departments, ids).Error
	if err != nil {
		return nil, err
	}
	return departments, nil
}

func (r *DepartmentRepository) SaveAllInBatches(departments []*entity.Department, batchSize int) error {
	if len(departments) == 0 {
		return nil
	}
	if batchSize <= 0 {
		batchSize = 100
	}
	return r.db.CreateInBatches(departments, batchSize).Error
}

func (r *DepartmentRepository) Save(department *entity.Department) error {
	return r.db.Save(department).Error
}

func (r *DepartmentRepository) DeleteByIDs(ids []uint) error {
	return r.db.Delete(&entity.Department{}, ids).Error
}

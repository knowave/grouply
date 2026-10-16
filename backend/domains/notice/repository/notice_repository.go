package repository

import (
	"time"

	"grouply/backend/domains/notice/entity"

	"gorm.io/gorm"
)

type NoticeRepository struct {
	db *gorm.DB
}

func NewNoticeRepository(db *gorm.DB) *NoticeRepository {
	return &NoticeRepository{db: db}
}

func (r *NoticeRepository) Save(n *entity.Notice) error {
	return r.db.Save(n).Error
}

func (r *NoticeRepository) FindByID(id uint) (*entity.Notice, error) {
	var notice entity.Notice
	err := r.db.First(&notice, id).Error
	if err != nil {
		return nil, err
	}
	return &notice, nil
}

func (r *NoticeRepository) FindAll(page, size int, status string) ([]entity.Notice, int64, error) {
	var notices []entity.Notice
	var total int64

	query := r.db.Model(&entity.Notice{})
	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * size
	err := query.Order("id DESC").Offset(offset).Limit(size).Find(&notices).Error
	if err != nil {
		return nil, 0, err
	}

	return notices, total, nil
}

func (r *NoticeRepository) FindDue(now time.Time) ([]entity.Notice, error) {
	var notices []entity.Notice
	err := r.db.
		Where("status = ? AND scheduled_at <= ?", entity.StatusPending, now).
		Find(&notices).Error
	if err != nil {
		return nil, err
	}
	return notices, nil
}

// ClaimForSend is the double-send guard: only one caller can move PENDING to PROCESSING
func (r *NoticeRepository) ClaimForSend(id uint) (bool, error) {
	result := r.db.Model(&entity.Notice{}).
		Where("id = ? AND status = ?", id, entity.StatusPending).
		Update("status", entity.StatusProcessing)
	if result.Error != nil {
		return false, result.Error
	}
	return result.RowsAffected == 1, nil
}

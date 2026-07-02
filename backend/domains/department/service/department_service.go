package service

import (
	"grouply/backend/domains/department/dto"
	"grouply/backend/domains/department/entity"
	"grouply/backend/domains/department/repository"
)

type DepartmentService struct {
	repository *repository.DepartmentRepository
}

func NewDepartmentService(repository *repository.DepartmentRepository) *DepartmentService {
	return &DepartmentService{repository: repository}
}

func (s *DepartmentService) GetAll(page, size int, name string) ([]entity.Department, int64, error) {
	return s.repository.FindAll(page, size, name)
}

func (s *DepartmentService) GetByID(id uint) (*entity.Department, error) {
	return s.repository.FindByID(id)
}

func (s *DepartmentService) GetByIDs(ids []uint) ([]entity.Department, error) {
	return s.repository.FindByIDs(ids)
}

func (s *DepartmentService) CreateAll(requests []dto.CreateDepartmentRequest) error {
	departments := make([]*entity.Department, len(requests))
	for i, req := range requests {
		departments[i] = entity.NewDepartment(req.Name, req.Description)
	}
	return s.repository.SaveAllInBatches(departments, 100)
}

func (s *DepartmentService) Update(id uint, name, description string) (*entity.Department, error) {
	department, err := s.repository.FindByID(id)
	if err != nil {
		return nil, err
	}
	department.Update(name, description)
	if err := s.repository.Save(department); err != nil {
		return nil, err
	}
	return department, nil
}

func (s *DepartmentService) DeleteBatch(ids []uint) error {
	return s.repository.DeleteByIDs(ids)
}

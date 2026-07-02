package service

import (
	"errors"
	departmentService "grouply/backend/domains/department/service"
	"grouply/backend/domains/user/dto"
	"grouply/backend/domains/user/entity"
	"grouply/backend/domains/user/repository"
	"time"

	"gorm.io/gorm"
)

var ErrDepartmentNotFound = errors.New("존재하지 않는 부서입니다")

type UserService struct {
	repository        *repository.UserRepository
	departmentService *departmentService.DepartmentService
}

func NewUserService(repository *repository.UserRepository, departmentService *departmentService.DepartmentService) *UserService {
	return &UserService{repository: repository, departmentService: departmentService}
}

func (s *UserService) validateDepartment(departmentID *uint) error {
	if departmentID == nil {
		return nil
	}
	_, err := s.departmentService.GetByID(*departmentID)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrDepartmentNotFound
	}
	return err
}

func (s *UserService) GetByID(id uint) (*entity.User, error) {
	return s.repository.FindByID(id)
}

func (s *UserService) GetByEmail(email string) (*entity.User, error) {
	return s.repository.FindByEmail(email)
}

func (s *UserService) GetTodayBirthdays() ([]entity.User, error) {
	now := time.Now()
	return s.repository.FindByBirthday(now.Month(), now.Day())
}

func (s *UserService) GetAll(page, size int, name, department, sort, order string) ([]dto.UserResponse, int64, error) {
	return s.repository.FindAll(page, size, name, department, sort, order)
}

func (s *UserService) Create(name, email, slackUserID string, birthday time.Time, departmentID *uint) (*entity.User, error) {
	if err := s.validateDepartment(departmentID); err != nil {
		return nil, err
	}

	user := entity.NewUser(name, email, slackUserID, birthday, departmentID)
	err := s.repository.Save(user)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (s *UserService) Update(id uint, name, email string, birthday time.Time, departmentID *uint) (*entity.User, error) {
	if err := s.validateDepartment(departmentID); err != nil {
		return nil, err
	}

	user, err := s.repository.FindByID(id)
	if err != nil {
		return nil, err
	}

	user.Name = name
	user.UpdateEmail(email)
	user.UpdateBirthday(birthday)
	user.UpdateDepartment(departmentID)

	err = s.repository.Save(user)

	if err != nil {
		return nil, err
	}

	return user, nil
}

func (s *UserService) Delete(id uint) error {
	return s.repository.Delete(id)
}

func (s *UserService) CreateAll(dtos []dto.CreateUserRequest) error {
	departmentIDSet := make(map[uint]struct{})
	for _, item := range dtos {
		if item.DepartmentID != nil {
			departmentIDSet[*item.DepartmentID] = struct{}{}
		}
	}

	if len(departmentIDSet) > 0 {
		departmentIDs := make([]uint, 0, len(departmentIDSet))
		for id := range departmentIDSet {
			departmentIDs = append(departmentIDs, id)
		}

		departments, err := s.departmentService.GetByIDs(departmentIDs)
		if err != nil {
			return err
		}
		if len(departments) != len(departmentIDs) {
			return ErrDepartmentNotFound
		}
	}

	users := make([]*entity.User, len(dtos))

	for i, item := range dtos {
		users[i] = entity.NewUser(item.Name, item.Email, item.SlackUserID, item.Birthday, item.DepartmentID)
	}

	return s.repository.SaveAllInBatches(users, 100)
}

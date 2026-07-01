package service

import (
	"grouply/backend/domains/user/dto"
	"grouply/backend/domains/user/entity"
	"grouply/backend/domains/user/repository"
	"time"
)

type UserService struct {
	repository *repository.UserRepository
}

func NewUserService(repository *repository.UserRepository) *UserService {
	return &UserService{repository: repository}
}

func (s *UserService) GetByID(id uint) (*entity.SlackUser, error) {
	return s.repository.FindByID(id)
}

func (s *UserService) GetByEmail(email string) (*entity.SlackUser, error) {
	return s.repository.FindByEmail(email)
}

func (s *UserService) GetTodayBirthdays() ([]entity.SlackUser, error) {
	now := time.Now()
	return s.repository.FindByBirthday(now.Month(), now.Day())
}

func (s *UserService) GetAll(sort, order string) ([]entity.SlackUser, error) {
	return s.repository.FindAll(sort, order)
}

func (s *UserService) Create(name, email, slackUserID string, birthday time.Time) (*entity.SlackUser, error) {
	user := entity.NewSlackUser(name, email, slackUserID, birthday)
	err := s.repository.Save(user)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (s *UserService) Update(id uint, name, email string, birthday time.Time) (*entity.SlackUser, error) {
	user, err := s.repository.FindByID(id)
	if err != nil {
		return nil, err
	}

	user.Name = name
	user.UpdateEmail(email)
	user.UpdateBirthday(birthday)

	err = s.repository.Save(user)

	if err != nil {
		return nil, err
	}

	return user, nil
}

func (s *UserService) Delete(id uint) error {
	return s.repository.Delete(id)
}

func (s *UserService) CreateAll(dto []dto.CreateSlackUserRequest) error {
	slackUsers := make([]*entity.SlackUser, len(dto))

	for i, item := range dto {
		slackUsers[i] = entity.NewSlackUser(item.Name, item.Email, item.SlackUserID, item.Birthday)
	}

	return s.repository.SaveAllInBatches(slackUsers, 100)
}

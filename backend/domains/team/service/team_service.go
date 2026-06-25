package service

import (
	"errors"
	"math/rand"
	"sort"
	"strings"
	"time"

	"grouply/backend/domains/team/dto"
)

type ErrorKind int

const (
	ErrorKindValidation ErrorKind = iota
	ErrorKindUnprocessable
)

var errNoSolution = errors.New("조건을 만족하는 팀 구성을 만들 수 없습니다.")

type AppError struct {
	Kind    ErrorKind
	Message string
}

func (e *AppError) Error() string {
	return e.Message
}

type TeamService struct {
	rng *rand.Rand
}

type person struct {
	name string
}

type team struct {
	name    string
	members []person
}

type rule struct {
	personA string
	personB string
}

func NewTeamService() *TeamService {
	return NewTeamServiceWithRand(rand.New(rand.NewSource(time.Now().UnixNano())))
}

func NewTeamServiceWithRand(rng *rand.Rand) *TeamService {
	return &TeamService{rng: rng}
}

func (s *TeamService) GenerateTeams(req dto.GenerateTeamRequest) (*dto.GenerateTeamResponse, error) {
	peopleNames, err := normalizeList(req.People, "사람")
	if err != nil {
		return nil, err
	}
	teamNames, err := normalizeList(req.Teams, "팀")
	if err != nil {
		return nil, err
	}
	if len(peopleNames) < 2 {
		return nil, validationError("사람은 최소 2명 이상이어야 합니다.")
	}
	if len(teamNames) < 2 {
		return nil, validationError("팀은 최소 2개 이상이어야 합니다.")
	}
	if len(teamNames) > len(peopleNames) {
		return nil, validationError("팀 수는 사람 수보다 많을 수 없습니다.")
	}

	knownPeople := make(map[string]bool, len(peopleNames))
	people := make([]person, 0, len(peopleNames))
	for _, name := range peopleNames {
		knownPeople[name] = true
		people = append(people, person{name: name})
	}

	separateRules, err := normalizeRules(req.SeparateRules, knownPeople, "같은 팀 불가")
	if err != nil {
		return nil, err
	}
	sameTeamRules, err := normalizeRules(req.SameTeamRules, knownPeople, "반드시 같은 팀")
	if err != nil {
		return nil, err
	}
	if hasRuleConflict(peopleNames, separateRules, sameTeamRules) {
		return nil, validationError("같은 팀 불가와 반드시 같은 팀이 충돌합니다.")
	}

	teams, err := s.generateTeams(people, teamNames, separateRules, sameTeamRules)
	if err != nil {
		if errors.Is(err, errNoSolution) {
			return nil, unprocessableError("현재 조건으로는 팀을 생성할 수 없습니다.")
		}
		return nil, err
	}

	return toResponse(teams), nil
}

func normalizeList(values []string, label string) ([]string, error) {
	seen := map[string]bool{}
	normalized := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			return nil, validationError(label + " 이름은 비어 있을 수 없습니다.")
		}
		if seen[trimmed] {
			return nil, validationError(label + " 이름은 중복될 수 없습니다: " + trimmed)
		}
		seen[trimmed] = true
		normalized = append(normalized, trimmed)
	}
	return normalized, nil
}

func normalizeRules(rules [][]string, knownPeople map[string]bool, label string) ([]rule, error) {
	normalized := make([]rule, 0, len(rules))
	seen := map[[2]string]bool{}
	for _, item := range rules {
		if len(item) != 2 {
			return nil, validationError(label + "은 두 사람으로 구성되어야 합니다.")
		}

		left := strings.TrimSpace(item[0])
		right := strings.TrimSpace(item[1])

		if left == "" || right == "" {
			return nil, validationError(label + "에는 빈 사람이 포함될 수 없습니다.")
		}

		if left == right {
			return nil, validationError(label + "은 서로 다른 두 사람이어야 합니다.")
		}

		if !knownPeople[left] || !knownPeople[right] {
			return nil, validationError(label + "에 등록되지 않은 사람이 포함되어 있습니다.")
		}

		pair := orderedPair(left, right)
		if seen[pair] {
			continue
		}

		seen[pair] = true
		normalized = append(normalized, rule{personA: pair[0], personB: pair[1]})
	}
	return normalized, nil
}

func hasRuleConflict(people []string, separateRules []rule, sameTeamRules []rule) bool {
	parent := map[string]string{}
	for _, name := range people {
		parent[name] = name
	}

	var find func(string) string
	find = func(name string) string {
		if parent[name] != name {
			parent[name] = find(parent[name])
		}
		return parent[name]
	}
	union := func(a, b string) {
		rootA := find(a)
		rootB := find(b)
		if rootA != rootB {
			parent[rootB] = rootA
		}
	}

	for _, item := range sameTeamRules {
		union(item.personA, item.personB)
	}
	for _, item := range separateRules {
		if find(item.personA) == find(item.personB) {
			return true
		}
	}
	return false
}

func (s *TeamService) generateTeams(people []person, teamNames []string, separateRules []rule, sameTeamRules []rule) ([]team, error) {
	groups := buildSameTeamGroups(people, sameTeamRules)
	groupByPerson := map[string]int{}
	for idx, group := range groups {
		for _, name := range group {
			groupByPerson[name] = idx
		}
	}

	for _, item := range separateRules {
		if groupByPerson[item.personA] == groupByPerson[item.personB] {
			return nil, errNoSolution
		}
	}

	maxSize := (len(people) + len(teamNames) - 1) / len(teamNames)
	minSize := len(people) / len(teamNames)
	rng := s.rng
	if rng == nil {
		rng = rand.New(rand.NewSource(time.Now().UnixNano()))
	}

	rng.Shuffle(len(groups), func(i, j int) {
		groups[i], groups[j] = groups[j], groups[i]
	})
	sort.SliceStable(groups, func(i, j int) bool {
		return len(groups[i]) > len(groups[j])
	})

	assignments := make([][]string, len(teamNames))
	if !assignGroups(groups, assignments, separateRules, maxSize, rng, 0) {
		return nil, errNoSolution
	}

	for idx := range assignments {
		if len(assignments[idx]) < minSize || len(assignments[idx]) > maxSize {
			return nil, errNoSolution
		}
		sort.Strings(assignments[idx])
	}

	teams := make([]team, len(teamNames))
	for idx, teamName := range teamNames {
		members := make([]person, 0, len(assignments[idx]))
		for _, member := range assignments[idx] {
			members = append(members, person{name: member})
		}
		teams[idx] = team{name: teamName, members: members}
	}
	return teams, nil
}

func buildSameTeamGroups(people []person, rules []rule) [][]string {
	parent := map[string]string{}
	for _, item := range people {
		parent[item.name] = item.name
	}

	var find func(string) string
	find = func(name string) string {
		if parent[name] != name {
			parent[name] = find(parent[name])
		}
		return parent[name]
	}
	union := func(a, b string) {
		rootA := find(a)
		rootB := find(b)
		if rootA != rootB {
			parent[rootB] = rootA
		}
	}

	for _, item := range rules {
		union(item.personA, item.personB)
	}

	groupMap := map[string][]string{}
	for _, item := range people {
		root := find(item.name)
		groupMap[root] = append(groupMap[root], item.name)
	}

	groups := make([][]string, 0, len(groupMap))
	for _, group := range groupMap {
		sort.Strings(group)
		groups = append(groups, group)
	}
	return groups
}

func assignGroups(groups [][]string, assignments [][]string, separateRules []rule, maxSize int, rng *rand.Rand, groupIndex int) bool {
	if groupIndex == len(groups) {
		return true
	}

	group := groups[groupIndex]
	teamOrder := make([]int, len(assignments))
	for idx := range assignments {
		teamOrder[idx] = idx
	}
	rng.Shuffle(len(teamOrder), func(i, j int) {
		teamOrder[i], teamOrder[j] = teamOrder[j], teamOrder[i]
	})
	sort.SliceStable(teamOrder, func(i, j int) bool {
		return len(assignments[teamOrder[i]]) < len(assignments[teamOrder[j]])
	})

	for _, teamIndex := range teamOrder {
		if len(assignments[teamIndex])+len(group) > maxSize {
			continue
		}
		if violatesSeparateRule(assignments[teamIndex], group, separateRules) {
			continue
		}
		assignments[teamIndex] = append(assignments[teamIndex], group...)
		if assignGroups(groups, assignments, separateRules, maxSize, rng, groupIndex+1) {
			return true
		}
		assignments[teamIndex] = assignments[teamIndex][:len(assignments[teamIndex])-len(group)]
	}
	return false
}

func violatesSeparateRule(existing []string, incoming []string, rules []rule) bool {
	members := map[string]bool{}
	for _, member := range existing {
		members[member] = true
	}
	for _, member := range incoming {
		members[member] = true
	}
	for _, item := range rules {
		if members[item.personA] && members[item.personB] {
			return true
		}
	}
	return false
}

func toResponse(teams []team) *dto.GenerateTeamResponse {
	response := &dto.GenerateTeamResponse{Teams: make([]dto.TeamResult, len(teams))}
	for idx, item := range teams {
		members := make([]string, 0, len(item.members))
		for _, member := range item.members {
			members = append(members, member.name)
		}
		response.Teams[idx] = dto.TeamResult{Name: item.name, Members: members}
	}
	return response
}

func orderedPair(left, right string) [2]string {
	if left < right {
		return [2]string{left, right}
	}
	return [2]string{right, left}
}

func validationError(message string) error {
	return &AppError{Kind: ErrorKindValidation, Message: message}
}

func unprocessableError(message string) error {
	return &AppError{Kind: ErrorKindUnprocessable, Message: message}
}

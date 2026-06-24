package main

import (
	"math/rand"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type GenerateRequest struct {
	People        []string   `json:"people"`
	Teams         []string   `json:"teams"`
	SeparateRules [][]string `json:"separateRules"`
	SameTeamRules [][]string `json:"sameTeamRules"`
}

type TeamResponse struct {
	Name    string   `json:"name"`
	Members []string `json:"members"`
}

type GenerateResponse struct {
	Teams []TeamResponse `json:"teams"`
}

type apiError struct {
	Error string `json:"error"`
}

func main() {
	router := gin.Default()
	router.Use(corsMiddleware())

	v1 := router.Group("/api/v1")
	v1.POST("/groups/generate", func(c *gin.Context) {
		var req GenerateRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, apiError{Error: "요청 형식이 올바르지 않습니다."})
			return
		}

		result, err := Generate(req, rand.New(rand.NewSource(time.Now().UnixNano())))
		if err != nil {
			c.JSON(http.StatusBadRequest, apiError{Error: err.Error()})
			return
		}

		c.JSON(http.StatusOK, result)
	})

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	if err := router.Run(":8080"); err != nil {
		panic(err)
	}
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func Generate(req GenerateRequest, rng *rand.Rand) (GenerateResponse, error) {
	people, err := normalizeList(req.People, "사람")
	if err != nil {
		return GenerateResponse{}, err
	}
	teams, err := normalizeList(req.Teams, "팀")
	if err != nil {
		return GenerateResponse{}, err
	}
	if len(people) < 2 {
		return GenerateResponse{}, validationError("사람은 최소 2명 이상이어야 합니다.")
	}
	if len(teams) < 2 {
		return GenerateResponse{}, validationError("팀은 최소 2개 이상이어야 합니다.")
	}
	if len(teams) > len(people) {
		return GenerateResponse{}, validationError("팀 수는 사람 수보다 많을 수 없습니다.")
	}

	knownPeople := make(map[string]bool, len(people))
	for _, person := range people {
		knownPeople[person] = true
	}

	separateRules, err := normalizeRules(req.SeparateRules, knownPeople, "분리 조건")
	if err != nil {
		return GenerateResponse{}, err
	}
	sameTeamRules, err := normalizeRules(req.SameTeamRules, knownPeople, "같은 팀 조건")
	if err != nil {
		return GenerateResponse{}, err
	}

	groups := buildSameTeamGroups(people, sameTeamRules)
	groupByPerson := map[string]int{}
	for idx, group := range groups {
		for _, person := range group {
			groupByPerson[person] = idx
		}
	}

	for _, rule := range separateRules {
		if groupByPerson[rule[0]] == groupByPerson[rule[1]] {
			return GenerateResponse{}, validationError("같은 팀 조건과 분리 조건이 충돌합니다: " + rule[0] + " / " + rule[1])
		}
	}

	maxSize := (len(people) + len(teams) - 1) / len(teams)
	minSize := len(people) / len(teams)

	rng.Shuffle(len(groups), func(i, j int) {
		groups[i], groups[j] = groups[j], groups[i]
	})
	sort.SliceStable(groups, func(i, j int) bool {
		return len(groups[i]) > len(groups[j])
	})

	assignments := make([][]string, len(teams))
	if !assignGroups(groups, assignments, separateRules, maxSize, rng, 0) {
		return GenerateResponse{}, validationError("조건을 만족하는 팀 구성을 만들 수 없습니다.")
	}

	for idx := range assignments {
		if len(assignments[idx]) < minSize || len(assignments[idx]) > maxSize {
			return GenerateResponse{}, validationError("균등한 팀 구성을 만들 수 없습니다.")
		}
		sort.Strings(assignments[idx])
	}

	response := GenerateResponse{Teams: make([]TeamResponse, len(teams))}
	for idx, team := range teams {
		response.Teams[idx] = TeamResponse{
			Name:    team,
			Members: assignments[idx],
		}
	}
	return response, nil
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

func normalizeRules(rules [][]string, knownPeople map[string]bool, label string) ([][2]string, error) {
	normalized := make([][2]string, 0, len(rules))
	seen := map[[2]string]bool{}
	for _, rule := range rules {
		if len(rule) != 2 {
			return nil, validationError(label + "은 두 사람으로 구성되어야 합니다.")
		}
		left := strings.TrimSpace(rule[0])
		right := strings.TrimSpace(rule[1])
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
		normalized = append(normalized, pair)
	}
	return normalized, nil
}

func buildSameTeamGroups(people []string, rules [][2]string) [][]string {
	parent := map[string]string{}
	for _, person := range people {
		parent[person] = person
	}

	var find func(string) string
	find = func(person string) string {
		if parent[person] != person {
			parent[person] = find(parent[person])
		}
		return parent[person]
	}
	union := func(a, b string) {
		rootA := find(a)
		rootB := find(b)
		if rootA != rootB {
			parent[rootB] = rootA
		}
	}

	for _, rule := range rules {
		union(rule[0], rule[1])
	}

	groupMap := map[string][]string{}
	for _, person := range people {
		root := find(person)
		groupMap[root] = append(groupMap[root], person)
	}

	groups := make([][]string, 0, len(groupMap))
	for _, group := range groupMap {
		sort.Strings(group)
		groups = append(groups, group)
	}
	return groups
}

func assignGroups(groups [][]string, assignments [][]string, separateRules [][2]string, maxSize int, rng *rand.Rand, groupIndex int) bool {
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

func violatesSeparateRule(existing []string, incoming []string, rules [][2]string) bool {
	members := map[string]bool{}
	for _, member := range existing {
		members[member] = true
	}
	for _, member := range incoming {
		members[member] = true
	}
	for _, rule := range rules {
		if members[rule[0]] && members[rule[1]] {
			return true
		}
	}
	return false
}

func orderedPair(left, right string) [2]string {
	if left < right {
		return [2]string{left, right}
	}
	return [2]string{right, left}
}

func validationError(message string) error {
	return &grouplyError{message: message}
}

type grouplyError struct {
	message string
}

func (e *grouplyError) Error() string {
	return e.message
}

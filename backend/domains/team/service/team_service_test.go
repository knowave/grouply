package service

import (
	"math/rand"
	"testing"

	"grouply/backend/domains/team/dto"
)

func TestGenerateTeamsSatisfiesRules(t *testing.T) {
	teamService := NewTeamServiceWithRand(rand.New(rand.NewSource(1)))

	result, err := teamService.GenerateTeams(dto.GenerateTeamRequest{
		People:        []string{"김민수", "이서연", "박지훈", "최유진"},
		Teams:         []string{"A팀", "B팀"},
		SeparateRules: [][]string{{"김민수", "이서연"}},
		SameTeamRules: [][]string{{"김민수", "박지훈"}},
	})
	if err != nil {
		t.Fatalf("GenerateTeams returned error: %v", err)
	}

	teamByPerson := map[string]string{}
	for _, team := range result.Teams {
		for _, member := range team.Members {
			teamByPerson[member] = team.Name
		}
	}

	if teamByPerson["김민수"] != teamByPerson["박지훈"] {
		t.Fatalf("same-team rule was not satisfied: %+v", result.Teams)
	}
	if teamByPerson["김민수"] == teamByPerson["이서연"] {
		t.Fatalf("separate rule was not satisfied: %+v", result.Teams)
	}
}

func TestGenerateTeamsRejectsConflictingRules(t *testing.T) {
	teamService := NewTeamServiceWithRand(rand.New(rand.NewSource(1)))

	_, err := teamService.GenerateTeams(dto.GenerateTeamRequest{
		People:        []string{"김민수", "박지훈"},
		Teams:         []string{"A팀", "B팀"},
		SeparateRules: [][]string{{"김민수", "박지훈"}},
		SameTeamRules: [][]string{{"김민수", "박지훈"}},
	})
	if err == nil {
		t.Fatal("expected conflicting rules to fail")
	}
}

func TestGenerateTeamsRejectsTransitiveConflictingRules(t *testing.T) {
	teamService := NewTeamServiceWithRand(rand.New(rand.NewSource(1)))

	_, err := teamService.GenerateTeams(dto.GenerateTeamRequest{
		People:        []string{"김민수", "박지훈", "최유진"},
		Teams:         []string{"A팀", "B팀"},
		SeparateRules: [][]string{{"김민수", "최유진"}},
		SameTeamRules: [][]string{{"김민수", "박지훈"}, {"박지훈", "최유진"}},
	})
	if err == nil {
		t.Fatal("expected transitive conflicting rules to fail")
	}
}

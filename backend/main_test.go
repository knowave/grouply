package main

import (
	"math/rand"
	"testing"
)

func TestGenerateSatisfiesRules(t *testing.T) {
	result, err := Generate(GenerateRequest{
		People:        []string{"김민수", "이서연", "박지훈", "최유진"},
		Teams:         []string{"A팀", "B팀"},
		SeparateRules: [][]string{{"김민수", "이서연"}},
		SameTeamRules: [][]string{{"김민수", "박지훈"}},
	}, rand.New(rand.NewSource(1)))
	if err != nil {
		t.Fatalf("Generate returned error: %v", err)
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

func TestGenerateRejectsConflictingRules(t *testing.T) {
	_, err := Generate(GenerateRequest{
		People:        []string{"김민수", "박지훈"},
		Teams:         []string{"A팀", "B팀"},
		SeparateRules: [][]string{{"김민수", "박지훈"}},
		SameTeamRules: [][]string{{"김민수", "박지훈"}},
	}, rand.New(rand.NewSource(1)))
	if err == nil {
		t.Fatal("expected conflicting rules to fail")
	}
}

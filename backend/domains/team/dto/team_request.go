package dto

type GenerateTeamRequest struct {
	People        []string   `json:"people"`
	Teams         []string   `json:"teams"`
	SeparateRules [][]string `json:"separateRules"`
	SameTeamRules [][]string `json:"sameTeamRules"`
}

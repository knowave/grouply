package dto

type GenerateTeamResponse struct {
	Teams []TeamResult `json:"teams"`
}

type TeamResult struct {
	Name    string   `json:"name"`
	Members []string `json:"members"`
}

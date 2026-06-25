export type Rule = {
  left: string;
  right: string;
};

export type TeamResult = {
  name: string;
  members: string[];
};

export type GenerateGroupRequest = {
  people: string[];
  teams: string[];
  separateRules: string[][];
  sameTeamRules: string[][];
};

export type GenerateGroupResponse = {
  teams: TeamResult[];
};

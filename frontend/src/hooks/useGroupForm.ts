import React from "react";
import { generateGroups } from "../api/groupApi";
import { MESSAGES } from "../constants/messages";
import type { Rule, TeamResult } from "../types/group";

const initialPeople = ["", ""];
const initialTeams = ["", ""];

export function useGroupForm() {
  const [people, setPeople] = React.useState(initialPeople);
  const [teams, setTeams] = React.useState(initialTeams);
  const [separateRules, setSeparateRules] = React.useState<Rule[]>([]);
  const [sameTeamRules, setSameTeamRules] = React.useState<Rule[]>([]);
  const [result, setResult] = React.useState<TeamResult[]>([]);
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  function addPerson() {
    setPeople((current) => [...current, ""]);
  }

  function updatePerson(index: number, value: string) {
    setPeople((current) => updateAt(current, index, value));
  }

  function removePerson(index: number) {
    setPeople((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function addTeam() {
    setTeams((current) => [...current, ""]);
  }

  function updateTeam(index: number, value: string) {
    setTeams((current) => updateAt(current, index, value));
  }

  function removeTeam(index: number) {
    setTeams((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function addSeparateRule() {
    setSeparateRules((current) => [...current, createDefaultRule(people)]);
  }

  function updateSeparateRule(index: number, rule: Rule) {
    setSeparateRules((current) => updateRule(current, index, rule));
  }

  function removeSeparateRule(index: number) {
    setSeparateRules((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function addSameTeamRule() {
    setSameTeamRules((current) => [...current, createDefaultRule(people)]);
  }

  function updateSameTeamRule(index: number, rule: Rule) {
    setSameTeamRules((current) => updateRule(current, index, rule));
  }

  function removeSameTeamRule(index: number) {
    setSameTeamRules((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function reset() {
    setPeople(initialPeople);
    setTeams(initialTeams);
    setSeparateRules([]);
    setSameTeamRules([]);
    setResult([]);
    setError("");
    setIsLoading(false);
  }

  async function submit() {
    setError("");
    setIsLoading(true);
    try {
      const data = await generateGroups({
        people,
        teams,
        separateRules: rulesToPairs(separateRules),
        sameTeamRules: rulesToPairs(sameTeamRules),
      });
      setResult(data.teams);
    } catch (err) {
      setError(err instanceof Error ? err.message : MESSAGES.unknownError);
      setResult([]);
    } finally {
      setIsLoading(false);
    }
  }

  return {
    people,
    teams,
    separateRules,
    sameTeamRules,
    result,
    error,
    isLoading,
    addPerson,
    updatePerson,
    removePerson,
    addTeam,
    updateTeam,
    removeTeam,
    addSeparateRule,
    updateSeparateRule,
    removeSeparateRule,
    addSameTeamRule,
    updateSameTeamRule,
    removeSameTeamRule,
    reset,
    submit,
  };
}

function updateAt(values: string[], index: number, value: string) {
  return values.map((item, itemIndex) => (itemIndex === index ? value : item));
}

function updateRule(rules: Rule[], index: number, rule: Rule) {
  return rules.map((item, itemIndex) => (itemIndex === index ? rule : item));
}

function createDefaultRule(people: string[]): Rule {
  const selectablePeople = people.filter((person) => person.trim() !== "");
  const fallbackLeft = selectablePeople[0] ?? "";
  const fallbackRight = selectablePeople[1] ?? fallbackLeft;

  return { left: fallbackLeft, right: fallbackRight };
}

function rulesToPairs(rules: Rule[]) {
  return rules
    .filter((rule) => rule.left.trim() !== "" && rule.right.trim() !== "")
    .map((rule) => [rule.left, rule.right]);
}

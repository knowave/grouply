import React from "react";
import ReactDOM from "react-dom/client";
import { Plus, Shuffle, Trash2, UsersRound } from "lucide-react";
import "./styles.css";

type Rule = {
  left: string;
  right: string;
};

type TeamResult = {
  name: string;
  members: string[];
};

function App() {
  const [people, setPeople] = React.useState(["", ""]);
  const [teams, setTeams] = React.useState(["", ""]);
  const [separateRules, setSeparateRules] = React.useState<Rule[]>([]);
  const [sameTeamRules, setSameTeamRules] = React.useState<Rule[]>([]);
  const [result, setResult] = React.useState<TeamResult[]>([]);
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  async function generateGroups() {
    setError("");
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:8080/api/v1/groups/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          people,
          teams,
          separateRules: rulesToPairs(separateRules),
          sameTeamRules: rulesToPairs(sameTeamRules),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "팀을 생성할 수 없습니다.");
      }
      setResult(data.teams);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      setResult([]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-ink">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Grouply</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">조건 기반 팀 자동 편성</h1>
            <p className="mt-2 max-w-2xl text-base text-black/60">
              조건만 입력하세요. 팀 구성은 Grouply가 합니다.
            </p>
          </div>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#265d61] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onClick={generateGroups}
          >
            <Shuffle size={18} />
            {result.length > 0 ? "다시 섞기" : "팀 생성"}
          </button>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr_1.35fr]">
          <ListPanel title="People" addLabel="사람 추가" values={people} onChange={setPeople} />
          <ListPanel title="Teams" addLabel="팀 추가" values={teams} onChange={setTeams} />
          <RulePanel
            people={people}
            separateRules={separateRules}
            sameTeamRules={sameTeamRules}
            onSeparateChange={setSeparateRules}
            onSameTeamChange={setSameTeamRules}
          />
        </section>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <section className="pt-1">
          <div className="mb-3 flex items-center gap-2">
            <UsersRound size={20} className="text-brand" />
            <h2 className="text-xl font-bold">Result</h2>
          </div>
          {result.length === 0 ? (
            <div className="flex min-h-36 items-center justify-center rounded-md border border-dashed border-black/20 bg-white/55 px-4 text-center text-sm text-black/50">
              팀 생성 버튼을 누르면 조건을 만족하는 결과가 여기에 표시됩니다.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.map((team) => (
                <article key={team.name} className="overflow-hidden rounded-md border border-black/10 bg-white shadow-sm">
                  <h3 className="border-b border-black/10 bg-[#e8efed] px-4 py-3 font-bold">{team.name}</h3>
                  <ul className="space-y-2 px-4 py-4">
                    {team.members.map((member) => (
                      <li key={member} className="rounded-md bg-[#f6f7f4] px-3 py-2 text-sm font-medium">
                        {member}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function ListPanel({
  title,
  addLabel,
  values,
  onChange,
}: {
  title: string;
  addLabel: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <section className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <button
          className="inline-flex h-9 items-center gap-1 rounded-md border border-black/10 px-3 text-sm font-semibold hover:bg-black/[0.03]"
          onClick={() => onChange([...values, ""])}
        >
          <Plus size={16} />
          {addLabel}
        </button>
      </div>
      <div className="space-y-2">
        {values.map((value, index) => (
          <div key={index} className="flex gap-2">
            <input
              className="h-10 min-w-0 flex-1 rounded-md border border-black/10 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
              value={value}
              placeholder={title === "People" ? "이름" : "팀 이름"}
              onChange={(event) => updateAt(values, index, event.target.value, onChange)}
            />
            <button
              className="grid h-10 w-10 place-items-center rounded-md border border-black/10 text-black/55 hover:bg-black/[0.03]"
              title="삭제"
              onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function RulePanel({
  people,
  separateRules,
  sameTeamRules,
  onSeparateChange,
  onSameTeamChange,
}: {
  people: string[];
  separateRules: Rule[];
  sameTeamRules: Rule[];
  onSeparateChange: (rules: Rule[]) => void;
  onSameTeamChange: (rules: Rule[]) => void;
}) {
  return (
    <section className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-bold">Rules</h2>
      <RuleEditor
        title="분리 조건"
        people={people}
        rules={separateRules}
        onChange={onSeparateChange}
        emptyLabel="절대 같은 팀이 되면 안 되는 두 사람"
      />
      <div className="my-4 h-px bg-black/10" />
      <RuleEditor
        title="같은 팀 조건"
        people={people}
        rules={sameTeamRules}
        onChange={onSameTeamChange}
        emptyLabel="반드시 같은 팀이어야 하는 두 사람"
      />
    </section>
  );
}

function RuleEditor({
  title,
  people,
  rules,
  emptyLabel,
  onChange,
}: {
  title: string;
  people: string[];
  rules: Rule[];
  emptyLabel: string;
  onChange: (rules: Rule[]) => void;
}) {
  const selectablePeople = people.filter((person) => person.trim() !== "");
  const fallbackLeft = selectablePeople[0] ?? "";
  const fallbackRight = selectablePeople[1] ?? fallbackLeft;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-black/70">{title}</h3>
        <button
          className="inline-flex h-8 items-center gap-1 rounded-md border border-black/10 px-2 text-xs font-semibold hover:bg-black/[0.03]"
          onClick={() => onChange([...rules, { left: fallbackLeft, right: fallbackRight }])}
        >
          <Plus size={14} />
          조건 추가
        </button>
      </div>
      {rules.length === 0 ? (
        <p className="rounded-md bg-[#f6f7f4] px-3 py-3 text-sm text-black/45">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule, index) => (
            <div key={index} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
              <PersonSelect
                people={selectablePeople}
                value={rule.left}
                onChange={(value) => updateRule(rules, index, { ...rule, left: value }, onChange)}
              />
              <span className="text-sm font-bold text-black/35">↔</span>
              <PersonSelect
                people={selectablePeople}
                value={rule.right}
                onChange={(value) => updateRule(rules, index, { ...rule, right: value }, onChange)}
              />
              <button
                className="grid h-10 w-10 place-items-center rounded-md border border-black/10 text-black/55 hover:bg-black/[0.03]"
                title="삭제"
                onClick={() => onChange(rules.filter((_, itemIndex) => itemIndex !== index))}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PersonSelect({
  people,
  value,
  onChange,
}: {
  people: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      className="h-10 min-w-0 rounded-md border border-black/10 bg-white px-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {people.map((person) => (
        <option key={person} value={person}>
          {person}
        </option>
      ))}
    </select>
  );
}

function updateAt(values: string[], index: number, value: string, onChange: (values: string[]) => void) {
  onChange(values.map((item, itemIndex) => (itemIndex === index ? value : item)));
}

function updateRule(rules: Rule[], index: number, rule: Rule, onChange: (rules: Rule[]) => void) {
  onChange(rules.map((item, itemIndex) => (itemIndex === index ? rule : item)));
}

function rulesToPairs(rules: Rule[]) {
  return rules
    .filter((rule) => rule.left.trim() !== "" && rule.right.trim() !== "")
    .map((rule) => [rule.left, rule.right]);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

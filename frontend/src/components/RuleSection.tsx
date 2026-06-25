import { CircleHelp, Plus, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MESSAGES } from "../constants/messages";
import type { Rule } from "../types/group";

type RuleTone = "red" | "green";

type RuleSectionProps = {
  title: string;
  description: string;
  tooltip: string;
  example: string;
  addLabel: string;
  emptyLabel: string;
  icon: LucideIcon;
  tone: RuleTone;
  people: string[];
  rules: Rule[];
  onAdd: () => void;
  onUpdate: (index: number, rule: Rule) => void;
  onRemove: (index: number) => void;
};

const ruleToneStyles = {
  red: {
    panel: "border-red-300 bg-red-50",
    icon: "text-red-600",
    button: "border-red-200 bg-white/80 text-red-700 hover:bg-red-100",
    empty: "border-red-200 bg-white/55",
  },
  green: {
    panel: "border-green-300 bg-green-50",
    icon: "text-green-700",
    button: "border-green-200 bg-white/80 text-green-700 hover:bg-green-100",
    empty: "border-green-200 bg-white/55",
  },
};

export function RuleSection({
  title,
  description,
  tooltip,
  example,
  addLabel,
  emptyLabel,
  icon: Icon,
  tone,
  people,
  rules,
  onAdd,
  onUpdate,
  onRemove,
}: RuleSectionProps) {
  const selectablePeople = people.filter((person) => person.trim() !== "");
  const styles = ruleToneStyles[tone];

  return (
    <div className={`rounded-md border p-3 ${styles.panel}`}>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Icon size={18} className={styles.icon} />
            <h3 className="text-sm font-bold text-black/75">{title}</h3>
            <span title={tooltip}>
              <CircleHelp size={15} className="text-black/35" aria-label={tooltip} />
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-black/50">{description}</p>
        </div>
        <button
          className={`inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md border px-2 text-xs font-semibold transition ${styles.button}`}
          onClick={onAdd}
        >
          <Plus size={14} />
          {addLabel}
        </button>
      </div>
      {rules.length === 0 ? (
        <div className={`rounded-md border border-dashed px-3 py-3 text-sm ${styles.empty}`}>
          <p className="font-medium text-black/50">{emptyLabel}</p>
          <p className="mt-1 text-xs text-black/40">{example}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule, index) => (
            <div key={index} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
              <PersonSelect
                people={selectablePeople}
                value={rule.left}
                onChange={(value) => onUpdate(index, { ...rule, left: value })}
              />
              <span className="text-sm font-bold text-black/35">↔</span>
              <PersonSelect
                people={selectablePeople}
                value={rule.right}
                onChange={(value) => onUpdate(index, { ...rule, right: value })}
              />
              <button
                className="grid h-10 w-10 place-items-center rounded-md border border-black/10 text-black/55 hover:bg-black/[0.03]"
                title={MESSAGES.delete}
                onClick={() => onRemove(index)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      {rules.length > 0 && <p className="mt-2 text-xs text-black/40">{example}</p>}
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

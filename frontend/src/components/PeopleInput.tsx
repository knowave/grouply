import { Plus, Trash2 } from "lucide-react";
import { MESSAGES } from "../constants/messages";

type PeopleInputProps = {
  people: string[];
  onAdd: () => void;
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
};

export function PeopleInput({ people, onAdd, onUpdate, onRemove }: PeopleInputProps) {
  return (
    <section className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">{MESSAGES.peopleTitle}</h2>
        <button
          className="inline-flex h-9 items-center gap-1 rounded-md border border-black/10 px-3 text-sm font-semibold hover:bg-black/[0.03]"
          onClick={onAdd}
        >
          <Plus size={16} />
          {MESSAGES.addPerson}
        </button>
      </div>
      <div className="space-y-2">
        {people.map((person, index) => (
          <div key={index} className="flex gap-2">
            <input
              className="h-10 min-w-0 flex-1 rounded-md border border-black/10 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
              value={person}
              placeholder={MESSAGES.personPlaceholder}
              onChange={(event) => onUpdate(index, event.target.value)}
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
    </section>
  );
}

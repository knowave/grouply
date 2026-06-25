import { UsersRound } from "lucide-react";
import { MESSAGES } from "../constants/messages";
import type { TeamResult } from "../types/group";

type ResultViewProps = {
  teams: TeamResult[];
};

export function ResultView({ teams }: ResultViewProps) {
  return (
    <section className="pt-1">
      <div className="mb-3 flex items-center gap-2">
        <UsersRound size={20} className="text-brand" />
        <h2 className="text-xl font-bold">{MESSAGES.resultTitle}</h2>
      </div>
      {teams.length === 0 ? (
        <div className="flex min-h-36 items-center justify-center rounded-md border border-dashed border-black/20 bg-white/55 px-4 text-center text-sm text-black/50">
          {MESSAGES.emptyResult}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
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
  );
}

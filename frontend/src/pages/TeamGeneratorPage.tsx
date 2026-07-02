import { Ban, Handshake, Shuffle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { PeoplePicker } from "../components/PeoplePicker";
import { ResultView } from "../components/ResultView";
import { RuleSection } from "../components/RuleSection";
import { TeamInput } from "../components/TeamInput";
import { MESSAGES } from "../constants/messages";
import { useGroupForm } from "../hooks/useGroupForm";

export function TeamGeneratorPage() {
  const groupForm = useGroupForm();

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-ink">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Grouply</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{MESSAGES.appTitle}</h1>
            <p className="mt-2 max-w-2xl text-base text-black/60">{MESSAGES.appDescription}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/"
              className="inline-flex h-11 items-center gap-2 rounded-md border border-black/10 px-5 text-sm font-semibold hover:bg-black/[0.03]"
            >
              <ArrowLeft size={16} />
              {MESSAGES.backToUsersButton}
            </Link>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#265d61] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={groupForm.isLoading}
              onClick={groupForm.submit}
            >
              <Shuffle size={18} />
              {groupForm.result.length > 0 ? MESSAGES.regenerateButton : MESSAGES.generateButton}
            </button>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr_1.35fr]">
          <PeoplePicker
            selectedPeople={groupForm.people}
            onChange={groupForm.setPeople}
          />
          <TeamInput
            teams={groupForm.teams}
            onAdd={groupForm.addTeam}
            onUpdate={groupForm.updateTeam}
            onRemove={groupForm.removeTeam}
          />
          <section className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-bold">{MESSAGES.rulesTitle}</h2>
            <div className="space-y-3">
              <RuleSection
                title={MESSAGES.separateTitle}
                description={MESSAGES.separateDescription}
                tooltip={MESSAGES.separateTooltip}
                example={MESSAGES.separateExample}
                addLabel={MESSAGES.separateAdd}
                emptyLabel={MESSAGES.separateEmpty}
                icon={Ban}
                tone="red"
                people={groupForm.people}
                rules={groupForm.separateRules}
                onAdd={groupForm.addSeparateRule}
                onUpdate={groupForm.updateSeparateRule}
                onRemove={groupForm.removeSeparateRule}
              />
              <RuleSection
                title={MESSAGES.sameTeamTitle}
                description={MESSAGES.sameTeamDescription}
                tooltip={MESSAGES.sameTeamTooltip}
                example={MESSAGES.sameTeamExample}
                addLabel={MESSAGES.sameTeamAdd}
                emptyLabel={MESSAGES.sameTeamEmpty}
                icon={Handshake}
                tone="green"
                people={groupForm.people}
                rules={groupForm.sameTeamRules}
                onAdd={groupForm.addSameTeamRule}
                onUpdate={groupForm.updateSameTeamRule}
                onRemove={groupForm.removeSameTeamRule}
              />
            </div>
          </section>
        </section>

        {groupForm.error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {groupForm.error}
          </div>
        )}

        <ResultView teams={groupForm.result} />
      </section>
    </main>
  );
}

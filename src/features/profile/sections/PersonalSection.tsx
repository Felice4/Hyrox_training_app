import { SingleChoiceChips } from '@/components/ui/ChoiceChips'
import { TextField } from '@/components/ui/TextField'
import { SEXES, SEX_LABELS } from '@/domain/profile/vocabulary'
import { toLocalIsoDate } from '@/lib/date'
import type { SectionProps } from './types'

const SEX_OPTIONS = SEXES.map((sex) => ({ value: sex, label: SEX_LABELS[sex] }))

function Unit({ children }: { children: string }) {
  return <span className="mr-3 text-sm text-fg-muted">{children}</span>
}

interface PersonalSectionProps extends SectionProps {
  weightLabel?: string
  weightHint?: string | undefined
  bodyFatHint?: string | undefined
}

export function PersonalSection({
  draft,
  errors,
  update,
  weightLabel = 'Körpergewicht',
  weightHint,
  bodyFatHint,
}: PersonalSectionProps) {
  return (
    <div className="flex flex-col gap-5">
      <TextField
        label="Wie dürfen wir dich nennen?"
        autoComplete="given-name"
        value={draft.displayName}
        onChange={(e) => update({ displayName: e.target.value })}
        error={errors.displayName}
      />
      <TextField
        label="Geburtsdatum"
        type="date"
        max={toLocalIsoDate()}
        value={draft.birthDate}
        onChange={(e) => update({ birthDate: e.target.value })}
        error={errors.birthDate}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Körpergröße"
          inputMode="decimal"
          placeholder="z. B. 180"
          value={draft.heightCm}
          onChange={(e) => update({ heightCm: e.target.value })}
          error={errors.heightCm}
          trailing={<Unit>cm</Unit>}
        />
        <TextField
          label={weightLabel}
          inputMode="decimal"
          placeholder="z. B. 80,5"
          value={draft.weightKg}
          onChange={(e) => update({ weightKg: e.target.value })}
          error={errors.weightKg}
          hint={weightHint}
          trailing={<Unit>kg</Unit>}
        />
      </div>
      <TextField
        label="Körperfettanteil (optional)"
        inputMode="decimal"
        placeholder="nur falls bekannt"
        value={draft.bodyFatPct}
        onChange={(e) => update({ bodyFatPct: e.target.value })}
        error={errors.bodyFatPct}
        hint={bodyFatHint}
        trailing={<Unit>%</Unit>}
      />
      <SingleChoiceChips
        label="Geschlecht (optional)"
        options={SEX_OPTIONS}
        value={draft.sex}
        onChange={(sex) => update({ sex })}
        allowDeselect
        onClear={() => update({ sex: '' })}
        error={errors.sex}
      />
      <p className="text-xs text-fg-muted">
        Körperdaten dienen nur als Orientierung. Trainingsgewichte schlägt die App ausschließlich
        auf Basis deiner tatsächlichen Leistungen vor.
      </p>
    </div>
  )
}

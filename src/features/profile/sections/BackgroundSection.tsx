import { SingleChoiceChips } from '@/components/ui/ChoiceChips'
import { OptionCards } from '@/components/ui/OptionCards'
import { TextArea } from '@/components/ui/TextArea'
import { TextField } from '@/components/ui/TextField'
import {
  EXPERIENCE_DURATIONS,
  EXPERIENCE_DURATION_LABELS,
  HYROX_EXPERIENCES,
  HYROX_EXPERIENCE_LABELS,
  TRAINING_LEVELS,
  TRAINING_LEVEL_HINTS,
  TRAINING_LEVEL_LABELS,
} from '@/domain/profile/vocabulary'
import { MANUAL_RECORD_PRESETS } from '@/domain/records/presets'
import type { SectionProps } from './types'

const LEVEL_OPTIONS = TRAINING_LEVELS.map((level) => ({
  value: level,
  label: TRAINING_LEVEL_LABELS[level],
  description: TRAINING_LEVEL_HINTS[level],
}))
const HYROX_OPTIONS = HYROX_EXPERIENCES.map((v) => ({
  value: v,
  label: HYROX_EXPERIENCE_LABELS[v],
}))
const DURATION_OPTIONS = EXPERIENCE_DURATIONS.map((v) => ({
  value: v,
  label: EXPERIENCE_DURATION_LABELS[v],
}))

const RECORD_PLACEHOLDERS = {
  kg: 'kg, z. B. 120',
  reps: 'Anzahl, z. B. 10',
  sec: 'Zeit, z. B. 4:05',
}

export function BackgroundSection({ draft, errors, update }: SectionProps) {
  return (
    <div className="flex flex-col gap-6">
      <OptionCards
        label="Trainingsniveau"
        options={LEVEL_OPTIONS}
        value={draft.trainingLevel}
        onChange={(trainingLevel) => update({ trainingLevel })}
        error={errors.trainingLevel}
      />
      <SingleChoiceChips
        label="Erfahrung mit HYROX"
        options={HYROX_OPTIONS}
        value={draft.hyroxExperience}
        onChange={(hyroxExperience) => update({ hyroxExperience })}
        error={errors.hyroxExperience}
      />
      <SingleChoiceChips
        label="Erfahrung mit Krafttraining"
        options={DURATION_OPTIONS}
        value={draft.strengthExperience}
        onChange={(strengthExperience) => update({ strengthExperience })}
        error={errors.strengthExperience}
      />
      <SingleChoiceChips
        label="Erfahrung mit Ausdauertraining"
        options={DURATION_OPTIONS}
        value={draft.enduranceExperience}
        onChange={(enduranceExperience) => update({ enduranceExperience })}
        error={errors.enduranceExperience}
      />
      <TextArea
        label="Aktuelle Leistungsfähigkeit (optional)"
        placeholder="z. B. laufe 3× pro Woche, aktuell 5 km in ca. 24 min"
        value={draft.fitnessNotes}
        onChange={(e) => update({ fitnessNotes: e.target.value })}
        error={errors.fitnessNotes}
      />

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="font-semibold">Bekannte Bestleistungen (optional)</h3>
          <p className="text-sm text-fg-muted">
            Trag nur ein, was du sicher weißt. Die App ergänzt Bestleistungen später automatisch aus
            deinen Trainings.
          </p>
        </div>
        <TextField
          label="HYROX-Bestzeit"
          inputMode="numeric"
          placeholder="h:mm:ss, z. B. 1:25:00"
          value={draft.hyroxBestTime}
          onChange={(e) => update({ hyroxBestTime: e.target.value })}
          error={errors.hyroxBestTime}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {MANUAL_RECORD_PRESETS.map((preset) => (
            <TextField
              key={preset.key}
              label={preset.label}
              inputMode={preset.unit === 'sec' ? 'numeric' : 'decimal'}
              placeholder={RECORD_PLACEHOLDERS[preset.unit]}
              value={draft.records[preset.key] ?? ''}
              onChange={(e) =>
                update({ records: { ...draft.records, [preset.key]: e.target.value } })
              }
              error={errors[`records.${preset.key}`]}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

import { Button } from '@/components/ui/Button'
import { MultiChoiceChips } from '@/components/ui/ChoiceChips'
import { Stepper } from '@/components/ui/Stepper'
import { TextArea } from '@/components/ui/TextArea'
import {
  EQUIPMENT,
  EQUIPMENT_LABELS,
  STRESS_REGIONS,
  STRESS_REGION_LABELS,
  type Equipment,
} from '@/data/exercises/vocabulary'
import { WEEKDAYS, WEEKDAY_SHORT_LABELS } from '@/domain/profile/vocabulary'
import { EQUIPMENT_GROUPS } from '../equipmentGroups'
import type { SectionProps } from './types'

const WEEKDAY_OPTIONS = WEEKDAYS.map((day) => ({ value: day, label: WEEKDAY_SHORT_LABELS[day] }))
const REGION_OPTIONS = STRESS_REGIONS.map((r) => ({ value: r, label: STRESS_REGION_LABELS[r] }))

export function ConditionsSection({ draft, errors, update }: SectionProps) {
  /** Auswahl einer Gruppe ändern, ohne die übrigen Geräte anzutasten. */
  const setGroup = (groupItems: readonly Equipment[], selected: Equipment[]) => {
    const others = draft.availableEquipment.filter((e) => !groupItems.includes(e))
    update({ availableEquipment: EQUIPMENT.filter((e) => [...others, ...selected].includes(e)) })
  }

  return (
    <div className="flex flex-col gap-7">
      <Stepper
        label="Trainingstage pro Woche"
        value={draft.trainingDaysPerWeek}
        onChange={(trainingDaysPerWeek) => update({ trainingDaysPerWeek })}
        min={1}
        max={7}
      />
      <MultiChoiceChips
        label="Bevorzugte Trainingstage (optional)"
        hint="Ohne Auswahl verteilt die App die Einheiten selbst über die Woche."
        options={WEEKDAY_OPTIONS}
        values={draft.preferredWeekdays}
        onChange={(preferredWeekdays) => update({ preferredWeekdays })}
        error={errors.preferredWeekdays}
      />
      <Stepper
        label="Übliche Trainingsdauer"
        value={draft.defaultDurationMin}
        onChange={(defaultDurationMin) => update({ defaultDurationMin })}
        min={20}
        max={150}
        step={5}
        unit="min"
      />

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="font-semibold">Verfügbare Geräte</h3>
            <p className="text-sm text-fg-muted">
              {draft.availableEquipment.length} von {EQUIPMENT.length} ausgewählt
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="min-h-10 px-3 text-sm"
              onClick={() => update({ availableEquipment: [...EQUIPMENT] })}
            >
              Alle
            </Button>
            <Button
              variant="ghost"
              className="min-h-10 px-3 text-sm"
              onClick={() => update({ availableEquipment: [] })}
            >
              Keine
            </Button>
          </div>
        </div>
        {EQUIPMENT_GROUPS.map((group) => (
          <MultiChoiceChips
            key={group.label}
            label={group.label}
            options={group.items.map((item) => ({ value: item, label: EQUIPMENT_LABELS[item] }))}
            values={draft.availableEquipment.filter((e) => group.items.includes(e))}
            onChange={(selected) => setGroup(group.items, selected)}
          />
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <MultiChoiceChips
          label="Einschränkungen oder Beschwerden (optional)"
          hint="Übungen, die diese Bereiche stark belasten, werden gemieden. Das ersetzt keine ärztliche Abklärung."
          options={REGION_OPTIONS}
          values={draft.limitationRegions}
          onChange={(limitationRegions) => update({ limitationRegions })}
        />
        <TextArea
          label="Notizen zu Einschränkungen (optional)"
          value={draft.limitationNotes}
          onChange={(e) => update({ limitationNotes: e.target.value })}
          error={errors.limitationNotes}
        />
      </section>
    </div>
  )
}

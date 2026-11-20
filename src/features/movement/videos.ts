/**
 * Videos des Movement Lab (docs/MOVEMENT.md §6): Slug der Übung → Datei im privaten
 * Bucket „movement-videos". Videos trägt nur der Entwickler ein, nie die App.
 *
 * Neues Video: komprimieren (§6), mit der Supabase-CLI hochladen und hier eintragen.
 * Dateiname = Slug + Version, z. B. 'movement-hip-switch-1.mp4'. Für ein neues Video
 * derselben Übung die Version erhöhen – so lädt das Handy die neue Fassung statt der
 * gespeicherten.
 */
export const MOVEMENT_VIDEOS: Readonly<Record<string, string>> = {
  'movement-burpee-plate-overhead': 'movement-burpee-plate-overhead-1.mp4',
  'movement-typewriter-pushup': 'movement-typewriter-pushup-1.mp4',
  'movement-deep-squat-thoracic-rotation': 'movement-deep-squat-thoracic-rotation-1.mp4',
  'movement-180-squat-jump': 'movement-180-squat-jump-1.mp4',
  'movement-spiderman-pushup': 'movement-spiderman-pushup-1.mp4',
  'movement-kneeling-squat-dumbbell-rotation': 'movement-kneeling-squat-dumbbell-rotation-1.mp4',
  'movement-squat-one-arm-kick-up': 'movement-squat-one-arm-kick-up-1.mp4',
  'movement-deep-squat-thoracic-mobility': 'movement-deep-squat-thoracic-mobility-1.mp4',
  'movement-pushup-downward-dog': 'movement-pushup-downward-dog-1.mp4',
  'movement-pushup-sit-through': 'movement-pushup-sit-through-1.mp4',
  'movement-hindu-pushup': 'movement-hindu-pushup-1.mp4',
  'movement-lunge-dumbbell-press': 'movement-lunge-dumbbell-press-1.mp4',
  'movement-wide-stance-thoracic-rotation': 'movement-wide-stance-thoracic-rotation-1.mp4',
  'movement-worlds-greatest-stretch-rotation': 'movement-worlds-greatest-stretch-rotation-1.mp4',
  'movement-seated-straddle-leg-lifts': 'movement-seated-straddle-leg-lifts-1.mp4',
  'movement-deep-squat-kneeling-hip-switch': 'movement-deep-squat-kneeling-hip-switch-1.mp4',
  'movement-seated-straddle-rotational-reach': 'movement-seated-straddle-rotational-reach-1.mp4',
  'movement-sumo-squat-rotational-lunge': 'movement-sumo-squat-rotational-lunge-1.mp4',
  'movement-seated-alternating-hip-rotations': 'movement-seated-alternating-hip-rotations-1.mp4',
  'movement-90-90-hip-switch-forward-fold': 'movement-90-90-hip-switch-forward-fold-1.mp4',
  'movement-walkout-pike-pushup-flow': 'movement-walkout-pike-pushup-flow-1.mp4',
}

export function movementVideoFile(slug: string): string | undefined {
  return Object.hasOwn(MOVEMENT_VIDEOS, slug) ? MOVEMENT_VIDEOS[slug] : undefined
}

export function hasMovementVideo(slug: string): boolean {
  return movementVideoFile(slug) !== undefined
}

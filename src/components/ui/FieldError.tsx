/** Fehlermeldung unter einem Eingabeelement. */
export function FieldError({ id, message }: { id?: string; message: string | undefined }) {
  if (!message) return null
  return (
    <p id={id} className="text-sm text-danger">
      {message}
    </p>
  )
}

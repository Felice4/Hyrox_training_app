/** Minimal benötigte Felder eines Supabase-Auth-Fehlers (AuthError). */
export interface AuthErrorLike {
  code?: string | undefined
  status?: number | undefined
  name?: string | undefined
}

/** Übersetzt Supabase-Anmeldefehler in verständliche deutsche Meldungen. */
export function toGermanAuthError(error: AuthErrorLike): string {
  if (error.name === 'AuthRetryableFetchError' || error.status === 0) {
    return 'Keine Verbindung zum Server. Bitte Internetverbindung prüfen und erneut versuchen.'
  }
  switch (error.code) {
    case 'invalid_credentials':
      return 'E-Mail oder Passwort ist falsch.'
    case 'email_not_confirmed':
      return 'Die E-Mail-Adresse ist noch nicht bestätigt.'
    case 'user_banned':
      return 'Dieses Konto ist gesperrt.'
    case 'over_request_rate_limit':
      return 'Zu viele Anmeldeversuche. Bitte einige Minuten warten.'
    default:
      return 'Anmeldung fehlgeschlagen. Bitte später erneut versuchen.'
  }
}

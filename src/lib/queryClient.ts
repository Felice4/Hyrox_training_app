import { QueryClient } from '@tanstack/react-query'

/**
 * Zentraler Cache für Serverdaten (Supabase).
 * Beim Zurückkehren in die App werden Daten neu geladen – so sind Änderungen
 * von einem anderen Gerät (Laptop ↔ Smartphone) sichtbar.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})

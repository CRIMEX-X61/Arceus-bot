export const startedAt = Date.now()

export function getUptimeMs() {
  return Date.now() - startedAt
}

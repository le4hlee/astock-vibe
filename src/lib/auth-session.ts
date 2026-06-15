export const SESSION_MAX_AGE = 24 * 60 * 60; // 1 day
export const REMEMBER_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export function sessionMaxAge(rememberMe: boolean): number {
  return rememberMe ? REMEMBER_MAX_AGE : SESSION_MAX_AGE;
}

export function parseRememberMe(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

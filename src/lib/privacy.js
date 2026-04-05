// Returns "••••••" if privacyMode is true, otherwise formats the value
export function privateValue(value, privacyMode, formatter = (v) => v) {
  if (privacyMode) return '••••••'
  return formatter(value)
}

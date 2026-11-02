export function isVulnerableOutput(text?: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const upper = text.toUpperCase();

  // Negative indicators: override positive matches
  if (upper.includes('NOT VULNERABLE') || upper.includes("COULDN'T FIND ANY") || upper.includes("COULD NOT FIND ANY")) {
    return false;
  }

  // Positive indicators
  if (upper.includes('STATE: VULNERABLE') || upper.includes('STATE: LIKELY VULNERABLE')) {
    return true;
  }

  // Line starting with VULNERABLE:
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmedUpper = line.trim().toUpperCase();
    if (trimmedUpper.startsWith('VULNERABLE:')) {
      return true;
    }
  }

  return false;
}

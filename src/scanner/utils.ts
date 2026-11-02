import path from 'path';

export function getDataDir(): string {
  return path.resolve(process.env.ULTRA_DATA_DIR || 'data');
}

export function getOutputsDir(): string {
  return path.resolve(getDataDir(), 'outputs');
}

export function resolveOutputPath(id: string): string | null {
  if (!id || typeof id !== 'string') return null;
  const regex = /^[A-Za-z0-9-]{1,64}$/;
  if (!regex.test(id)) return null;

  const outputsDir = getOutputsDir();
  const resolvedPath = path.resolve(outputsDir, `${id}.xml`);

  if (!resolvedPath.startsWith(outputsDir + path.sep)) {
    return null;
  }

  return resolvedPath;
}

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

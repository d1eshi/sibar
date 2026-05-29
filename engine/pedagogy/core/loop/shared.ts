let fallbackCounter = 0;

function localRandomIdSegment(): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === "function") {
    return randomUUID.call(globalThis.crypto).slice(0, 8);
  }

  fallbackCounter += 1;
  let hash = 0x811c9dc5;
  const value = `pedagogy-loop|${fallbackCounter}`;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function uniqueId(prefix: string): string {
  return `${prefix}-${localRandomIdSegment()}`;
}

export function now(): string {
  return new Date().toISOString();
}

export function addDays(timestamp: string, days: number): string {
  return new Date(new Date(timestamp).getTime() + days * 86400000).toISOString();
}

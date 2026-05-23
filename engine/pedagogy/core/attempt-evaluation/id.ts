let fallbackCounter = 0;

export function localRandomIdSegment(): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === "function") {
    return randomUUID.call(globalThis.crypto).slice(0, 8);
  }

  fallbackCounter += 1;
  let hash = 0x811c9dc5;
  const value = `attempt-evaluation|${fallbackCounter}`;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

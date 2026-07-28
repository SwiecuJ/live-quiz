const AVATAR_EMOJIS = [
  "🦄", "🐸", "🦖", "🐵", "🦊", "🐼", "🐧", "🦁", "🐯", "🐨",
  "🦥", "🐙", "🦋", "🦋", "🐝", "🔥", "👾", "🤖", "🎃", "🍕",
  "🍩", "🎮", "🎧", "⚡", "🌈", "🍭", "🥳", "😎", "🤪", "👽",
] as const;

/** Deterministic per-player emoji so avatars stay stable across reloads. */
export function avatarFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_EMOJIS[hash % AVATAR_EMOJIS.length];
}

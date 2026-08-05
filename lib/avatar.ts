// One face per person. 🤖 is deliberately not in here -- Mafia uses it to
// mark a seat filled by the app, and a human wearing it would read as a bot.
const AVATAR_EMOJIS = [
  "🦄", "🐸", "🦖", "🐵", "🦊", "🐼", "🐧", "🦁", "🐯", "🐨",
  "🦥", "🐙", "🦋", "🐝", "🦉", "🦆", "🐢", "🐬", "🦔", "🐷",
  "🔥", "👾", "🎃", "🍕", "🍩", "🎮", "🎧", "⚡", "🌈", "🍭",
  "🥳", "😎", "🤪", "👽", "🌵", "🍄", "🚀", "🎩", "🧊", "🍿",
  "🥑", "🐳", "🦩",
] as const;

function hashOf(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Deterministic per-player emoji so avatars stay stable across reloads. */
export function avatarFor(id: string): string {
  return AVATAR_EMOJIS[hashOf(id) % AVATAR_EMOJIS.length];
}

/**
 * The same, but with no two people at one table sharing a face.
 *
 * Hashing alone collides -- with forty-odd emoji and eight players it's
 * better than even odds that two of them match -- and identical avatars
 * defeat the whole point, which is telling people apart at a glance. Worse
 * in Mafia, where the avatar is on the tile you vote with.
 *
 * Everyone starts at their own hash and takes the next free slot. The ids
 * are sorted first, so the answer depends only on who is at the table and
 * not on the order a particular screen happens to list them in -- the host
 * sorts by score, the lobby by join time, and both have to agree about who
 * is the fox.
 *
 * The cost is that somebody joining can bump another player's face, since
 * they may sort ahead of them. That only happens in the lobby: nobody joins
 * a game already in progress.
 */
export function avatarsFor(ids: readonly string[]): (id: string) => string {
  const taken = new Set<string>();
  const byId = new Map<string, string>();

  for (const id of [...ids].sort()) {
    if (byId.has(id)) continue;
    const start = hashOf(id) % AVATAR_EMOJIS.length;
    let emoji = AVATAR_EMOJIS[start];
    // Past the end of the pool everyone would just keep the hashed emoji;
    // that needs more players than any party has phones.
    for (let step = 1; taken.has(emoji) && step < AVATAR_EMOJIS.length; step++) {
      emoji = AVATAR_EMOJIS[(start + step) % AVATAR_EMOJIS.length];
    }
    taken.add(emoji);
    byId.set(id, emoji);
  }

  return (id) => byId.get(id) ?? avatarFor(id);
}

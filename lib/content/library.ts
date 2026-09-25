async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function redisCommand(command: (string | number)[]): Promise<unknown> {
  const config = redisConfig();
  if (!config) throw new Error("no redis configured");
  const res = await withTimeout(
    (signal) =>
      fetch(config.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(command),
        signal,
      }),
    8000
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`Redis error: ${JSON.stringify(json)}`);
  return json.result;
}

export type LibraryAsset = {
  id: string;
  base64: string; // JPEG/PNG, base64 — video isn't stored here, same reasoning as elsewhere in Content Studio
  label: string;
  tags: string[];
  createdAt: string;
  timesUsed: number;
  lastUsedAt?: string;
};

// Same in-memory-fallback pattern as lib/content/scheduler.ts.
const memoryStore = new Map<string, LibraryAsset>();

export function libraryBackend(): "redis" | "memory" {
  return redisConfig() ? "redis" : "memory";
}

export async function listLibraryAssets(): Promise<LibraryAsset[]> {
  if (!redisConfig()) {
    return [...memoryStore.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const ids = (await redisCommand(["SMEMBERS", "content:library:index"])) as string[];
  if (!ids || ids.length === 0) return [];
  const assets = await Promise.all(
    ids.map(async (id) => {
      const raw = (await redisCommand(["GET", `content:library:${id}`])) as string | null;
      return raw ? (JSON.parse(raw) as LibraryAsset) : null;
    })
  );
  return assets.filter((a): a is LibraryAsset => a !== null).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveLibraryAsset(asset: LibraryAsset): Promise<void> {
  if (!redisConfig()) {
    memoryStore.set(asset.id, asset);
    return;
  }
  await redisCommand(["SET", `content:library:${asset.id}`, JSON.stringify(asset)]);
  await redisCommand(["SADD", "content:library:index", asset.id]);
}

export async function deleteLibraryAsset(id: string): Promise<void> {
  if (!redisConfig()) {
    memoryStore.delete(id);
    return;
  }
  await redisCommand(["DEL", `content:library:${id}`]);
  await redisCommand(["SREM", "content:library:index", id]);
}

export async function touchLibraryAsset(id: string): Promise<void> {
  const assets = await listLibraryAssets();
  const asset = assets.find((a) => a.id === id);
  if (!asset) return;
  asset.timesUsed += 1;
  asset.lastUsedAt = new Date().toISOString();
  await saveLibraryAsset(asset);
}

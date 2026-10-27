// Server only. Times the steps of one request for a standard `Server-Timing` header:
// step names and whole milliseconds, plus a fixed word or two. Never put what guests
// type, ids or filters in here.

/** When this module was loaded; a small `instance` value on every request means the server reloads it. */
const loadedAt = Date.now();

type Entry = { name: string; ms: number; desc?: string };

export function createTimer() {
  const started = Date.now();
  const entries: Entry[] = [];

  const mark = (name: string, ms: number, desc?: string) => {
    entries.push({ name, ms: Math.round(ms), desc });
  };

  return {
    mark,
    /** Runs `fn` and records how long it took, even when it throws. */
    async time<T>(name: string, fn: () => Promise<T>, desc?: (result: T) => string): Promise<T> {
      const start = Date.now();
      try {
        const result = await fn();
        mark(name, Date.now() - start, desc?.(result));
        return result;
      } catch (error) {
        mark(name, Date.now() - start, "error");
        throw error;
      }
    },
    /** The header value, ending with `instance` and `total`. */
    header() {
      const all = [...entries, { name: "instance", ms: started - loadedAt }, { name: "total", ms: Date.now() - started }];
      return all
        .map(({ name, ms, desc }) => `${name.replace(/[^a-z]/g, "")};dur=${Math.round(ms)}${desc ? `;desc="${desc.replace(/[^a-z ]/g, "")}"` : ""}`)
        .join(", ");
    },
    /** One line for the dev log, e.g. `session=40 cities=0(hit) … total=612`. */
    summary() {
      return [...entries, { name: "total", ms: Date.now() - started }]
        .map(({ name, ms, desc }: Entry) => `${name}=${Math.round(ms)}${desc ? `(${desc})` : ""}`)
        .join(" ");
    },
  };
}

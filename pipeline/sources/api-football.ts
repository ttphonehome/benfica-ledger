import { QUOTA_RESERVE } from "../config";

// Minimal API-Football v3 client: one request at a time, under 10 per
// minute, stops before the daily quota runs out. The API answers HTTP 200
// with an "errors" object for plan limits, so those are surfaced as values.

export type ApiResult<T> =
  | { ok: true; response: T; paging: { current: number; total: number } }
  | { ok: false; kind: "plan" | "quota" | "error"; message: string };

export class QuotaExhausted extends Error {}

export class ApiFootball {
  private last = 0;
  remaining: number | null = null;
  calls = 0;

  constructor(
    private key: string,
    private minIntervalMs = 6500,
  ) {}

  async get<T = unknown>(path: string, params: Record<string, string | number> = {}): Promise<ApiResult<T>> {
    if (this.remaining != null && this.remaining <= QUOTA_RESERVE) {
      throw new QuotaExhausted(`Stopping with ${this.remaining} requests left today`);
    }
    const wait = this.last + this.minIntervalMs - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.last = Date.now();
    this.calls++;

    const url = `https://v3.football.api-sports.io${path}?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}`;
    let res: Response;
    try {
      res = await fetch(url, { headers: { "x-apisports-key": this.key } });
    } catch (err) {
      return { ok: false, kind: "error", message: `Network error for ${path}: ${(err as Error).message}` };
    }
    const left = res.headers.get("x-ratelimit-requests-remaining");
    if (left != null) this.remaining = Number(left);
    if (!res.ok) return { ok: false, kind: "error", message: `HTTP ${res.status} for ${path}` };
    const body = (await res.json()) as { errors?: Record<string, string> | unknown[]; response: T; paging: { current: number; total: number } };
    const errors = body.errors && !Array.isArray(body.errors) ? body.errors : null;
    if (errors && Object.keys(errors).length) {
      const message = Object.values(errors).join("; ");
      const kind = "plan" in errors ? "plan" : "requests" in errors || "rateLimit" in errors ? "quota" : "error";
      return { ok: false, kind, message };
    }
    return { ok: true, response: body.response, paging: body.paging };
  }

  /** All pages of a paged endpoint. */
  async getAll<T>(path: string, params: Record<string, string | number>): Promise<ApiResult<T[]>> {
    const out: T[] = [];
    for (let page = 1; ; page++) {
      const r = await this.get<T[]>(path, { ...params, page });
      if (!r.ok) return r;
      out.push(...r.response);
      if (page >= (r.paging?.total ?? 1)) return { ok: true, response: out, paging: { current: page, total: page } };
    }
  }
}

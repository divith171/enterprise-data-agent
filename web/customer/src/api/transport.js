import { API_BASE } from "@/config";

export class TransportError extends Error {
  constructor() {
    super("transport");
    this.name = "TransportError";
  }
}

export function readCookie(name) {
  const entry = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}

export function parseRetryAfter(value) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
  const date = Date.parse(value);
  if (!Number.isNaN(date)) return Math.max(0, Math.ceil((date - Date.now()) / 1000));
  return null;
}

export async function request(path, { method = "GET", json, headers = {} } = {}) {
  const init = { method, credentials: "include", headers: { Accept: "application/json", ...headers } };
  if (json !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(json);
  }
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new TransportError();
  }
  let body = null;
  if ((res.headers.get("content-type") || "").includes("application/json")) {
    try {
      body = await res.json();
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw new TransportError();
      body = undefined;
    }
  }
  return { status: res.status, retryAfter: parseRetryAfter(res.headers.get("Retry-After")), body };
}

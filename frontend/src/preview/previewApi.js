import { TransportError } from "@/api/transport";
import { QUERY_FIXTURES, HTTP_SCENARIOS, sourceRecord, PREVIEW_LONG_SOURCE_NAME } from "@/preview/fixtures";

// In-memory only. A page refresh resets preview sign-in, like a fresh browser session.
export const previewState = { login: "success", sources: "single", query: "success-canonical", logout: "success", wait: "normal" };
let identity = null;
let sourceRemoved = false;

const listeners = {};
export const previewBus = {
  on(evt, cb) {
    (listeners[evt] = listeners[evt] || new Set()).add(cb);
    return () => listeners[evt].delete(cb);
  },
  emit(evt) {
    (listeners[evt] || []).forEach((cb) => cb());
  },
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (body) => ({ status: 200, retryAfter: null, body });

const SOURCE_LISTS = {
  single: () => [sourceRecord()],
  "long-name": () => [sourceRecord({ name: PREVIEW_LONG_SOURCE_NAME })],
  none: () => [sourceRecord({ is_active: false })],
  multiple: () => [sourceRecord(), sourceRecord({ id: "demo-source-2", name: "Second Sample PostgreSQL" })],
};

export const previewApi = {
  async login({ email }) {
    await wait(600);
    if (previewState.login === "network") throw new TransportError();
    if (previewState.login === "401") return { status: 401, retryAfter: null, body: null };
    if (previewState.login === "429") return { status: 429, retryAfter: 30, body: null };
    identity = { id: `preview-user:${email.toLowerCase()}`, company_id: "preview-company", email, role: "member" };
    return ok({});
  },
  async me() {
    await wait(300);
    return identity ? ok(identity) : { status: 401, retryAfter: null, body: null };
  },
  async logout() {
    await wait(400);
    if (previewState.logout === "fail") return { status: 500, retryAfter: null, body: null };
    identity = null;
    return { status: 204, retryAfter: null, body: null };
  },
  async listDataSources() {
    await wait(400);
    if (!identity) return { status: 401, retryAfter: null, body: null };
    if (previewState.sources === "failure") return { status: 500, retryAfter: null, body: null };
    const list = SOURCE_LISTS[previewState.sources]();
    return ok(sourceRemoved ? list.map((s) => ({ ...s, is_active: false })) : list);
  },
  async query({ session_id }) {
    await wait(previewState.wait === "long" ? 50000 : 1200);
    if (!identity) return { status: 401, retryAfter: null, body: null };
    const key = previewState.query;
    if (key === "network") throw new TransportError();
    const http = HTTP_SCENARIOS[key];
    if (http) {
      if (http.status === 401) identity = null;
      if (http.removeSource) sourceRemoved = true;
      return { status: http.status, retryAfter: http.retryAfter ?? null, body: { detail: "sample internal detail that must not be shown" } };
    }
    const fixture = QUERY_FIXTURES[key];
    const body = { ...fixture, session_id: key === "session-mismatch" ? "another-session" : session_id };
    if (previewState.sources === "long-name" && body.source?.id === "demo-source") {
      body.source = { ...body.source, name: PREVIEW_LONG_SOURCE_NAME };
    }
    return ok(JSON.parse(JSON.stringify(body)));
  },
  resetSourceRemoval() {
    sourceRemoved = false;
  },
};

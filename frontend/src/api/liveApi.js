import { request, readCookie } from "@/api/transport";

export const liveApi = {
  login: ({ email, password }) => request("/auth/login", { method: "POST", json: { email, password } }),
  me: () => request("/auth/me"),
  logout: () => {
    const csrf = readCookie("eda_csrf");
    return request("/auth/logout", { method: "POST", headers: csrf ? { "X-CSRF-Token": csrf } : {} });
  },
  listDataSources: () => request("/data-sources"),
  query: ({ message, session_id, data_source_id }) =>
    request("/query", { method: "POST", json: { message, session_id, data_source_id } }),
};

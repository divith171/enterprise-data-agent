import { request, readCookie } from "@/api/transport";

export const liveApi = {
  login: ({ email, password }) => request("/auth/login", { method: "POST", json: { email, password } }),
  me: () => request("/auth/me"),
  logout: () => {
    const csrf = readCookie("eda_csrf");
    return request("/auth/logout", { method: "POST", headers: csrf ? { "X-CSRF-Token": csrf } : {} });
  },
    listDataSources: async () => {
    const response = await request("/data-sources");

    if (response.status !== 200 || !Array.isArray(response.body?.data_sources)) {
      return response;
    }

    return {
      ...response,
      body: response.body.data_sources,
    };
  },
  query: ({ message, session_id, data_source_id }) =>
    request("/query", { method: "POST", json: { message, session_id, data_source_id } }),
};

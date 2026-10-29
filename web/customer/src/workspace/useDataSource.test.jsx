import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { api } from "@/api";
import { useDataSource } from "./useDataSource";

jest.mock("@/api", () => ({
  api: {
    listDataSources: jest.fn(),
    me: jest.fn(),
  },
}));

const IDENTITY = {
  id: "user-a",
  company_id: "company-a",
  email: "analyst@example.test",
};

function makeSource(overrides = {}) {
  return {
    id: "source-a",
    name: "Customer PostgreSQL",
    type: "postgresql",
    is_active: true,
    ...overrides,
  };
}

function ok(body) {
  return { status: 200, body };
}

function deferred() {
  let resolve;
  let reject;

  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

describe("useDataSource", () => {
  let container;
  let root;
  let current;
  let onAuthLost;
  let previousActEnvironment;

  function Harness({ identity, onLost }) {
    current = useDataSource(identity, onLost);
    return null;
  }

  async function mount(identity = IDENTITY, onLost = onAuthLost) {
    await act(async () => {
      root.render(<Harness identity={identity} onLost={onLost} />);
    });
  }

  async function settle(request, response, operation) {
    await act(async () => {
      request.resolve(response);
      await operation;
    });
  }

  beforeEach(() => {
    previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    jest.resetAllMocks();
    onAuthLost = jest.fn();
    current = null;

    api.me.mockResolvedValue(ok(IDENTITY));
    api.listDataSources.mockResolvedValue(ok([]));

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });

    container.remove();
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  test("shows loading until the initial request completes", async () => {
    const request = deferred();
    api.listDataSources.mockReturnValueOnce(request.promise);

    await mount();

    expect(current.status).toBe("loading");
    expect(current.source).toBeNull();
    expect(current.selectedSourceId).toBeNull();

    const source = makeSource();
    await settle(request, ok([source]));

    expect(current.status).toBe("ready");
    expect(current.source).toEqual(source);
    expect(current.sources).toEqual([source]);
    expect(current.selectedSourceId).toBe(source.id);
    expect(api.listDataSources).toHaveBeenCalledTimes(1);
    expect(api.me).not.toHaveBeenCalled();
  });

  test("leaves multiple eligible sources initially unselected", async () => {
    const first = makeSource();
    const second = makeSource({ id: "source-b" });
    api.listDataSources.mockResolvedValueOnce(ok([first, second]));

    await mount();

    expect(current.status).toBe("multiple");
    expect(current.source).toBeNull();
    expect(current.sources).toEqual([first, second]);
    expect(current.selectedSourceId).toBeNull();
  });

  test("explicit selection synchronously updates the snapshot", async () => {
    const first = makeSource();
    const second = makeSource({ id: "source-b" });
    api.listDataSources.mockResolvedValueOnce(ok([first, second]));

    await mount();

    let selected;

    act(() => {
      selected = current.selectSource(second.id);

      expect(selected).toEqual(second);
      expect(current.getSnapshot().selectedSourceId).toBe(second.id);
      expect(current.getSnapshot().source).toEqual(second);
    });

    expect(current.status).toBe("ready");
    expect(current.selectedSourceId).toBe(second.id);
    expect(api.listDataSources).toHaveBeenCalledTimes(1);
  });

  test("preserves explicit selection across reload, despite list reordering", async () => {
    const first = makeSource();
    const second = makeSource({ id: "source-b" });
    api.listDataSources.mockResolvedValueOnce(ok([first, second]));

    await mount();

    act(() => {
      current.selectSource(second.id);
    });

    api.listDataSources.mockResolvedValueOnce(ok([second, first]));

    await act(async () => {
      await current.load();
    });

    expect(current.status).toBe("ready");
    expect(current.source).toEqual(second);
    expect(current.selectedSourceId).toBe(second.id);
    expect(current.sources).toEqual([second, first]);
  });

  test("does not fall back after the selected source is revoked", async () => {
    const first = makeSource();
    const second = makeSource({ id: "source-b" });
    api.listDataSources.mockResolvedValueOnce(ok([first, second]));

    await mount();

    act(() => {
      current.selectSource(first.id);
    });

    api.listDataSources.mockResolvedValueOnce(ok([second]));

    await act(async () => {
      await current.load();
    });

    expect(current.status).toBe("unavailable");
    expect(current.source).toBeNull();
    expect(current.selectedSourceId).toBe(first.id);
    expect(current.sources).toEqual([second]);
  });

  test("excludes inactive and non-PostgreSQL sources from selection", async () => {
    const active = makeSource();
    const inactive = makeSource({
      id: "inactive",
      is_active: false,
    });
    const mysql = makeSource({
      id: "mysql",
      type: "mysql",
    });

    api.listDataSources.mockResolvedValueOnce(
      ok([active, inactive, mysql])
    );

    await mount();

    expect(current.sources).toEqual([active]);

    act(() => {
      expect(current.selectSource(inactive.id)).toBeNull();
      expect(current.selectSource(mysql.id)).toBeNull();
      expect(current.selectSource("unknown")).toBeNull();
    });

    expect(current.selectedSourceId).toBe(active.id);
  });

  test("rejects selection while loading", async () => {
    const first = makeSource();
    const second = makeSource({ id: "source-b" });
    api.listDataSources.mockResolvedValueOnce(ok([first, second]));

    await mount();

    const request = deferred();
    api.listDataSources.mockReturnValueOnce(request.promise);

    let operation;
    act(() => {
      operation = current.load();
      expect(current.selectSource(second.id)).toBeNull();
    });

    expect(current.status).toBe("loading");

    await settle(request, ok([first, second]), operation);

    expect(current.selectedSourceId).toBeNull();
  });

  test("reports authentication loss on a current initial 401", async () => {
    api.listDataSources.mockResolvedValueOnce({ status: 401 });

    await mount();

    expect(onAuthLost).toHaveBeenCalledTimes(1);
    expect(current.status).toBe("error");
    expect(current.source).toBeNull();
    expect(current.sources).toEqual([]);
  });

  test("uses the latest authentication-loss callback", async () => {
    const request = deferred();
    api.listDataSources.mockReturnValueOnce(request.promise);

    await mount();

    const latestOnAuthLost = jest.fn();
    await mount(IDENTITY, latestOnAuthLost);
    await settle(request, { status: 401 });

    expect(onAuthLost).not.toHaveBeenCalled();
    expect(latestOnAuthLost).toHaveBeenCalledTimes(1);
    expect(api.listDataSources).toHaveBeenCalledTimes(1);
  });

  test.each([
    ["user", { ...IDENTITY, id: "user-b" }],
    ["company", { ...IDENTITY, company_id: "company-b" }],
  ])(
    "clears previous selection when the authenticated %s changes",
    async (_label, nextIdentity) => {
      const first = makeSource();
      api.listDataSources.mockResolvedValueOnce(ok([first]));

      await mount();

      expect(current.selectedSourceId).toBe(first.id);

      const request = deferred();
      api.listDataSources.mockReturnValueOnce(request.promise);

      await mount(nextIdentity);

      expect(current.status).toBe("loading");
      expect(current.source).toBeNull();
      expect(current.sources).toEqual([]);
      expect(current.selectedSourceId).toBeNull();
      expect(current.getSnapshot().source).toBeNull();

      const nextSource = makeSource({ id: "next-owner-source" });
      await settle(request, ok([nextSource]));

      expect(current.source).toEqual(nextSource);
      expect(current.selectedSourceId).toBe(nextSource.id);
      expect(onAuthLost).not.toHaveBeenCalled();
    }
  );

  test.each([200, 401])(
    "ignores a previous owner's late response with status %s",
    async (status) => {
      const oldRequest = deferred();
      api.listDataSources.mockReturnValueOnce(oldRequest.promise);

      await mount();

      const nextIdentity = {
        ...IDENTITY,
        id: "user-b",
        company_id: "company-b",
      };
      const nextSource = makeSource({ id: "next-owner-source" });

      api.listDataSources.mockResolvedValueOnce(ok([nextSource]));
      await mount(nextIdentity);

      await settle(oldRequest, {
        status,
        body: [makeSource({ id: "old-owner-source" })],
      });

      expect(current.source).toEqual(nextSource);
      expect(current.selectedSourceId).toBe(nextSource.id);
      expect(onAuthLost).not.toHaveBeenCalled();
    }
  );

  test.each([200, 401])(
    "ignores a superseded load response with status %s",
    async (status) => {
      const oldRequest = deferred();
      api.listDataSources.mockReturnValueOnce(oldRequest.promise);

      await mount();

      const latestSource = makeSource({ id: "latest-source" });
      api.listDataSources.mockResolvedValueOnce(ok([latestSource]));

      await act(async () => {
        await current.load();
      });

      await settle(oldRequest, {
        status,
        body: [makeSource({ id: "stale-source" })],
      });

      expect(current.source).toEqual(latestSource);
      expect(current.selectedSourceId).toBe(latestSource.id);
      expect(onAuthLost).not.toHaveBeenCalled();
    }
  );

  test("reload retry recovers from an initial transport failure", async () => {
    api.listDataSources.mockRejectedValueOnce(new Error("offline"));

    await mount();

    expect(current.status).toBe("error");
    expect(current.retryTarget).toBeNull();

    const source = makeSource();
    api.listDataSources.mockResolvedValueOnce(ok([source]));

    await act(async () => {
      await current.retry();
    });

    expect(current.status).toBe("ready");
    expect(current.source).toEqual(source);
    expect(api.listDataSources).toHaveBeenCalledTimes(2);
    expect(api.me).not.toHaveBeenCalled();
  });

  test("revalidation detects revocation without selecting another source", async () => {
    const selected = makeSource();
    const other = makeSource({ id: "source-b" });
    api.listDataSources.mockResolvedValueOnce(ok([selected]));

    await mount();

    api.listDataSources.mockResolvedValueOnce(ok([other]));

    await act(async () => {
      await current.revalidate(selected.id);
    });

    expect(api.me).toHaveBeenCalledTimes(1);
    expect(current.status).toBe("unavailable");
    expect(current.source).toBeNull();
    expect(current.selectedSourceId).toBe(selected.id);
    expect(current.sources).toEqual([other]);
    expect(current.revalidating).toBe(false);
  });

  test("revalidation rejects a selected source that becomes inactive", async () => {
    const selected = makeSource();
    const other = makeSource({ id: "source-b" });
    api.listDataSources.mockResolvedValueOnce(ok([selected]));

    await mount();

    api.listDataSources.mockResolvedValueOnce(
      ok([{ ...selected, is_active: false }, other])
    );

    await act(async () => {
      await current.revalidate(selected.id);
    });

    expect(current.status).toBe("unavailable");
    expect(current.source).toBeNull();
    expect(current.selectedSourceId).toBe(selected.id);
    expect(current.sources).toEqual([other]);
  });

  test("blocks explicit selection during revalidation", async () => {
    const first = makeSource();
    const second = makeSource({ id: "source-b" });
    api.listDataSources.mockResolvedValueOnce(ok([first, second]));

    await mount();

    act(() => {
      current.selectSource(first.id);
    });

    const request = deferred();
    api.me.mockReturnValueOnce(request.promise);

    let operation;
    act(() => {
      operation = current.revalidate(first.id);
      expect(current.selectSource(second.id)).toBeNull();
    });

    expect(current.revalidating).toBe(true);

    api.listDataSources.mockResolvedValueOnce(ok([first, second]));
    await settle(request, ok(IDENTITY), operation);

    expect(current.selectedSourceId).toBe(first.id);
    expect(current.revalidating).toBe(false);
  });

  test("ignores revalidation requested for an unselected source", async () => {
    const selected = makeSource();
    api.listDataSources.mockResolvedValueOnce(ok([selected]));

    await mount();

    await act(async () => {
      await current.revalidate("different-source");
    });

    expect(api.me).not.toHaveBeenCalled();
    expect(api.listDataSources).toHaveBeenCalledTimes(1);
    expect(current.selectedSourceId).toBe(selected.id);
  });

  test.each([
    ["401", { status: 401 }],
    ["changed user", ok({ ...IDENTITY, id: "different-user" })],
    [
      "changed company",
      ok({ ...IDENTITY, company_id: "different-company" }),
    ],
  ])(
    "reports authentication loss when revalidation returns %s",
    async (_label, response) => {
      const source = makeSource();
      api.listDataSources.mockResolvedValueOnce(ok([source]));

      await mount();

      api.me.mockResolvedValueOnce(response);

      await act(async () => {
        await current.revalidate(source.id);
      });

      expect(onAuthLost).toHaveBeenCalledTimes(1);
      expect(current.source).toBeNull();
      expect(current.sources).toEqual([]);
      expect(api.listDataSources).toHaveBeenCalledTimes(1);
    }
  );

  test("reports a current source-list 401 during revalidation", async () => {
    const source = makeSource();
    api.listDataSources.mockResolvedValueOnce(ok([source]));

    await mount();

    api.listDataSources.mockResolvedValueOnce({ status: 401 });

    await act(async () => {
      await current.revalidate(source.id);
    });

    expect(onAuthLost).toHaveBeenCalledTimes(1);
    expect(current.source).toBeNull();
    expect(current.sources).toEqual([]);
  });

  test.each([
    "identity HTTP failure",
    "identity transport failure",
    "source-list HTTP failure",
    "source-list transport failure",
    "malformed source list",
  ])(
    "retries full revalidation after %s",
    async (failure) => {
      const source = makeSource();
      api.listDataSources.mockResolvedValueOnce(ok([source]));

      await mount();

      if (failure === "identity HTTP failure") {
        api.me.mockResolvedValueOnce({ status: 503 });
      } else if (failure === "identity transport failure") {
        api.me.mockRejectedValueOnce(new Error("offline"));
      } else if (failure === "source-list HTTP failure") {
        api.listDataSources.mockResolvedValueOnce({ status: 503 });
      } else if (failure === "source-list transport failure") {
        api.listDataSources.mockRejectedValueOnce(new Error("offline"));
      } else {
        api.listDataSources.mockResolvedValueOnce(
          ok({ data_sources: [source] })
        );
      }

      await act(async () => {
        await current.revalidate(source.id);
      });

      expect(current.status).toBe("error");
      expect(current.source).toBeNull();
      expect(current.selectedSourceId).toBe(source.id);
      expect(current.retryTarget).toBe(source.id);
      expect(current.revalidating).toBe(false);
      expect(onAuthLost).not.toHaveBeenCalled();

      act(() => {
        expect(current.selectSource(source.id)).toBeNull();
      });

      const meCallsBeforeRetry = api.me.mock.calls.length;
      api.listDataSources.mockResolvedValueOnce(ok([source]));

      await act(async () => {
        await current.retry();
      });

      expect(api.me).toHaveBeenCalledTimes(meCallsBeforeRetry + 1);
      expect(current.status).toBe("ready");
      expect(current.source).toEqual(source);
      expect(current.selectedSourceId).toBe(source.id);
      expect(current.retryTarget).toBeNull();
    }
  );

  test.each(["identity", "source list"])(
    "ignores a stale revalidation 401 from the %s stage",
    async (stage) => {
      const source = makeSource();
      api.listDataSources.mockResolvedValueOnce(ok([source]));

      await mount();

      const staleRequest = deferred();

      if (stage === "identity") {
        api.me.mockReturnValueOnce(staleRequest.promise);
      } else {
        api.listDataSources.mockReturnValueOnce(staleRequest.promise);
      }

      let operation;
      await act(async () => {
        operation = current.revalidate(source.id);
      });

      const refreshed = { ...source, name: "Refreshed source name" };
      api.listDataSources.mockResolvedValueOnce(ok([refreshed]));

      await act(async () => {
        await current.load();
      });

      await settle(staleRequest, { status: 401 }, operation);

      expect(onAuthLost).not.toHaveBeenCalled();
      expect(current.status).toBe("ready");
      expect(current.source).toEqual(refreshed);
      expect(current.selectedSourceId).toBe(source.id);
      expect(current.revalidating).toBe(false);
    }
  );

  test("ignores a stale successful revalidation after a newer selection", async () => {
    const first = makeSource();
    const second = makeSource({ id: "source-b" });
    api.listDataSources.mockResolvedValueOnce(ok([first, second]));

    await mount();

    act(() => {
      current.selectSource(first.id);
    });

    const staleRequest = deferred();
    api.listDataSources.mockReturnValueOnce(staleRequest.promise);

    let operation;
    await act(async () => {
      operation = current.revalidate(first.id);
    });

    api.listDataSources.mockResolvedValueOnce(ok([first, second]));

    await act(async () => {
      await current.load();
    });

    act(() => {
      current.selectSource(second.id);
    });

    await settle(staleRequest, ok([first]), operation);

    expect(current.status).toBe("ready");
    expect(current.source).toEqual(second);
    expect(current.selectedSourceId).toBe(second.id);
    expect(current.sources).toEqual([first, second]);
  });

  test.each([0, 1, "1"])(
    "preserves selected ID %p through selection, reload and revalidation",
    async (selectedId) => {
      const numericZero = makeSource({ id: 0, name: "Zero" });
      const numericOne = makeSource({ id: 1, name: "Numeric one" });
      const stringOne = makeSource({ id: "1", name: "String one" });
      const sources = [numericZero, numericOne, stringOne];
      const expected = sources.find((item) => item.id === selectedId);

      api.listDataSources.mockResolvedValueOnce(ok(sources));

      await mount();

      act(() => {
        expect(current.selectSource(selectedId)).toEqual(expected);
        expect(current.getSnapshot().selectedSourceId).toBe(selectedId);
      });

      api.listDataSources.mockResolvedValueOnce(ok(sources));

      await act(async () => {
        await current.load();
      });

      expect(current.selectedSourceId).toBe(selectedId);
      expect(current.source).toEqual(expected);

      api.listDataSources.mockResolvedValueOnce(ok(sources));

      await act(async () => {
        await current.revalidate(selectedId);
      });

      expect(current.selectedSourceId).toBe(selectedId);
      expect(current.source.id).toBe(selectedId);
      expect(current.source).toEqual(expected);
    }
  );

  test("does not authenticate-loss redirect after unmount", async () => {
    const request = deferred();
    api.listDataSources.mockReturnValueOnce(request.promise);

    await mount();

    await act(async () => {
      root.render(null);
    });

    await settle(request, { status: 401 });

    expect(onAuthLost).not.toHaveBeenCalled();
  });
});
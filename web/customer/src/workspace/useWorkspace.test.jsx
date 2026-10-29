import React, { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { api } from "@/api";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { newSessionId, uid } from "@/lib/session";
import { useWorkspace } from "./useWorkspace";

jest.mock("@/api", () => ({
  api: {
    me: jest.fn(),
    listDataSources: jest.fn(),
    query: jest.fn(),
    logout: jest.fn(),
  },
  previewBus: null,
}));

jest.mock("@/components/StatusRegion", () => ({
  useAnnounce: () => () => {},
}));

jest.mock("@/lib/useMediaQuery", () => ({
  usePrefersReducedMotion: () => true,
}));

jest.mock("@/components/workspace/QuestionComposer", () => ({
  DRAFT_LIMIT: 8000,
}));

jest.mock("@/lib/session", () => ({
  ...jest.requireActual("@/lib/session"),
  newSessionId: jest.fn(),
  uid: jest.fn(),
}));



const IDENTITY = {
  id: "user-a",
  company_id: "company-a",
  email: "analyst@example.test",
  role: "user",
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

const SOURCE_A = makeSource();
const SOURCE_B = makeSource({
  id: "source-b",
  name: "Reporting PostgreSQL",
});

function ok(body) {
  return { status: 200, body };
}

function success(request, answer = "Analysis complete.") {
  return ok({
    schema_version: "1",
    outcome: "success",
    session_id: request.session_id,
    source: {
      id: request.data_source_id,
      name: "Authorized source",
    },
    answer,
    sql: "SELECT 0.10 AS rate",
    result: {
      columns: [{ index: 0, name: "rate", type: "numeric" }],
      rows: [["0.10"]],
      returned_row_count: 1,
      truncated: false,
    },
  });
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

describe("useWorkspace source/session safety", () => {
  let root;
  let container;
  let current;
  let auth;
  let previousActEnvironment;
  let previousAnimationFrame;

  function WorkspaceProbe() {
    current = useWorkspace();

    useEffect(
      () => () => {
        current = null;
      },
      []
    );

    return null;
  }

  function AuthenticatedHarness() {
    auth = useAuth();

    // Mirrors the existing authenticated-route mounting boundary.
    return auth.status === "authenticated" ? <WorkspaceProbe /> : null;
  }

  async function mount() {
    await act(async () => {
      root.render(
        <AuthProvider>
          <AuthenticatedHarness />
        </AuthProvider>
      );
    });

    await act(async () => {
      await auth.verify();
    });
  }

  function selectInitial(sourceId = SOURCE_A.id) {
    act(() => {
      current.requestSourceChange(sourceId);
    });

    expect(current.source.selectedSourceId).toBe(sourceId);
    expect(current.confirm).toBeNull();
  }

  async function ask(message) {
    act(() => {
      current.setDraft(message);
    });

    await act(async () => {
      await current.submit();
    });
  }

  beforeEach(() => {
    previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    previousAnimationFrame = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => {
      callback(0);
      return 0;
    };

    jest.resetAllMocks();

    let sessionSequence = 0;
    let turnSequence = 0;

    newSessionId.mockImplementation(
      () =>
        `00000000-0000-4000-8000-${String(++sessionSequence).padStart(
          12,
          "0"
        )}`
    );
    uid.mockImplementation(() => `turn-${++turnSequence}`);

    api.me.mockResolvedValue(ok(IDENTITY));
    api.listDataSources.mockResolvedValue(ok([SOURCE_A, SOURCE_B]));
    api.query.mockImplementation(async (request) => success(request));

    current = null;
    auth = null;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });

    container.remove();
    window.requestAnimationFrame = previousAnimationFrame;
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  test("initial source selection preserves a typed draft and its session", async () => {
    await mount();

    expect(current.source.status).toBe("multiple");
    expect(current.source.selectedSourceId).toBeNull();

    const initialSession = current.sessionId;

    act(() => {
      current.setDraft("Compare regional growth.");
    });

    selectInitial(SOURCE_B.id);

    expect(current.draft).toBe("Compare regional growth.");
    expect(current.sessionId).toBe(initialSession);
    expect(current.turns).toEqual([]);
  });

  test("initial source selection preserves a same-user draft restored after authentication", async () => {
    await mount();
    selectInitial();

    act(() => {
      current.setDraft("Keep this question after sign-in.");
    });

    api.query.mockResolvedValueOnce({ status: 401 });

    await act(async () => {
      await current.submit();
    });

    expect(auth.status).toBe("unauthenticated");
    expect(current).toBeNull();

    await act(async () => {
      await auth.verify();
    });

    expect(current.draft).toBe("Keep this question after sign-in.");
    expect(current.restoreNotice).toBe(true);

    const restoredSession = current.sessionId;

    selectInitial(SOURCE_B.id);

    expect(current.draft).toBe("Keep this question after sign-in.");
    expect(current.restoreNotice).toBe(true);
    expect(current.sessionId).toBe(restoredSession);
  });

  test("requires confirmation before discarding a draft on an existing source", async () => {
    await mount();
    selectInitial();

    const session = current.sessionId;

    act(() => {
      current.setDraft("An unfinished question.");
      current.requestSourceChange(SOURCE_B.id);
    });

    expect(current.confirm).toEqual({
      type: "source",
      sourceId: SOURCE_B.id,
    });
    expect(current.source.selectedSourceId).toBe(SOURCE_A.id);
    expect(current.sessionId).toBe(session);
    expect(current.draft).toBe("An unfinished question.");
  });

  test("requires confirmation before discarding completed turns", async () => {
    await mount();
    selectInitial();
    await ask("Analyze source A.");

    expect(current.draft).toBe("");
    expect(current.turns).toHaveLength(1);

    act(() => {
      current.requestSourceChange(SOURCE_B.id);
    });

    expect(current.confirm).toEqual({
      type: "source",
      sourceId: SOURCE_B.id,
    });
    expect(current.source.selectedSourceId).toBe(SOURCE_A.id);
    expect(current.turns).toHaveLength(1);
  });

  test("canceling a switch preserves source, session, draft and results", async () => {
    await mount();
    selectInitial();
    await ask("Analyze source A.");

    act(() => {
      current.setDraft("My unfinished follow-up.");
    });

    const session = current.sessionId;
    const turns = current.turns;

    act(() => {
      current.requestSourceChange(SOURCE_B.id);
    });

    act(() => {
      current.cancelConfirm();
    });

    expect(current.confirm).toBeNull();
    expect(current.source.selectedSourceId).toBe(SOURCE_A.id);
    expect(current.sessionId).toBe(session);
    expect(current.draft).toBe("My unfinished follow-up.");
    expect(current.turns).toBe(turns);
    expect(current.turns[0].result.kind).toBe("success");
  });

  test("confirmed switching clears old analysis and immediate submission uses the new source/session pair", async () => {
    await mount();
    selectInitial();
    await ask("Private question for source A.");

    act(() => {
      current.setDraft("Old source follow-up.");
      current.requestSourceChange(SOURCE_B.id);
    });

    const previousSession = current.sessionId;
    const beforeSwitch = current;

    // Exercise callbacks captured before React renders the source transition.
    act(() => {
      beforeSwitch.confirmAction();
    });

    expect(current.source.selectedSourceId).toBe(SOURCE_B.id);
    expect(current.sessionId).not.toBe(previousSession);
    expect(current.turns).toEqual([]);
    expect(current.draft).toBe("");
    expect(current.newResultId).toBeNull();
    expect(current.restoreNotice).toBe(false);
    expect(current.composerLabel).toBe("Question");

    const nextSession = current.sessionId;

    await act(async () => {
      beforeSwitch.setDraft("Analyze source B only.");
      await beforeSwitch.submit();
    });

    expect(api.query).toHaveBeenLastCalledWith({
      message: "Analyze source B only.",
      session_id: nextSession,
      data_source_id: SOURCE_B.id,
    });

    expect(current.turns).toHaveLength(1);
    expect(current.turns[0].question).toBe("Analyze source B only.");
    expect(current.turns[0].result.kind).toBe("success");
    expect(current.turns[0].result.rows).toEqual([["0.10"]]);
  });

  test("switching and submitting in one React batch cannot mix the old session with the new source", async () => {
    await mount();
    selectInitial();

    const previousSession = current.sessionId;
    const beforeSwitch = current;

    await act(async () => {
      beforeSwitch.requestSourceChange(SOURCE_B.id);
      beforeSwitch.setDraft("Question for the new source.");
      await beforeSwitch.submit();
    });

    expect(current.sessionId).not.toBe(previousSession);
    expect(api.query).toHaveBeenCalledTimes(1);
    expect(api.query).toHaveBeenCalledWith({
      message: "Question for the new source.",
      session_id: current.sessionId,
      data_source_id: SOURCE_B.id,
    });
  });

  test("a pending query blocks source switching and New Analysis immediately", async () => {
    await mount();
    selectInitial();

    const response = deferred();
    api.query.mockReturnValueOnce(response.promise);

    const session = current.sessionId;
    const beforeSubmit = current;
    let operation;

    act(() => {
      beforeSubmit.setDraft("A slow source A question.");
      operation = beforeSubmit.submit();

      // These run before React commits pending=true.
      beforeSubmit.requestSourceChange(SOURCE_B.id);
      beforeSubmit.requestNewAnalysis();
    });

    expect(current.pending).toBe(true);
    expect(current.confirm).toBeNull();
    expect(current.source.selectedSourceId).toBe(SOURCE_A.id);
    expect(current.sessionId).toBe(session);

    act(() => {
      current.setDraft("A draft written while waiting.");
      current.requestSourceChange(SOURCE_B.id);
    });

    expect(current.confirm).toBeNull();
    expect(current.draft).toBe("A draft written while waiting.");
    expect(api.query).toHaveBeenCalledTimes(1);

    const request = api.query.mock.calls[0][0];

    await act(async () => {
      response.resolve(success(request));
      await operation;
    });

    expect(current.pending).toBe(false);
    expect(current.source.selectedSourceId).toBe(SOURCE_A.id);
    expect(current.sessionId).toBe(session);
    expect(current.turns[0].result.kind).toBe("success");
    expect(current.draft).toBe("A draft written while waiting.");
  });

  test("a late response from an unmounted analysis cannot overwrite a new workspace", async () => {
    await mount();
    selectInitial();

    const response = deferred();
    api.query.mockReturnValueOnce(response.promise);

    const abandonedSession = current.sessionId;
    let operation;

    act(() => {
      current.setDraft("An abandoned source A question.");
      operation = current.submit();
    });

    const abandonedRequest = api.query.mock.calls[0][0];

    await act(async () => {
      root.render(null);
    });

    await mount();
    selectInitial(SOURCE_B.id);
    await ask("The new source B analysis.");

    const nextSession = current.sessionId;
    const nextTurns = current.turns;

    expect(nextSession).not.toBe(abandonedSession);

    await act(async () => {
      response.resolve(
        success(abandonedRequest, "Old answer must not appear.")
      );
      await operation;
    });

    expect(current.sessionId).toBe(nextSession);
    expect(current.source.selectedSourceId).toBe(SOURCE_B.id);
    expect(current.turns).toBe(nextTurns);
    expect(current.turns).toHaveLength(1);
    expect(current.turns[0].question).toBe(
      "The new source B analysis."
    );
    expect(current.turns[0].result.answer).toBe("Analysis complete.");
  });

  test("source revocation prevents further queries without falling back", async () => {
    await mount();
    selectInitial();

    const session = current.sessionId;

    api.query.mockResolvedValueOnce({ status: 403 });
    api.listDataSources.mockResolvedValueOnce(ok([SOURCE_B]));

    await ask("Check access to source A.");

    expect(current.source.status).toBe("unavailable");
    expect(current.source.selectedSourceId).toBe(SOURCE_A.id);
    expect(current.source.source).toBeNull();
    expect(current.sessionId).toBe(session);

    act(() => {
      current.setDraft("Do not send this without access.");
    });

    expect(current.canSend).toBe(false);

    await act(async () => {
      await current.submit();
    });

    expect(api.query).toHaveBeenCalledTimes(1);
    expect(current.draft).toBe("Do not send this without access.");
  });

  test("authentication loss and a different user's sign-in create a clean workspace", async () => {
    await mount();
    selectInitial(SOURCE_B.id);
    await ask("Private analysis for user A.");

    const previousSession = current.sessionId;

    act(() => {
      current.setDraft("Private draft for user A.");
    });

    api.query.mockResolvedValueOnce({ status: 401 });

    await act(async () => {
      await current.submit();
    });

    expect(auth.status).toBe("unauthenticated");
    expect(current).toBeNull();

    const nextIdentity = {
      ...IDENTITY,
      id: "user-b",
      company_id: "company-b",
      email: "other@example.test",
    };
    const nextSource = makeSource({
      id: "company-b-source",
      name: "Company B PostgreSQL",
    });

    api.me.mockResolvedValueOnce(ok(nextIdentity));
    api.listDataSources.mockResolvedValueOnce(ok([nextSource]));

    await act(async () => {
      await auth.verify();
    });

    expect(current.identity.id).toBe(nextIdentity.id);
    expect(current.sessionId).not.toBe(previousSession);
    expect(current.source.selectedSourceId).toBe(nextSource.id);
    expect(current.source.sources).toEqual([nextSource]);
    expect(current.turns).toEqual([]);
    expect(current.draft).toBe("");
    expect(current.restoreNotice).toBe(false);
    expect(current.pending).toBe(false);
    expect(current.confirm).toBeNull();
  });

  test.each([
    [1, "1"],
    ["1", 1],
  ])(
    "preserves ID types when switching from %p to %p",
    async (firstId, nextId) => {
      const numeric = makeSource({
        id: 1,
        name: "Numeric ID source",
      });
      const string = makeSource({
        id: "1",
        name: "String ID source",
      });

      api.listDataSources.mockResolvedValueOnce(ok([numeric, string]));

      await mount();
      selectInitial(firstId);
      await ask("First source question.");

      const previousSession = current.sessionId;

      act(() => {
        current.requestSourceChange(nextId);
      });

      expect(current.confirm).toEqual({
        type: "source",
        sourceId: nextId,
      });

      act(() => {
        current.confirmAction();
      });

      await ask("Second source question.");

      expect(current.sessionId).not.toBe(previousSession);
      expect(current.source.selectedSourceId).toBe(nextId);
      expect(api.query.mock.calls[0][0].data_source_id).toBe(firstId);
      expect(api.query.mock.calls[1][0].data_source_id).toBe(nextId);
      expect(api.query.mock.calls[1][0].session_id).toBe(
        current.sessionId
      );
    }
  );

  test("preserves numeric source ID zero during initial selection and submission", async () => {
    const zero = makeSource({ id: 0, name: "Numeric zero source" });
    api.listDataSources.mockResolvedValueOnce(ok([zero, SOURCE_B]));

    await mount();
    selectInitial(0);
    await ask("Question for source zero.");

    expect(current.source.selectedSourceId).toBe(0);
    expect(api.query).toHaveBeenCalledWith({
      message: "Question for source zero.",
      session_id: current.sessionId,
      data_source_id: 0,
    });
  });
});
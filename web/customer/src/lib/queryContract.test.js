import { evaluateSources } from "./queryContract";

function makeSource(overrides = {}) {
  return {
    id: "source-a",
    name: "Customer PostgreSQL",
    type: "postgresql",
    is_active: true,
    ...overrides,
  };
}

describe("evaluateSources", () => {
  describe("automatic and explicit selection", () => {
    test("automatically selects exactly one eligible source", () => {
      const source = makeSource();

      expect(evaluateSources([source])).toEqual({
        status: "ready",
        source,
        sources: [source],
        selectedSourceId: source.id,
      });
    });

    test("requires explicit selection when multiple eligible sources exist", () => {
      const first = makeSource();
      const second = makeSource({
        id: "source-b",
        name: "Reporting PostgreSQL",
      });

      expect(evaluateSources([first, second])).toEqual({
        status: "multiple",
        source: null,
        sources: [first, second],
        selectedSourceId: null,
      });
    });

    test("selects the explicitly requested source", () => {
      const first = makeSource();
      const second = makeSource({
        id: "source-b",
        name: "Reporting PostgreSQL",
      });

      expect(evaluateSources([first, second], second.id)).toEqual({
        status: "ready",
        source: second,
        sources: [first, second],
        selectedSourceId: second.id,
      });
    });

    test("preserves eligible source order", () => {
      const first = makeSource({ id: "z-source" });
      const second = makeSource({ id: "a-source" });

      expect(evaluateSources([first, second]).sources).toEqual([
        first,
        second,
      ]);
    });

    test("returns none for an empty source list", () => {
      expect(evaluateSources([])).toEqual({
        status: "none",
        source: null,
        sources: [],
        selectedSourceId: null,
      });
    });
  });

  describe("eligibility", () => {
    test.each(["postgresql", "postgres", "PostgreSQL", "POSTGRES"])(
      "accepts the PostgreSQL type %s",
      (type) => {
        const source = makeSource({ type });

        expect(evaluateSources([source])).toEqual({
          status: "ready",
          source,
          sources: [source],
          selectedSourceId: source.id,
        });
      }
    );

    test.each([false, null, undefined, 0, 1, "true"])(
      "excludes sources whose is_active is %p rather than true",
      (is_active) => {
        expect(evaluateSources([makeSource({ is_active })])).toEqual({
          status: "none",
          source: null,
          sources: [],
          selectedSourceId: null,
        });
      }
    );

    test.each(["mysql", "sqlite", "mongodb", "", null, undefined, 123])(
      "excludes a non-PostgreSQL or invalid type: %p",
      (type) => {
        expect(evaluateSources([makeSource({ type })])).toEqual({
          status: "none",
          source: null,
          sources: [],
          selectedSourceId: null,
        });
      }
    );

    test("automatically selects the only eligible source among ineligible entries", () => {
      const eligible = makeSource();
      const inactive = makeSource({
        id: "inactive",
        is_active: false,
      });
      const mysql = makeSource({
        id: "mysql",
        type: "mysql",
      });

      expect(evaluateSources([inactive, mysql, eligible])).toEqual({
        status: "ready",
        source: eligible,
        sources: [eligible],
        selectedSourceId: eligible.id,
      });
    });

    test.each([
      ["missing", undefined],
      ["null", null],
      ["empty string", ""],
      ["spaces", "   "],
      ["whitespace", "\t\n"],
      ["boolean", true],
      ["fraction", 1.5],
      ["NaN", NaN],
      ["Infinity", Infinity],
      ["object", {}],
      ["array", []],
    ])("excludes a source with an invalid ID: %s", (_label, id) => {
      expect(evaluateSources([makeSource({ id })])).toEqual({
        status: "none",
        source: null,
        sources: [],
        selectedSourceId: null,
      });
    });

    test.each([
      ["missing", undefined],
      ["null", null],
      ["empty string", ""],
      ["spaces", "   "],
      ["whitespace", "\t\n"],
      ["number", 123],
      ["boolean", false],
      ["object", {}],
      ["array", []],
    ])("excludes a source with an invalid name: %s", (_label, name) => {
      expect(evaluateSources([makeSource({ name })])).toEqual({
        status: "none",
        source: null,
        sources: [],
        selectedSourceId: null,
      });
    });

    test("ignores malformed entries within an otherwise valid array", () => {
      const source = makeSource();

      expect(
        evaluateSources([
          null,
          undefined,
          false,
          42,
          "not a source",
          [],
          {},
          source,
        ])
      ).toEqual({
        status: "ready",
        source,
        sources: [source],
        selectedSourceId: source.id,
      });
    });

    test("returns only customer-safe source fields", () => {
      const source = makeSource();

      const result = evaluateSources([
        {
          ...source,
          host: "private.example",
          port: 5432,
          database_name: "private_database",
          username: "private_user",
          secret_ref: "private-secret-reference",
          password: "synthetic-test-password",
          ssl_mode: "require",
        },
      ]);

      expect(result.source).toEqual(source);
      expect(result.sources).toEqual([source]);
    });
  });

  describe("source ID compatibility", () => {
    test.each([0, 1, 42, "0", "1", "source-a"])(
      "preserves the original ID value and type: %p",
      (id) => {
        const source = makeSource({ id });
        const result = evaluateSources([source]);

        expect(result.status).toBe("ready");
        expect(result.selectedSourceId).toBe(id);
        expect(result.source.id).toBe(id);
        expect(result.sources[0].id).toBe(id);
      }
    );

    test.each([1, "1"])(
      "distinguishes numeric and string IDs when explicitly selecting %p",
      (selectedId) => {
        const numeric = makeSource({
          id: 1,
          name: "Numeric ID source",
        });
        const string = makeSource({
          id: "1",
          name: "String ID source",
        });
        const expected = selectedId === 1 ? numeric : string;

        expect(
          evaluateSources([numeric, string], selectedId)
        ).toEqual({
          status: "ready",
          source: expected,
          sources: [numeric, string],
          selectedSourceId: selectedId,
        });
      }
    );

    test("does not treat an explicitly selected numeric zero as no selection", () => {
      const zero = makeSource({ id: 0 });
      const other = makeSource({ id: "other" });

      expect(evaluateSources([zero, other], 0)).toEqual({
        status: "ready",
        source: zero,
        sources: [zero, other],
        selectedSourceId: 0,
      });
    });

    test.each([
      [1, "1"],
      ["1", 1],
      [0, "0"],
      ["0", 0],
    ])(
      "does not fall back from selected ID %p to a differently typed ID %p",
      (selectedId, availableId) => {
        const available = makeSource({ id: availableId });

        expect(evaluateSources([available], selectedId)).toEqual({
          status: "unavailable",
          source: null,
          sources: [available],
          selectedSourceId: selectedId,
        });
      }
    );
  });

  describe("revocation and revalidation", () => {
    test("does not select the remaining source when the selected source disappears", () => {
      const remaining = makeSource({ id: "source-b" });

      expect(evaluateSources([remaining], "source-a")).toEqual({
        status: "unavailable",
        source: null,
        sources: [remaining],
        selectedSourceId: "source-a",
      });
    });

    test("does not fall back when the selected source becomes inactive", () => {
      const revoked = makeSource({ is_active: false });
      const remaining = makeSource({ id: "source-b" });

      expect(
        evaluateSources([revoked, remaining], revoked.id)
      ).toEqual({
        status: "unavailable",
        source: null,
        sources: [remaining],
        selectedSourceId: revoked.id,
      });
    });

    test("does not fall back when the selected source is no longer PostgreSQL", () => {
      const changed = makeSource({ type: "mysql" });
      const remaining = makeSource({ id: "source-b" });

      expect(
        evaluateSources([changed, remaining], changed.id)
      ).toEqual({
        status: "unavailable",
        source: null,
        sources: [remaining],
        selectedSourceId: changed.id,
      });
    });

    test("retains the selected ID when no eligible sources remain", () => {
      expect(evaluateSources([], "source-a")).toEqual({
        status: "unavailable",
        source: null,
        sources: [],
        selectedSourceId: "source-a",
      });
    });

    test("restores the same selection when access becomes available again", () => {
      const source = makeSource();

      expect(evaluateSources([], source.id).status).toBe("unavailable");

      expect(evaluateSources([source], source.id)).toEqual({
        status: "ready",
        source,
        sources: [source],
        selectedSourceId: source.id,
      });
    });
  });

  describe("malformed responses", () => {
    test.each([
      ["undefined", undefined],
      ["null", null],
      ["object", {}],
      ["string", "invalid"],
      ["number", 123],
      ["boolean", false],
      ["unadapted API envelope", { data_sources: [] }],
    ])("rejects a non-array response: %s", (_label, body) => {
      expect(evaluateSources(body)).toEqual({
        status: "error",
        source: null,
        sources: [],
        selectedSourceId: null,
      });
    });

    test.each(["source-a", 0])(
      "retains selected ID %p when the response is malformed",
      (selectedId) => {
        expect(evaluateSources(null, selectedId)).toEqual({
          status: "error",
          source: null,
          sources: [],
          selectedSourceId: selectedId,
        });
      }
    );
  });

  test("does not mutate the response array or its source records", () => {
    const first = Object.freeze(makeSource());
    const second = Object.freeze(
      makeSource({ id: "source-b", name: "Reporting PostgreSQL" })
    );
    const body = Object.freeze([first, second]);

    expect(() => evaluateSources(body, second.id)).not.toThrow();
    expect(body).toEqual([first, second]);
    expect(evaluateSources(body, second.id).source).toEqual(second);
  });
});
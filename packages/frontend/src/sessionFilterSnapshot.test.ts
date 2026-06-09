import { describe, it, expect } from "vitest";
import {
  normalizeSessionFilterSnapshot,
  sessionFiltersDirty,
} from "./sessionFilterSnapshot";

describe("sessionFilterSnapshot", () => {
  const applied = normalizeSessionFilterSnapshot({
    workspaceFilter: "",
    textQ: "",
    dateField: "created",
    rangeFrom: "",
    rangeTo: "",
  });

  it("is not dirty when current matches applied snapshot", () => {
    expect(
      sessionFiltersDirty(
        {
          workspaceFilter: "",
          textQ: "",
          dateField: "created",
          rangeFrom: "",
          rangeTo: "",
        },
        applied
      )
    ).toBe(false);
  });

  it("is dirty when workspace filter changes", () => {
    expect(
      sessionFiltersDirty(
        {
          workspaceFilter: "foo",
          textQ: "",
          dateField: "created",
          rangeFrom: "",
          rangeTo: "",
        },
        applied
      )
    ).toBe(true);
  });

  it("is dirty when name/id text query changes", () => {
    expect(
      sessionFiltersDirty(
        {
          workspaceFilter: "",
          textQ: "session-1",
          dateField: "created",
          rangeFrom: "",
          rangeTo: "",
        },
        applied
      )
    ).toBe(true);
  });

  it("is dirty when date field mode changes", () => {
    expect(
      sessionFiltersDirty(
        {
          workspaceFilter: "",
          textQ: "",
          dateField: "updated",
          rangeFrom: "",
          rangeTo: "",
        },
        applied
      )
    ).toBe(true);
  });

  it("is dirty when range from changes", () => {
    expect(
      sessionFiltersDirty(
        {
          workspaceFilter: "",
          textQ: "",
          dateField: "created",
          rangeFrom: "2024-01-01T00:00",
          rangeTo: "",
        },
        applied
      )
    ).toBe(true);
  });

  it("is dirty when range to changes", () => {
    expect(
      sessionFiltersDirty(
        {
          workspaceFilter: "",
          textQ: "",
          dateField: "created",
          rangeFrom: "",
          rangeTo: "2024-12-31T23:59",
        },
        applied
      )
    ).toBe(true);
  });

  it("is not dirty when applied snapshot is null", () => {
    expect(
      sessionFiltersDirty(
        {
          workspaceFilter: "foo",
          textQ: "",
          dateField: "created",
          rangeFrom: "",
          rangeTo: "",
        },
        null
      )
    ).toBe(false);
  });
});

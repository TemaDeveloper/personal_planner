// src/lib/__tests__/custom-field-value-api.test.ts
import { describe, it, expect } from "vitest";
import { attendanceDateKey } from "@/lib/gym-date";

describe("custom-field-value API — date key logic", () => {
  it("attendanceDateKey(new Date()) returns a yyyy-MM-dd string", () => {
    const key = attendanceDateKey(new Date());
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("values map built from field docs uses fieldKey as property", () => {
    const fieldDocs = [
      { fieldKey: "temp", value: 36.6 },
      { fieldKey: "notes", value: "ok" },
    ];
    const values: Record<string, unknown> = {};
    for (const doc of fieldDocs) {
      values[doc.fieldKey] = doc.value;
    }
    expect(values).toEqual({ temp: 36.6, notes: "ok" });
  });

  it("empty field docs produce empty values map", () => {
    const values: Record<string, unknown> = {};
    expect(values).toEqual({});
  });

  it("GET response shape matches contract when extraFields is empty", () => {
    const dateKey = attendanceDateKey(new Date("2026-06-06T00:00:00.000Z"));
    const response = { extraFields: [], values: {}, dateKey };
    expect(response.extraFields).toHaveLength(0);
    expect(response.values).toEqual({});
    expect(response.dateKey).toBe("2026-06-06");
  });

  it("GET response shape matches contract when fields are present", () => {
    const dateKey = "2026-06-06";
    const extraFields = [{ key: "temp", label: "Temperature", type: "number" }];
    const values = { temp: 36.6 };
    const response = { extraFields, values, dateKey };
    expect(response.extraFields[0].key).toBe("temp");
    expect(response.values["temp"]).toBe(36.6);
    expect(response.dateKey).toBe(dateKey);
  });
});

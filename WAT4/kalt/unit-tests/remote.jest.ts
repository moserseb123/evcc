import { isRemoteClientActive } from "@/utils/remote";

describe("isRemoteClientActive", () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date("2026-01-01T12:00:00Z")));
  afterEach(() => jest.useRealTimers());

  it("false ohne lastSeen-Eintrag", () => {
    expect(isRemoteClientActive(undefined, "alice")).toBe(false);
    expect(isRemoteClientActive({}, "alice")).toBe(false);
  });

  it("aktiv wenn zuletzt vor unter 5 Minuten gesehen", () => {
    const seen = { alice: "2026-01-01T11:58:00Z" };
    expect(isRemoteClientActive(seen, "alice")).toBe(true);
  });

  it("inaktiv wenn zuletzt vor ueber 5 Minuten gesehen", () => {
    const seen = { alice: "2026-01-01T11:50:00Z" };
    expect(isRemoteClientActive(seen, "alice")).toBe(false);
  });
});

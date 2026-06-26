import { findLowestSumSlotIndex } from "@/utils/forecast";

const slots = (values: number[]) => values.map((value, i) => ({ start: `${i}`, value }));

describe("findLowestSumSlotIndex (guenstigstes Ladefenster)", () => {
  it("findet den Startindex des billigsten Fensters", () => {
    expect(findLowestSumSlotIndex(slots([3, 1, 1, 2, 5]), 2)).toBe(1);
  });

  it("beruecksichtigt die ganze Fensterbreite", () => {
    expect(findLowestSumSlotIndex(slots([5, 1, 1, 1, 9]), 3)).toBe(1);
  });

  it("gibt -1 wenn weniger Slots als die Fensterbreite", () => {
    expect(findLowestSumSlotIndex(slots([1, 2]), 4)).toBe(-1);
  });
});

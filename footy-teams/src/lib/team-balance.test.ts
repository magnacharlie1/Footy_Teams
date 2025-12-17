import { describe, expect, it } from "vitest";

import { assignPositionSlots, autoBalanceTeams, pickFormation } from "./team-balance";

const samplePlayers = [
  { id: "a", name: "Alice", weightedPoints: 9 },
  { id: "b", name: "Bob", weightedPoints: 6 },
  { id: "c", name: "Cara", weightedPoints: 4 },
  { id: "d", name: "Dan", weightedPoints: 3 },
];

describe("autoBalanceTeams", () => {
  it("distributes players to minimize weight difference", () => {
    const teams = autoBalanceTeams(samplePlayers, 2);
    expect(teams[0].players.map((p) => p.id).sort()).toEqual(["a", "d"]);
    expect(teams[1].players.map((p) => p.id).sort()).toEqual(["b", "c"]);
  });

  it("handles four teams", () => {
    const extended = [...samplePlayers, { id: "e", name: "Eve", weightedPoints: 2 }];
    const teams = autoBalanceTeams(extended, 4);
    expect(teams).toHaveLength(4);
  });
});

describe("pickFormation", () => {
  it("returns defined layout for known sizes", () => {
    const result = pickFormation(7);
    expect(result.label).toBe("2-3-2");
    expect(result.slots).toHaveLength(7);
  });

  it("fallbacks for other sizes", () => {
    const result = pickFormation(3);
    expect(result.slots.length).toBe(3);
  });
});

describe("assignPositionSlots", () => {
  it("assigns slots in order of formation", () => {
    const result = assignPositionSlots(samplePlayers);
    expect(result.map((p) => p.positionSlot)).toEqual([1, 2, 3, 4]);
  });
});

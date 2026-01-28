export type TeamPlayer = {
  id: string;
  name: string;
  weightedPoints: number;
};

export type BalancedTeam = {
  teamIndex: number;
  totalWeight: number;
  players: TeamPlayer[];
};

const formationLayouts: Record<
  number,
  { rows: number[]; label: string }
> = {
  4: { rows: [2, 1, 1], label: "2-1-1" },
  5: { rows: [2, 2, 1], label: "2-2-1" },
  6: { rows: [2, 2, 2], label: "2-2-2" },
  7: { rows: [2, 3, 2], label: "2-3-2" },
  8: { rows: [3, 3, 2], label: "3-3-2" },
  9: { rows: [3, 3, 3], label: "3-3-3" },
  10: { rows: [4, 4, 2], label: "4-4-2" },
};

export function pickFormation(teamSize: number) {
  const entry =
    formationLayouts[teamSize] ??
    (teamSize > 10
      ? formationLayouts[10]
      : { rows: [Math.ceil(teamSize / 2), teamSize - Math.ceil(teamSize / 2)], label: "flex" });

  const slots: number[] = [];
  let cursor = 0;
  for (const count of entry.rows) {
    for (let i = 0; i < count; i += 1) {
      slots.push(cursor + i + 1);
    }
    cursor += count;
  }

  return { rows: entry.rows, label: entry.label, slots };
}

export function autoBalanceTeams(players: TeamPlayer[], numTeams: 2 | 4 = 2): BalancedTeam[] {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const sorted = shuffled.sort((a, b) => b.weightedPoints - a.weightedPoints);
  const teams: BalancedTeam[] = Array.from({ length: numTeams }, (_, idx) => ({
    teamIndex: idx + 1,
    totalWeight: 0,
    players: [],
  }));

  for (const player of sorted) {
    const target = teams.reduce((best, team) => {
      if (!best) return team;
      if (team.totalWeight < best.totalWeight) return team;
      if (team.totalWeight === best.totalWeight && team.players.length < best.players.length) {
        return team;
      }
      if (
        team.totalWeight === best.totalWeight &&
        team.players.length === best.players.length &&
        Math.random() < 0.5
      ) {
        return team;
      }
      return best;
    }, null as BalancedTeam | null);

    if (!target) continue;
    target.players.push(player);
    target.totalWeight += player.weightedPoints;
  }

  return teams.sort((a, b) => a.teamIndex - b.teamIndex);
}

export function assignPositionSlots(
  players: { id: string; name: string; positionSlot?: number }[],
) {
  const formation = pickFormation(players.length);
  const ordered = [...players];
  for (let i = 0; i < ordered.length; i += 1) {
    ordered[i] = { ...ordered[i], positionSlot: formation.slots[i] ?? i + 1 };
  }
  return ordered;
}

import type { Faction, MapConfig, TerritoryId } from './types.js';

export const TERRITORY_NAMES: Record<TerritoryId, string> = {
  t1: 'The Throne',
  t2: 'The Moors',
  t3: 'The Downs',
  t4: 'The Marches',
  t5: 'The Fens',
  t6: 'The Woods',
  t7: 'The Harbor',
  t8: 'The Hollows',
  t9: 'The Ridges',
  t10: 'The Fields',
  t11: 'The Peaks',
  t12: 'The Forge',
};

export const TERRITORY_HOMELANDS: Record<TerritoryId, Faction | null> = {
  t1: 'green',
  t2: null,
  t3: null,
  t4: null,
  t5: null,
  t6: null,
  t7: 'blue',
  t8: null,
  t9: null,
  t10: null,
  t11: null,
  t12: 'purple',
};

export const ADJACENCY: Record<TerritoryId, TerritoryId[]> = {
  t1: ['t2', 't3'],
  t2: ['t1', 't3', 't4', 't6'],
  t3: ['t1', 't2', 't5', 't7'],
  t4: ['t2', 't6', 't8'],
  t5: ['t3', 't7', 't9'],
  t6: ['t2', 't4', 't8', 't10'],
  t7: ['t3', 't5', 't9', 't11'],
  t8: ['t4', 't6', 't10'],
  t9: ['t5', 't7', 't11'],
  t10: ['t6', 't8', 't11', 't12'],
  t11: ['t7', 't9', 't10', 't12'],
  t12: ['t10', 't11'],
};

export const POSITIONS: Record<TerritoryId, { x: number; y: number }> = {
  //                                         Adjacency triangles:
  t1:  { x: 500, y: 40  },   // The Throne   t1-t2-t3
  t2:  { x: 310, y: 170 },   // The Moors    ╮ t2-t4-t6 triangle
  t4:  { x: 370, y: 310 },   // The Marches  │ (t4 inward, beside t2↔t6 line)
  t6:  { x: 200, y: 410 },   // The Woods    ╯╮ t6-t8-t10 triangle
  t8:  { x: 370, y: 530 },   // The Hollows    │ (t8 inward, beside t6↔t10 line)
  t10: { x: 370, y: 670 },   // The Fields    ╯
  t3:  { x: 690, y: 170 },   // The Downs    ╮ t3-t5-t7 triangle
  t5:  { x: 630, y: 310 },   // The Fens     │ (t5 inward, beside t3↔t7 line)
  t7:  { x: 800, y: 410 },   // The Harbor   ╯╮ t7-t9-t11 triangle
  t9:  { x: 630, y: 530 },   // The Ridges     │ (t9 inward, beside t7↔t11 line)
  t11: { x: 630, y: 670 },   // The Peaks     ╯
  t12: { x: 500, y: 780 },   // The Forge    t10-t11-t12
};

// All usable territory IDs (excludes blank center)
export const TERRITORY_IDS: TerritoryId[] = [
  't1',
  't2',
  't3',
  't4',
  't5',
  't6',
  't7',
  't8',
  't9',
  't10',
  't11',
  't12',
];

// Non-homeland territories that get random pairs during setup
export const NON_HOMELAND_TERRITORIES: TerritoryId[] = TERRITORY_IDS.filter(
  (id) => TERRITORY_HOMELANDS[id] === null
);

// Homeland territories
export const HOMELAND_TERRITORIES: TerritoryId[] = TERRITORY_IDS.filter(
  (id) => TERRITORY_HOMELANDS[id] !== null
);

export const MAP_CONFIG: MapConfig = {
  territories: Object.fromEntries(
    TERRITORY_IDS.map((id) => [
      id,
      {
        name: TERRITORY_NAMES[id],
        homeland: TERRITORY_HOMELANDS[id],
        position: POSITIONS[id],
        adjacency: ADJACENCY[id],
      },
    ])
  ) as MapConfig['territories'],
};

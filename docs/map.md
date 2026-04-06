# Map — Official Topology

11 usable territories + 1 blank center. 3 homelands at roughly 120-degree intervals.

## ASCII Diagram

```
            t1(G)
           / | \
         t2   t3
        / |   | \
      t4  |   |  t5
     / \ / \ / \ / \
   t6  [blank]  t7(U)
     \ / \ / \ / \
      t8  |   |  t9
        \ |   | /
        t10   t11
           \ | /
           t12(P)
```

- **(G)** = Green homeland
- **(U)** = Blue homeland  
- **(P)** = Purple homeland
- **[blank]** = unusable center space

## Territories

| ID | Name | Homeland | Setup |
|----|------|----------|-------|
| t1 | The Throne | Green | 2 green stones |
| t2 | The Moors | - | 2 random stones |
| t3 | The Downs | - | 2 random stones |
| t4 | The Marches | - | 2 random stones |
| t5 | The Fens | - | 2 random stones |
| t6 | The Woods | - | 2 random stones |
| t7 | The Harbor | Blue | 2 blue stones |
| t8 | The Hollows | - | 2 random stones |
| t9 | The Ridges | - | 2 random stones |
| t10 | The Fields | - | 2 random stones |
| t11 | The Peaks | - | 2 random stones |
| t12 | The Forge | Purple | 2 purple stones |

## Adjacency List

```typescript
const adjacency: Record<TerritoryId, TerritoryId[]> = {
  t1:  ['t2', 't3'],                    // top — homeland Black
  t2:  ['t1', 't3', 't4', 't6'],        // upper-left
  t3:  ['t1', 't2', 't5', 't7'],        // upper-right  (NOTE: t2-t3 adjacent)
  t4:  ['t2', 't6', 't8'],              // mid-left
  t5:  ['t3', 't7', 't9'],              // mid-right
  t6:  ['t2', 't4', 't8', 't10'],       // left
  t7:  ['t3', 't5', 't9', 't11'],       // right — homeland Blue
  t8:  ['t4', 't6', 't10'],             // lower-left
  t9:  ['t5', 't7', 't11'],             // lower-right
  t10: ['t6', 't8', 't11', 't12'],      // bottom-left
  t11: ['t7', 't9', 't10', 't12'],      // bottom-right (NOTE: t10-t11 adjacent)
  t12: ['t10', 't11'],                  // bottom — homeland Red
}
```

## SVG Coordinates

ViewBox: `0 0 1000 900`

```typescript
const positions: Record<TerritoryId, { x: number; y: number }> = {
  t1:  { x: 500, y: 60 },    // top center
  t2:  { x: 330, y: 190 },   // upper-left
  t3:  { x: 670, y: 190 },   // upper-right
  t4:  { x: 200, y: 360 },   // mid-left
  t5:  { x: 800, y: 360 },   // mid-right
  t6:  { x: 140, y: 530 },   // left
  t7:  { x: 860, y: 530 },   // right
  t8:  { x: 200, y: 700 },   // lower-left
  t9:  { x: 800, y: 700 },   // lower-right
  t10: { x: 370, y: 790 },   // bottom-left
  t11: { x: 630, y: 790 },   // bottom-right
  t12: { x: 500, y: 870 },   // bottom center
}
// blank center implied at ~(500, 450)
```

## Rendering Notes

- Territories rendered as organic blob shapes (rounded, slightly irregular)
- Adjacency lines: curved paths between territory centers (bezier curves for organic feel)
- Homeland territories have a subtle faction-colored glow/border
- Stone counts displayed as stacked pebble icons or numeric badges
- Territory hover: highlight territory + adjacent territories
- Territory select: show available actions for that territory

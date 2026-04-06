# Game Rules — Canonical Reference

Based on Turncoats by Matilda Simonsson, with clarifications for digital implementation.

## 1. Components

- **63 stones**: 21 green, 21 blue, 21 purple
- **Bag**: holds undrawn stones
- **Map**: 11 usable territories + 1 unusable blank center
- **Axe zone**: shared zone for Battle stones (persists all game)
- **Flag zone**: shared zone for March stones (persists all game)

## 2. Setup

1. Place 2 matching stones in each faction's **homeland** territory (3 homelands, one per faction)
2. For every other non-homeland territory (excluding blank center): randomly draw a pair of 2 stones from the bag and place them
3. Each player draws **8 stones** from the bag, kept **secret** from all other players
4. Remaining stones stay in the bag

## 3. Turn Structure

- Turns pass **clockwise**
- On your turn, take **exactly one** action: Recruit, Battle, March, or Negotiate
- Game ends immediately when **all players consecutively Negotiate**

## 4. Actions

### 4.1 Recruit
- Place **1 stone** from your hand onto **any territory** on the map

### 4.2 Battle
- Place **1 stone** from your hand onto the **axe zone** (it stays there permanently)
- Choose a **territory**
- For each stone **matching** the placed stone's color in that territory: remove 1 stone of **one other chosen faction** from that territory (returned to bag)
- **Constraint**: you may only target ONE other faction per battle
- **Max removals**: up to 3 stones removed per battle
- Removed stones return to the bag

### 4.3 March
- Place **1 stone** from your hand onto the **flag zone** (it stays there permanently)
- Choose a **territory**
- Move **1 or more** stones matching the placed stone's color from that territory to **one adjacent territory**
- **Constraint**: all moved stones must go to the **same** destination (no splitting)

### 4.4 Negotiate
- Draw **1 stone** from the bag (added to your hand)
- Then **reveal** 1 stone from your hand and **return it to the bag**
- Net effect: swap one stone (but all players see what you returned)
- If **every player** consecutively chooses Negotiate, the game **ends immediately**

## 5. Ruling Areas

- The faction with the **most stones** in a territory **rules** it
- **Tiebreaker 1**: faction with most stones on the **axe**
- **Tiebreaker 2**: faction with most stones on the **flag**
- If still tied: territory is contested (no ruler)

## 6. Winning Faction

- The faction that **rules the most territories** wins
- **Tiebreaker 1**: most stones on the **axe**
- **Tiebreaker 2**: most stones on the **flag**
- If still tied: **no faction wins** (no winner)

## 7. Winning Player

- The player holding the **most stones of the winning faction** in their hand wins
- **Tiebreaker 1**: fewest stones of the **losing faction** (worst-performing faction)
- **Tiebreaker 2**: turn order — the next player who **would have taken a turn** wins

## 8. Edge Cases

- **Empty bag + Negotiate**: if the bag is empty, nothing comes out — the draw simply doesn't happen. The player still reveals and returns a stone to the bag. The negotiate still counts toward consecutive negotiates.
- **No stones in hand**: player with 0 stones cannot Recruit, Battle, or March. They must Negotiate (draw only, no reveal/return).
- **Battle with 0 matching stones**: legal to play on axe, but no removals happen (wastes a stone for tiebreaker influence)
- **March with 0 matching stones**: legal to play on flag, but no movement happens

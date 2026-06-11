// A* over the court's walkable tile grid (layout.buildWalkableGrid).
// 4-directional, Manhattan heuristic — paths follow the tile lanes the way
// people cross a flagstone courtyard.

import { TILE, COLS, ROWS } from './layout'

export interface Tile { r: number; c: number }
export interface Point { x: number; y: number }

export function worldToTile(p: Point): Tile {
  return {
    r: Math.max(0, Math.min(ROWS - 1, Math.floor(p.y / TILE))),
    c: Math.max(0, Math.min(COLS - 1, Math.floor(p.x / TILE)))
  }
}

export function tileCenter(t: Tile): Point {
  return { x: t.c * TILE + TILE / 2, y: t.r * TILE + TILE / 2 }
}

/** BFS outward to the closest walkable tile (start may sit on furniture). */
export function nearestWalkable(walkable: boolean[][], from: Tile): Tile {
  if (walkable[from.r][from.c]) return from
  const seen = new Set<number>([from.r * COLS + from.c])
  const queue: Tile[] = [from]
  while (queue.length > 0) {
    const t = queue.shift() as Tile
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const r = t.r + dr
      const c = t.c + dc
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue
      const key = r * COLS + c
      if (seen.has(key)) continue
      seen.add(key)
      if (walkable[r][c]) return { r, c }
      queue.push({ r, c })
    }
  }
  return from // fully blocked grid — caller falls back to teleport
}

/** A* path including both endpoints, or null if unreachable. */
export function findPath(walkable: boolean[][], from: Tile, to: Tile): Tile[] | null {
  const start = nearestWalkable(walkable, from)
  const goal = nearestWalkable(walkable, to)
  const key = (t: Tile): number => t.r * COLS + t.c

  const open = new Map<number, Tile>([[key(start), start]])
  const cameFrom = new Map<number, number>()
  const g = new Map<number, number>([[key(start), 0]])
  const h = (t: Tile): number => Math.abs(t.r - goal.r) + Math.abs(t.c - goal.c)
  const f = new Map<number, number>([[key(start), h(start)]])

  while (open.size > 0) {
    // lowest f in the open set (court grid is small — no heap needed)
    let cur: Tile | null = null
    let curK = -1
    let best = Infinity
    for (const [k, t] of open) {
      const fv = f.get(k) ?? Infinity
      if (fv < best) { best = fv; cur = t; curK = k }
    }
    if (!cur) break
    if (curK === key(goal)) {
      const path: Tile[] = [cur]
      let k = curK
      while (cameFrom.has(k)) {
        k = cameFrom.get(k) as number
        path.unshift({ r: Math.floor(k / COLS), c: k % COLS })
      }
      return path
    }
    open.delete(curK)

    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const r = cur.r + dr
      const c = cur.c + dc
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || !walkable[r][c]) continue
      const nk = r * COLS + c
      const tentative = (g.get(curK) ?? Infinity) + 1
      if (tentative < (g.get(nk) ?? Infinity)) {
        cameFrom.set(nk, curK)
        g.set(nk, tentative)
        f.set(nk, tentative + h({ r, c }))
        if (!open.has(nk)) open.set(nk, { r, c })
      }
    }
  }
  return null
}

/** Tile path → world waypoints, replacing the endpoints with the exact
 *  start/destination px so agents stop at their seat, not a tile center. */
export function toWaypoints(path: Tile[], from: Point, to: Point): Point[] {
  const pts = path.map(tileCenter)
  if (pts.length === 0) return [to]
  pts[0] = from
  pts[pts.length - 1] = to
  return pts
}

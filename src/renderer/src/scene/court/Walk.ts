// Avatar movement: A* paths over the walkable grid, plus the life rules —
// shishyas walk in through the entrance on spawn, idle agents occasionally
// stroll to a landmark and back, and anyone caught away from their desk
// hurries home the moment work arrives.

import type { Avatar } from './Avatar'
import { buildWalkableGrid, WANDER_SPOTS, ENTRANCE, type Seat } from './layout'
import { findPath, toWaypoints, worldToTile, type Point } from './pathfinding'

const WALK_SPEED = 85    // px/s — strolling
const HURRY_SPEED = 140  // px/s — work just landed

interface Job {
  points: Point[]
  idx: number
  speed: number
  startAt: number              // elapsed ms; delayed walk-ins idle until then
  kind: 'home' | 'out'
  onArrive?: () => void
}

interface WanderState {
  nextAt: number               // earliest next stroll
  dwellUntil: number           // >0 → standing at a spot until then
}

export class Walker {
  private grid = buildWalkableGrid()
  private jobs = new Map<string, Job>()
  private wander = new Map<string, WanderState>()
  private elapsed = 0

  constructor(private seats: Map<string, Seat>) {}

  /** Path an avatar somewhere. Teleports if the grid says unreachable. */
  walkTo(
    avatar: Avatar, to: Point,
    opts: { speed?: number; delay?: number; kind?: Job['kind']; onArrive?: () => void } = {}
  ): void {
    const from = { x: avatar.x, y: avatar.y }
    const path = findPath(this.grid, worldToTile(from), worldToTile(to))
    if (!path) {
      avatar.position.set(to.x, to.y)
      opts.onArrive?.()
      return
    }
    this.jobs.set(avatar.agentId, {
      points: toWaypoints(path, from, to),
      idx: 1,
      speed: opts.speed ?? WALK_SPEED,
      startAt: this.elapsed + (opts.delay ?? 0),
      kind: opts.kind ?? 'home',
      onArrive: opts.onArrive
    })
  }

  /** Spawn at the gate and (after a stagger) walk to the desk. */
  enterFromGate(avatar: Avatar, seat: Seat, index: number): void {
    avatar.position.set(ENTRANCE.x + ((index % 3) - 1) * 22, ENTRANCE.y + 4)
    this.walkTo(avatar, seat, { delay: 400 + index * 700, kind: 'home' })
  }

  update(deltaMS: number, avatars: Map<string, Avatar>): void {
    this.elapsed += deltaMS
    for (const [id, avatar] of avatars) {
      const busy = avatar.avastha === 'working' || avatar.avastha === 'processing'
      const job = this.jobs.get(id)

      if (job) {
        // work arrived mid-stroll — turn around
        if (busy && job.kind === 'out') {
          const seat = this.seats.get(id)
          if (seat) { this.walkTo(avatar, seat, { speed: HURRY_SPEED, kind: 'home' }); continue }
        }
        if (this.elapsed < job.startAt) continue
        avatar.setWalking(true)
        this.advance(avatar, job, deltaMS)
        continue
      }

      const seat = this.seats.get(id)
      if (!seat) continue
      const atDesk = Math.hypot(avatar.x - seat.x, avatar.y - seat.y) < 6

      let st = this.wander.get(id)
      if (!st) {
        st = { nextAt: this.elapsed + 15000 + Math.random() * 25000, dwellUntil: 0 }
        this.wander.set(id, st)
      }

      if (busy) {
        st.dwellUntil = 0
        if (!atDesk) this.walkTo(avatar, seat, { speed: HURRY_SPEED, kind: 'home' })
        continue
      }
      if (avatar.avastha !== 'idle') continue

      if (!atDesk) {
        // dwelling at a wander spot
        if (st.dwellUntil === 0) st.dwellUntil = this.elapsed + 3000 + Math.random() * 4000
        if (this.elapsed >= st.dwellUntil) {
          st.dwellUntil = 0
          st.nextAt = this.elapsed + 30000 + Math.random() * 40000
          this.walkTo(avatar, seat, { kind: 'home' })
        }
        continue
      }

      if (this.elapsed >= st.nextAt) {
        const spot = WANDER_SPOTS[Math.floor(Math.random() * WANDER_SPOTS.length)]
        st.nextAt = Infinity // reset when the return walk is scheduled
        this.walkTo(avatar, spot, {
          kind: 'out',
          onArrive: () => { st.dwellUntil = this.elapsed + 3000 + Math.random() * 4000 }
        })
      }
    }
  }

  private advance(avatar: Avatar, job: Job, deltaMS: number): void {
    let step = job.speed * (deltaMS / 1000)
    while (step > 0 && job.idx < job.points.length) {
      const target = job.points[job.idx]
      const dx = target.x - avatar.x
      const dy = target.y - avatar.y
      const dist = Math.hypot(dx, dy)
      if (dist <= step) {
        avatar.position.set(target.x, target.y)
        step -= dist
        job.idx++
      } else {
        avatar.face(dx)
        avatar.position.set(avatar.x + (dx / dist) * step, avatar.y + (dy / dist) * step)
        step = 0
      }
    }
    if (job.idx >= job.points.length) {
      this.jobs.delete(avatar.agentId)
      avatar.setWalking(false)
      job.onArrive?.()
    }
  }
}

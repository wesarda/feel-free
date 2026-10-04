import type { Graph } from './graph.ts'

/** Binary min-heap of node indices keyed by cost. */
class Heap {
  private nodes: number[] = []
  private costs: number[] = []
  get size() {
    return this.nodes.length
  }
  push(node: number, cost: number) {
    const n = this.nodes
    const c = this.costs
    let i = n.length
    n.push(node)
    c.push(cost)
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (c[parent] <= cost) break
      n[i] = n[parent]
      c[i] = c[parent]
      i = parent
    }
    n[i] = node
    c[i] = cost
  }
  pop(): [number, number] {
    const n = this.nodes
    const c = this.costs
    const top: [number, number] = [n[0], c[0]]
    const lastNode = n.pop()!
    const lastCost = c.pop()!
    if (n.length > 0) {
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        let mc = lastCost
        if (l < n.length && c[l] < mc) {
          m = l
          mc = c[l]
        }
        if (r < n.length && c[r] < mc) m = r
        if (m === i) break
        n[i] = n[m]
        c[i] = c[m]
        i = m
      }
      n[i] = lastNode
      c[i] = lastCost
    }
    return top
  }
}

export type PathStep = { node: number; way: number; length: number }

export type SearchResult = {
  /** Node indices from start to end. */
  nodes: number[]
  /** Edge used to reach each node after the first. */
  steps: PathStep[]
  cost: number
}

/**
 * Dijkstra from several start candidates to several end candidates (each with an access cost),
 * so a route still works when the nearest node is on a disconnected bit of the network.
 */
export function shortestPath(
  graph: Graph,
  starts: { node: number; cost: number }[],
  ends: { node: number; cost: number }[],
  edgeCost: (from: number, to: number, way: number, length: number) => number,
): SearchResult | null {
  const n = graph.ids.length
  const dist = new Float64Array(n).fill(Infinity)
  const prevNode = new Int32Array(n).fill(-1)
  const prevWay = new Int32Array(n).fill(-1)
  const prevLen = new Float64Array(n)
  const endCost = new Map(ends.map((e) => [e.node, e.cost]))
  const heap = new Heap()
  for (const s of starts) {
    if (s.cost < dist[s.node]) {
      dist[s.node] = s.cost
      heap.push(s.node, s.cost)
    }
  }
  let best = Infinity
  let bestEnd = -1
  while (heap.size > 0) {
    const [node, cost] = heap.pop()
    if (cost > dist[node]) continue
    if (cost >= best) break
    const extra = endCost.get(node)
    if (extra !== undefined && cost + extra < best) {
      best = cost + extra
      bestEnd = node
    }
    for (const edge of graph.adj[node]) {
      const next = cost + edgeCost(node, edge.to, edge.way, edge.length)
      if (next < dist[edge.to]) {
        dist[edge.to] = next
        prevNode[edge.to] = node
        prevWay[edge.to] = edge.way
        prevLen[edge.to] = edge.length
        heap.push(edge.to, next)
      }
    }
  }
  if (bestEnd < 0) return null
  const nodes: number[] = []
  const steps: PathStep[] = []
  for (let v = bestEnd; v >= 0; v = prevNode[v]) {
    nodes.push(v)
    if (prevNode[v] >= 0) steps.push({ node: v, way: prevWay[v], length: prevLen[v] })
  }
  nodes.reverse()
  steps.reverse()
  return { nodes, steps, cost: best }
}

import { rangef, X } from './util';
import F from '@flatten-js/core'
import { render } from './render';
const { Point, Vector, Circle, Line, Ray, Segment, Arc, Box, Polygon, Matrix, PlanarSet } = F;

type NodeView = "hover" | "possible" | "";

export type Node = { id: number, at: F.Point, lanes: Lane[], mass: number, view?: NodeView }
type Lane = { id: number, seg: F.Segment, nodes: Node[] };
type State = { nodes: number[], lastMoved: number };
type Board = {
  lanes: Lane[],
  nodes: Node[],
  mass: number,
  lastMoved?: Node,
  history: State[],
  stableRadius: number,
  center: F.Vector,
  win?: boolean
}
type Level = [string, number, Function];

function fromAngle(a: number, l = 1) {
  return new Point(Math.cos(a) * l, Math.sin(a) * l);
}

export let b: Board, level: Level;
export let aiMoving: { from: Node, to: Node, at: F.Point };

function addNode(nodes: Node[], lane: Lane, at: F.Point) {
  let node = nodes.find(n => n.at.equalTo(at));
  if (!node) {
    node = { at, lanes: [], mass: 0, id: nodes.length };
    nodes.push(node);
  }
  let ownNode = lane.nodes.find(n => n.at.equalTo(at));
  if (!ownNode)
    lane.nodes.push(node);
}

function createBoard(segs: F.Segment[], balls: number[], stableRadius = 40) {

  let lanes: Lane[] = segs.map((seg, id) => ({ id, seg, nodes: [] as Node[] }))

  let nodes: Node[] = [];

  for (let i = 0; i < lanes.length; i++) {
    addNode(nodes, lanes[i], lanes[i].seg.start);
    addNode(nodes, lanes[i], lanes[i].seg.end);
    for (let j = 0; j < lanes.length; j++) {
      if (i == j)
        continue;
      let is = lanes[i].seg.intersect(lanes[j].seg);
      if (is.length) {
        let at = is[0];
        addNode(nodes, lanes[i], at);
      }
    }
  }

  lanes.forEach(l => {
    l.nodes.sort((a, b) => a.at.distanceTo(l.seg.start)[0] - b.at.distanceTo(l.seg.start)[0]);
    l.nodes.forEach((n, i) => n.lanes.push(l))
  })

  let mass = 0;

  for (let b of balls) {
    nodes[b].mass++;
    mass++;
  }

  b = { nodes, lanes, mass, stableRadius, history: [] } as Board;

  calculateCenter()
}


export function possibleMoves(from: Node) {
  if (!from)
    return [];
  let moves: Node[] = [];
  for (let l of from.lanes) {
    let p = l.nodes.indexOf(from);
    for (let i = p + 1; i < l.nodes.length && l.nodes[i].mass == 0; i++)
      moves.push(l.nodes[i]);
    for (let i = p - 1; i >= 0 && l.nodes[i].mass == 0; i--)
      moves.push(l.nodes[i]);
  }
  return moves;
}

export function calculateCenter() {
  let c = new Vector(0, 0);
  b.nodes.forEach(n => {
    if (n.mass) {
      c.x += n.at.x * n.mass;
      c.y += n.at.y * n.mass;
    }
  })
  b.center = c.multiply(1 / b.mass);
}

export function center2(from: Node, to: F.Point) {
  return new Vector(to.x - from.at.x, to.y - from.at.y).multiply(1 / b.mass).add(b.center);
}


export function aiThink() {
  let ct = b.center;
  let bestD = 1e6;
  let bestMove: [Node, Node];
  b.nodes.forEach(from => {
    if (from == b.lastMoved || from.mass == 0)
      return;
    let pm = possibleMoves(from);
    for (let to of pm) {
      let newC = center2(from, to.at);
      let d = newC.length;
      if (d < bestD) {
        bestD = d;
        bestMove = [from, to];
      }
    }
  })
  if (bestMove)
    aiMove(bestMove[0], bestMove[1]);

  calculateCenter();
}

export function playerMove(from: Node, to: Node) {
  b.history.push(state());
  makeMove(from, to);
  aiThink();
}

export function undo() {
  if (b.history.length > 0) {
    restore(b.history.pop());
  }
  render();
}

export function reset() {
  if (b.history.length > 0) {
    restore(b.history[0]);
    b.history.length = 0;
  }
  render();
}

function aiMove(from: Node, to: Node) {
  aiMoving = { from, to, at: from.at };
  for (let i = 0; i < 1; i += 1 / 20) {
    setTimeout(() => {
      aiMoving.at = new Point(from.at.x * (1 - i) + to.at.x * i, from.at.y * (1 - i) + to.at.y * i);
      render();
    }, i * 200);
  }

  setTimeout(() => {
    aiMoving = null;
    makeMove(from, to);
  }, 220);
}

export function makeMove(from: Node, to: Node) {
  to.mass = from.mass;
  from.mass = 0;
  b.lastMoved = to;
  calculateCenter();
  render();
}

function state() {
  let nodes = [];
  b.nodes.forEach((n, i) => {
    nodes[i] = n.mass;
  })
  return { nodes, lastMoved: b.lastMoved?.id } as State;
}

function restore(s: State) {
  b.nodes.forEach((n, i) => n.mass = s.nodes[i]);
  b.lastMoved = b.nodes[s.lastMoved];
}

function starPts(sides: number, r: number) {
  return rangef(sides, i => fromAngle(Math.PI * (2 / sides * i + 1 / 2), r));
}

function starSegs(sides: number, r: number, step = 2) {
  let pts = starPts(sides, r);
  return pts.map((p, i) => new Segment(p, pts[(i + step) % sides]));
}

function listPts(ptxy: [number, number][]) {
  return ptxy.map(([x, y]) => new Point(x, y));
}

function listSegs(ptxy: [number, number][], sgab: [number, number][]) {
  let pts = listPts(ptxy);
  let segs = sgab.map(([a, b]) => new Segment(pts[a], pts[b]))
  return segs
}

function grid(cols: number, rows: number, size: number) {
  let c = new Vector((size * (cols - 1)) / 2, (size * (rows - 1)) / 2);
  let cols1 = rangef(cols, i => [[i * size - c.x, -c.y], [i * size - c.x, c.y]]).flat(1);
  let rows1 = rangef(rows, i => [[-c.x, i * size - c.y], [c.x, i * size - c.y]]).flat(1);
  let pts = [...cols1, ...rows1].map(([x, y]) => new Point(x, y));
  let sgs = rangef(cols + rows, i => new Segment(pts[i * 2], pts[i * 2 + 1]));
  return sgs;
}

grid(2, 3, 10);

const levels = [
  ["Triangle", 1, () => createBoard(
    listSegs([[0, -150], [-200, 0], [0, 0], [200, 0], [200, 100]], [[0, 1], [1, 3], [0, 2], [0, 3]]),
    [0, 1, 2], 75
  )],
  ["Square", 2, () => createBoard(
    listSegs([[200, 0], [0, -200], [-200, 0], [0, 200], [0, 0]], [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [4, 2]]),
    [1, 3], 80
  )],
  ["Bird", 3, () => createBoard(
    listSegs([[-200, 40], [-100, 0], [0, 40], [100, 0], [200, 40], [-200, -40], [200, -40]], [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [2, 6]]),
    [0, 2, 4], 120
  )],
  ["Star3", 2, () => createBoard(starSegs(5, 250), [2, 3, 8], 90)],
  ["Star4", 2, () => createBoard(starSegs(5, 250), [2, 3, 6, 8], 54)],
  ["Star", 5, () => createBoard(starSegs(5, 250), [2, 3, 6, 8, 9], 54)],
  ["Grid33", 3, () => createBoard(grid(3, 3, 100), [2, 3, 4, 8, 5], 15)],
  ["Grid45", 6, () => createBoard(grid(4, 5, 100), [7, 8, 9, 12, 13, 14], 30)],
  ["Pentagram", 4, () => createBoard([...starSegs(5, 250), ...starSegs(5, 250,1)], [2, 3, 6, 8, 9], 30)],
  ["Hex", 4, () => createBoard([...starSegs(6, 250), ...starSegs(6, 250,1)], [2, 3, 6, 8, 9], 35)],
  ["Hex2", 8, () => createBoard([...starSegs(6, 250), ...starSegs(6, 250, 3)], [2, 3, 7, 10, 13, 15], 40)]
] as Level[];

let btns = document.getElementById("buttons") as HTMLDivElement;

levels.forEach((l, i) => {
  btns.innerHTML += `<button id="lvl:${i}">${l[0]}</button><br/>`
})

document.getElementById("instructions").innerHTML +=
  `
You play against AI on a board sitting atop of the tiny round table.<br/>
Your goal is to make board drop from the table by moving pieces to the one side.<br/>
AI will try to prevent it. If AI will balance the board back on their turn, board will not drop.<br/>
You and AI make moves in turn by moving any piece along any line to another node.<br/>
Drag piece to make the move.<br/>
You can't jump over pieces, or move with the same piece that was just moved by opponent.<br/>
`

export function playLevel(n: number) {
  level = levels[n]
  level[2]();
  render();
}

playLevel(0);

console.log(possibleMoves(b.nodes[7]).map(n => n.id));
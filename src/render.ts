import F from '@flatten-js/core'
import { Node, aiMoving, aiThink, b, calculateCenter, possibleMoves, playerMove, undo, center2, reset, playLevel, level } from '.';
const { Point, Vector, Circle, Line, Ray, Segment, Arc, Box, Polygon, Matrix, PlanarSet } = F;

const canvas = document.getElementById("C") as HTMLCanvasElement;
const background = document.getElementById("B") as HTMLCanvasElement;

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

background.width = background.clientWidth;
background.height = background.clientHeight;

const c = canvas.getContext("2d");
const bc = background.getContext("2d");


export const boardCenter = new Point(canvas.width / 2, canvas.height / 2);

let mousePos = new Point(0, 0);

let dragging: Node;

let idt = c.createImageData(2, 2);
idt.data.set([0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 255])
let idtc = document.createElement("canvas");
idtc.width = idtc.height = 2;
let idtcc = idtc.getContext("2d");
idtcc.putImageData(idt, 0, 0);
let xpat = c.createPattern(idtc, "repeat");

function renderBall(x: number, y: number, blocked = false, hover = false) {
  c.fillStyle = blocked ? "#000" : xpat;
  let scale = hover ? 1.1 : 1;
  c.beginPath();
  c.arc(x, y - 10, 20 * scale, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  c.fillStyle = "#fff";
  c.beginPath();
  c.arc(x + 5, y - 20 * scale, 7 * scale, 0, Math.PI * 2);
  c.fill();
}

function nodeAt(at: F.Point) {
  for (let n of b.nodes) {
    if (n.at.distanceTo(at)[0] < 45) {
      return n;
    }
  }
}

function updateText() {
  let win = b.center.length > b.stableRadius && !aiMoving;
  let moves = b.history.length;
  (document.getElementById("turn") as HTMLDivElement).innerHTML =
    `Level: "${level[0]}" Turn: ${moves} Par: ${level[1]} 
  ${win ? `<br/><br/><br/><p id="win">WIN in ${moves} move${moves > 1 ? 's' : ''}</p>` : ''}`;
}

export function animateDrop() {
  for (let i = 0; i < 1; i += 0.05) {
    setTimeout(
      () => canvas.style.transform = `rotate3d(${-b.center.y}, ${b.center.x}, 0, ${60 * i}deg)`,
      i * 1000
    );
  }
  canvas.style.transformOrigin = `${b.center.x + boardCenter.x}px ${b.center.y + boardCenter.y}px`;
}

export function unanimateDrop() {
  canvas.style.transform = `rotate3d(0, 0, 0, 0deg)`;
}

export function render() {
  calculateCenter();
  updateText();

  c.lineWidth = 3;
  c.fillStyle = "#fff";
  c.clearRect(0, 0, canvas.width, canvas.height);
  bc.clearRect(0, 0, background.width, background.height);
  c.lineCap = "square";

  c.translate(boardCenter.x, boardCenter.y);

  b.lanes.forEach(l => {
    let s = l.seg;
    c.beginPath();
    c.moveTo(s.start.x, s.start.y);
    c.lineTo(s.end.x, s.end.y);
    c.stroke();
  })

  c.font = "14pt Courier"
  b.nodes.forEach((n, i) => {

    c.fillStyle = "#fff";
    c.beginPath();
    c.arc(n.at.x, n.at.y, !aiMoving && (n.view == "hover" || n.view == "possible") ? 10 : 4, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    if (n.mass && dragging != n && aiMoving?.from != n) {
      renderBall(n.at.x, n.at.y, n == b.lastMoved, n.view == "hover");
    }

  });

  if (aiMoving) {
    renderBall(aiMoving.at.x, aiMoving.at.y);
  }

  let cr = b.center;

  if (dragging) {
    cr = center2(dragging, mousePos);
  }

  if (aiMoving) {
    cr = center2(aiMoving.from, aiMoving.at);
  }

  c.lineWidth = 1;

  bc.translate(boardCenter.x, boardCenter.y);
  bc.setLineDash([3, 3])

  bc.beginPath();
  bc.arc(0, 0, b.stableRadius, 0, Math.PI * 2)
  bc.stroke();

  bc.beginPath();
  bc.moveTo(-b.stableRadius, 0)
  bc.lineTo(-b.stableRadius, canvas.height * 2)
  bc.stroke();

  bc.beginPath();
  bc.moveTo(b.stableRadius, 0)
  bc.lineTo(b.stableRadius, canvas.height * 2)
  bc.stroke();

  bc.setLineDash([])

  const r = 10;

  c.fillStyle = "#fff";
  c.beginPath();
  c.arc(cr.x, cr.y, r, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  c.fillStyle = "#000";
  c.beginPath();
  c.arc(cr.x, cr.y, r, 0, Math.PI * .5);
  c.lineTo(cr.x, cr.y);
  c.arc(cr.x, cr.y, r, Math.PI, Math.PI * 1.5);
  c.lineTo(cr.x, cr.y);
  c.fill();

  bc.resetTransform();

  if (dragging) {
    c.lineWidth = 3;
    let node = nodeAt(mousePos);
    let possible = possibleMoves(dragging).includes(node);
    if (!possible) {
      c.globalAlpha = 0.5;
    }

    renderBall(mousePos.x, mousePos.y);

    c.globalAlpha = 1;
  }

  c.translate(-boardCenter.x, -boardCenter.y);

}

canvas.addEventListener("mousemove", e => {
  mousePos = new Point(e.offsetX - boardCenter.x, e.offsetY - boardCenter.y);
  let node = nodeAt(mousePos);

  if (!dragging) {
    if (node && node.mass && b.lastMoved != node) {
      let pm = possibleMoves(node);
      b.nodes.forEach(n => {
        n.view = n == node ? "hover" : pm.includes(n) ? "possible" : "";
      })
    } else {
      b.nodes.forEach(n => {
        n.view = "";
      })
    }
  }

  render();
})

window.addEventListener("keydown", e => {
  if (e.code == "KeyU") {
    undo();
  }
  if (e.code == "KeyR") {
    reset();
  }
})

document.addEventListener("mousedown", e => {
  if (e.target == canvas) {
    if (aiMoving) {
      return;
    }

    let node = nodeAt(mousePos);
    if (node?.mass && b.lastMoved != node && !dragging) {
      dragging = node;
    }
    render();
  }
  if (e.target instanceof HTMLButtonElement) {
    if (e.target?.id == "undo") {
      undo();
    }
    if (e.target?.id == "reset") {
      reset();
    }
    if (e.target?.id.substr(0, 4) == "lvl:") {
      playLevel(Number(e.target?.id.substr(4)));
    }
  }
})

canvas.addEventListener("mouseup", e => {
  let node = nodeAt(mousePos);
  if (node?.mass == 0 && dragging && possibleMoves(dragging).includes(node)) {
    playerMove(dragging, node);
  }
  dragging = null;
  render();
})


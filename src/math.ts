type Point = {x:number, y:number}
type Segment = {start:Point, end:Point}

export const EPS = 1e-9;

export const zero = (a:number) => - EPS <= a && a <= EPS;
export const equal = (a:number, b:number) => Math.abs(a - b) <= EPS;
export const less = (a:number, b:number) => b - a > EPS;

export function segmentIntersection(S:Segment, T:Segment, st) {
  let [a, b, c, d, e, f, g, h] = [
    S.start.x,
    S.start.y,
    S.end.x,
    S.end.y,
    T.start.x,
    T.start.y,
    T.end.x,
    T.end.y,
  ];
  let det = (c - a) * (h - f) - (g - e) * (d - b);

  // Проверка касания концами
  let endTouch = pointOnSegment(S.start, T)
    ? [a, b]
    : pointOnSegment(S.end, T)
      ? [c, d]
      : pointOnSegment(T.start, S)
        ? [e, f]
        : pointOnSegment(T.end, S)
          ? [g, h]
          : null;

  // Проверка пересечения под углом
  let intersect;
  if (!zero(det)) {
    let detSign = det < 0 ? -1 : 1;
    det *= detSign;
    let sd = ((h - f) * (g - a) + (e - g) * (h - b)) * detSign;
    let td = ((b - d) * (g - a) + (c - a) * (h - b)) * detSign;
    if (st) [st[0], st[1]] = [sd / det, td / det];
    if (0 <= sd && sd <= det && 0 <= td && td <= det)
      intersect = [a + ((c - a) * sd) / det, b + ((d - b) * sd) / det];
  }

  /*if(res)
    console.log(det, segmentToString(S), segmentToString(T), st, res);*/
  return endTouch || intersect;
}

/**
 * Находится ли точка на отрезке
 * @param {Point} point
 * @param {{start:Point, end:Point}} segment
 */
 export function pointOnSegmentOld(point:Point, { start, end }, precision = EPS) {
  /** Вектора от точки к концам отрезка */
  let dsx = start.x - point.x,
    dsy = start.y - point.y,
    dex = end.x - point.x,
    dey = end.y - point.y,
    dsex = end.x - start.x,
    dsey = end.y - start.y;
  let cross = dsex * dey - dsey * dex;
  let scalar = dsx * dex + dsy * dey;
  return -precision <= cross && cross <= precision && scalar <= precision;
}
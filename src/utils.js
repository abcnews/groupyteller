import { sum } from "d3-array";

// while this might not be reprentative for all fonts, it is
// still better than assuming every character has the same width
// (set monospace=true if you want to bypass this)
const CHAR_W = {
  A: 7,
  a: 7,
  B: 8,
  b: 7,
  C: 8,
  c: 6,
  D: 9,
  d: 7,
  E: 7,
  e: 7,
  F: 7,
  f: 4,
  G: 9,
  g: 7,
  H: 9,
  h: 7,
  I: 3,
  i: 3,
  J: 5,
  j: 3,
  K: 8,
  k: 6,
  L: 7,
  l: 3,
  M: 11,
  m: 11,
  N: 9,
  n: 7,
  O: 9,
  o: 7,
  P: 8,
  p: 7,
  Q: 9,
  q: 7,
  R: 8,
  r: 4,
  S: 8,
  s: 6,
  T: 7,
  t: 4,
  U: 9,
  u: 7,
  V: 7,
  v: 6,
  W: 11,
  w: 9,
  X: 7,
  x: 6,
  Y: 7,
  y: 6,
  Z: 7,
  z: 5,
  ".": 2,
  ",": 2,
  ":": 2,
  ";": 2
};

export function deg2rad(deg) {
  return (deg * Math.PI) / 180;
}

// For circle initialisation
export function getRandomInCircle(xMin, xMax, yMin, yMax) {
  xMin = Math.ceil(xMin);
  yMin = Math.ceil(yMin);
  xMax = Math.floor(xMax);
  yMax = Math.floor(yMax);

  let randomPoint = {
    x: Math.floor(Math.random() * (xMax - xMin + 1)) + xMin,
    y: Math.floor(Math.random() * (yMax - yMin + 1)) + yMin
  };

  let center = {
    x: (xMin + xMax) / 2,
    y: yMin + yMax / 2
  };

  let distance = Math.hypot(center.x - randomPoint.x, center.y - randomPoint.y);

  while (distance > Math.min(xMax - xMin, yMax - yMin) / 2) {
    randomPoint = {
      x: Math.floor(Math.random() * (xMax - xMin + 1)) + xMin,
      y: Math.floor(Math.random() * (yMax - yMin + 1)) + yMin
    };
    distance = Math.hypot(center.x - randomPoint.x, center.y - randomPoint.y);
  }

  return randomPoint;
}

export function hexToRgbA(hex, a = "0.85") {
  // also adds alpha
  let c;
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split("");
    if (c.length == 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = "0x" + c.join("");
    return `rgba(${[(c >> 16) & 255, (c >> 8) & 255, c & 255].join(",")},${a})`;
  }
  throw new Error("Bad Hex");
}

export function tspans(selection, lines, lh) {
  return selection
    .selectAll("tspan")
    .data(parent =>
      (typeof lines == "function" ? lines(parent) : lines).map(line => ({
        line,
        parent
      }))
    )
    .join("tspan")
    .text(d => d.line)
    .attr("x", 0)
    .attr("dy", (d, i) =>
      i ? (typeof lh == "function" ? lh(d.parent, d.line, i) : lh) || 17 : 0
    );
}

export function wordwrap(
  line,
  maxCharactersPerLine,
  minCharactersPerLine,
  monospace
) {
  var l,
    lines = [],
    w = [],
    words = [],
    w1,
    maxChars,
    minChars,
    maxLineW,
    minLineW;
  w1 = line.split(" ");
  w1.forEach(function(s, i) {
    var w2 = s.split("-");
    if (w2.length > 1) {
      w2.forEach(function(t, j) {
        w.push(t + (j < w2.length - 1 ? "-" : ""));
      });
    } else {
      w.push(s + (i < w1.length - 1 ? " " : ""));
    }
  });
  maxChars = maxCharactersPerLine || 40;
  minChars =
    minCharactersPerLine ||
    Math.max(
      3,
      Math.min(
        maxChars * 0.5,
        0.75 * w.map(word_len).sort(num_asc)[Math.round(w.length / 2)]
      )
    );
  maxLineW = maxChars * CHAR_W.a;
  minLineW = minChars * CHAR_W.a;
  l = 0;
  w.forEach(function(d) {
    var ww = sum(d.split("").map(char_w));
    if (l + ww > maxLineW && l > minLineW) {
      lines.push(words.join(""));
      words.length = 0;
      l = 0;
    }
    l += ww;
    return words.push(d);
  });
  if (words.length) {
    lines.push(words.join(""));
  }
  return lines.filter(function(d) {
    return d !== "";
  });
  function char_w(c) {
    return (!monospace && CHAR_W[c]) || CHAR_W.a;
  }
  function word_len(d) {
    return d.length;
  }
  function num_asc(a, b) {
    return a - b;
  }
}

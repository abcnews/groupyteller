// Fork of https://github.com/tinker10/D3-Labeler

export function labeler() {
  // The returned labeler object
  const labeler = {};

  // User definable data
  let lab = [];
  let anc = [];
  let w = 1; // box width
  let h = 1; // box width
  let user_defined_energy = null;
  let user_defined_schedule = null;

  const max_move = 5.0;
  const max_angle = 0.2;

  // Possibly useful for debugging
  let acceptedMoves = 0;
  let rejectedMoves = 0;

  // weights
  const w_len = 0.2; // leader line length
  const w_inter = 1.0; // leader line intersection
  const w_lab2 = 30.0; // label-label overlap
  const w_lab_anc = 30.0; // label-anchor overlap
  const w_orient = 3.0; // orientation bias

  const getEnergy = (i, lab, anc) =>
    user_defined_energy ? user_defined_energy(i, lab, anc) : energy(i);

  const energy = function(index) {
    // energy function, tailored for label placement

    let result = 0;

    const label = lab[index];
    const anchor = anc[index];

    let dx = label.x - anchor.x;
    let dy = anchor.y - label.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    let overlap = true;

    // penalty for length of leader line
    if (dist > 0) result += dist * w_len;

    // label orientation bias
    dx /= dist;
    dy /= dist;
    if (dx > 0 && dy > 0) {
      result += 0 * w_orient;
    } else if (dx < 0 && dy > 0) {
      result += 1 * w_orient;
    } else if (dx < 0 && dy < 0) {
      result += 2 * w_orient;
    } else {
      result += 3 * w_orient;
    }

    const x21 = label.x;
    const y21 = label.y - label.height + 2.0;
    const x22 = label.x + label.width;
    const y22 = label.y + 2.0;

    let x11, x12, y11, y12, x_overlap, y_overlap, overlap_area;

    const m = lab.length;

    for (let i = 0; i < m; i++) {
      if (i != index) {
        // penalty for intersection of leader lines
        overlap = intersect(
          anchor.x,
          label.x,
          anc[i].x,
          lab[i].x,
          anchor.y,
          label.y,
          anc[i].y,
          lab[i].y
        );
        if (overlap) result += w_inter;

        // penalty for label-label overlap
        x11 = lab[i].x;
        y11 = lab[i].y - lab[i].height + 2.0;
        x12 = lab[i].x + lab[i].width;
        y12 = lab[i].y + 2.0;
        x_overlap = Math.max(0, Math.min(x12, x22) - Math.max(x11, x21));
        y_overlap = Math.max(0, Math.min(y12, y22) - Math.max(y11, y21));
        overlap_area = x_overlap * y_overlap;
        //   console.log('label-overlap', overlap_area);
        result += overlap_area * w_lab2;
      }

      // penalty for label-anchor overlap
      x11 = anc[i].x - anc[i].r;
      y11 = anc[i].y - anc[i].r;
      x12 = anc[i].x + anc[i].r;
      y12 = anc[i].y + anc[i].r;
      x_overlap = Math.max(0, Math.min(x12, x22) - Math.max(x11, x21));
      y_overlap = Math.max(0, Math.min(y12, y22) - Math.max(y11, y21));
      overlap_area = x_overlap * y_overlap;
      //   console.log('anchor-overlap', overlap_area);
      result += overlap_area * w_lab_anc;
    }

    return result;
  };

  const mcmove = function(currT) {
    // Monte Carlo translation move

    // select a random label
    const i = Math.floor(Math.random() * lab.length);
    const label = lab[i];

    // save old coordinates
    const x_old = label.x;
    const y_old = label.y;

    // old energy
    const old_energy = getEnergy(i, lab, anc);

    // random translation
    label.x += (Math.random() - 0.5) * max_move;
    label.y += (Math.random() - 0.5) * max_move;

    // hard wall boundaries
    if (label.x > w - label.width / 2) label.x = x_old;
    if (label.x < 0 + label.width / 2) label.x = x_old;
    if (label.y > h - label.height / 2) label.y = y_old;
    if (label.y < 0 + label.height / 2) label.y = y_old;

    // new energy
    const new_energy = getEnergy(i, lab, anc);

    // delta E
    var delta_energy = new_energy - old_energy;
    // console.log('delta_energy', delta_energy);
    if (Math.random() < Math.exp(-delta_energy / currT)) {
      acceptedMoves += 1;
    } else {
      // move back to old coordinates
      label.x = x_old;
      label.y = y_old;
      rejectedMoves += 1;
    }
  };

  const mcrotate = function(currT) {
    // Monte Carlo rotation move

    // select a random label
    const i = Math.floor(Math.random() * lab.length);
    const label = lab[i];
    const anchor = anc[i];

    // save old coordinates
    const x_old = label.x;
    const y_old = label.y;

    // old energy
    const old_energy = getEnergy(i, lab, anc);

    // random angle
    const angle = (Math.random() - 0.5) * max_angle;
    const s = Math.sin(angle);
    const c = Math.cos(angle);

    // translate label (relative to anchor at origin):
    label.x -= anchor.x;
    label.y -= anchor.y;

    // rotate label
    const x_new = label.x * c - label.y * s;
    const y_new = label.x * s + label.y * c;

    // translate label back
    label.x = x_new + anchor.x;
    label.y = y_new + anchor.y;

    // hard wall boundaries
    if (label.x > w) label.x = x_old;
    if (label.x < 0) label.x = x_old;
    if (label.y > h) label.y = y_old;
    if (label.y < 0) label.y = y_old;

    // new energy
    const new_energy = getEnergy(i, lab, anc);

    // delta E
    var delta_energy = new_energy - old_energy;

    if (Math.random() < Math.exp(-delta_energy / currT)) {
      acceptedMoves += 1;
    } else {
      // move back to old coordinates
      label.x = x_old;
      label.y = y_old;
      rejectedMoves += 1;
    }
  };

  const intersect = function(x1, x2, x3, x4, y1, y2, y3, y4) {
    // returns true if two lines intersect, else false
    // from http://paulbourke.net/geometry/lineline2d/

    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    const numera = (x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3);
    const numerb = (x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3);

    /* Is the intersection along the the segments */
    const mua = numera / denom;
    const mub = numerb / denom;
    return !(mua < 0 || mua > 1 || mub < 0 || mub > 1);
  };

  const cooling_schedule = function(currT, initialT, nsweeps) {
    // linear cooling
    return currT - initialT / nsweeps;
  };

  labeler.start = function(nsweeps) {
    // main simulated annealing function
    const m = lab.length;
    const initialT = 1.0;
    let currT = 1.0;

    for (let i = 0; i < nsweeps; i++) {
      for (let j = 0; j < m; j++) {
        if (Math.random() < 0.5) {
          mcmove(currT);
        } else {
          mcrotate(currT);
        }
      }
      currT = user_defined_schedule
        ? user_defined_schedule(currT, initialT, nsweeps)
        : cooling_schedule(currT, initialT, nsweeps);
    }
  };

  labeler.width = function(x) {
    // users insert graph width
    if (!arguments.length) return w;
    w = x;
    return labeler;
  };

  labeler.height = function(x) {
    // users insert graph height
    if (!arguments.length) return h;
    h = x;
    return labeler;
  };

  labeler.label = function(x) {
    // users insert label positions
    if (!arguments.length) return lab;
    lab = x;
    return labeler;
  };

  labeler.anchor = function(x) {
    // users insert anchor positions
    if (!arguments.length) return anc;
    anc = x;
    return labeler;
  };

  // user defined energy
  labeler.alt_energy = function(x) {
    if (!arguments.length)
      return user_defined_energy ? user_defined_energy : energy;
    user_defined_energy = x;
    return labeler;
  };

  // user defined cooling_schedule
  labeler.alt_schedule = function(x) {
    if (!arguments.length)
      return user_defined_schedule ? user_defined_energy : cooling_schedule;
    user_defined_schedule = x;
    return labeler;
  };

  return labeler;
}

/*
 * Logic khối rubik 3x3 (không phụ thuộc DOM, chạy được cả trong Node để test).
 *
 * Hệ toạ độ theo CSS: x sang phải, y xuống dưới, z hướng về người nhìn.
 *   U: y = -1   D: y = +1   R: x = +1   L: x = -1   F: z = +1   B: z = -1
 * Mỗi viên (cubie) có vị trí gốc `home`, vị trí hiện tại `pos` và ma trận xoay `rot`.
 */
(function (root) {
  'use strict';

  // Ma trận xoay +90 độ theo quy ước của CSS rotateX / rotateY / rotateZ.
  const ROT = {
    x: [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
    y: [[0, 0, 1], [0, 1, 0], [-1, 0, 0]],
    z: [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
  };
  const AXIS_INDEX = { x: 0, y: 1, z: 2 };
  const ALL = [-1, 0, 1];

  // dir: chiều xoay (theo CSS) ứng với lượt xoay thuận chiều kim đồng hồ của ký hiệu đó.
  const BASE_MOVES = {
    R: { axis: 'x', layers: [1], dir: 1 },
    L: { axis: 'x', layers: [-1], dir: -1 },
    U: { axis: 'y', layers: [-1], dir: -1 },
    D: { axis: 'y', layers: [1], dir: 1 },
    F: { axis: 'z', layers: [1], dir: 1 },
    B: { axis: 'z', layers: [-1], dir: -1 },
    M: { axis: 'x', layers: [0], dir: -1 },
    E: { axis: 'y', layers: [0], dir: 1 },
    S: { axis: 'z', layers: [0], dir: 1 },
    r: { axis: 'x', layers: [0, 1], dir: 1 },
    l: { axis: 'x', layers: [-1, 0], dir: -1 },
    u: { axis: 'y', layers: [-1, 0], dir: -1 },
    d: { axis: 'y', layers: [0, 1], dir: 1 },
    f: { axis: 'z', layers: [0, 1], dir: 1 },
    b: { axis: 'z', layers: [-1, 0], dir: -1 },
    x: { axis: 'x', layers: ALL, dir: 1 },
    y: { axis: 'y', layers: ALL, dir: -1 },
    z: { axis: 'z', layers: ALL, dir: 1 },
  };

  function matMul(a, b) {
    const out = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        out[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
    return out;
  }
  function matVec(m, v) {
    return [
      m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
      m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
      m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
    ];
  }
  function transpose(m) {
    return [
      [m[0][0], m[1][0], m[2][0]],
      [m[0][1], m[1][1], m[2][1]],
      [m[0][2], m[1][2], m[2][2]],
    ];
  }

  function faceOf(n) {
    if (n[0] === 1) return 'R';
    if (n[0] === -1) return 'L';
    if (n[1] === -1) return 'U';
    if (n[1] === 1) return 'D';
    if (n[2] === 1) return 'F';
    return 'B';
  }

  function createSolved() {
    const cubies = [];
    for (const x of ALL)
      for (const y of ALL)
        for (const z of ALL) {
          if (x === 0 && y === 0 && z === 0) continue;
          cubies.push({
            home: [x, y, z],
            pos: [x, y, z],
            rot: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
          });
        }
    return { cubies };
  }

  function clone(state) {
    return {
      cubies: state.cubies.map((c) => ({
        home: c.home,
        pos: c.pos.slice(),
        rot: c.rot.map((r) => r.slice()),
      })),
    };
  }

  function makeMove(base, turns) {
    const def = BASE_MOVES[base];
    const abs = Math.abs(turns);
    const prime = turns * def.dir < 0;
    return {
      base,
      axis: def.axis,
      layers: def.layers,
      turns, // số lượt xoay 90 độ, có dấu theo chiều CSS
      name: base + (abs === 2 ? '2' : prime ? "'" : ''),
    };
  }

  // Đọc chuỗi ký hiệu: R, R', R2, Rw / r (xoay 2 lớp), M E S, x y z. Bỏ qua dấu ngoặc và khoảng trắng.
  function parseAlg(text) {
    const moves = [];
    if (!text) return moves;
    const re = /([RLUDFBMESxyzrludfb])(w?)(2?)('?)/g;
    let m;
    while ((m = re.exec(text))) {
      let base = m[1];
      if (m[2] && 'RLUDFB'.includes(base)) base = base.toLowerCase();
      const def = BASE_MOVES[base];
      const turns = def.dir * (m[3] ? 2 : 1) * (m[4] ? -1 : 1);
      moves.push(makeMove(base, turns));
    }
    return moves;
  }

  function invertMove(move) {
    return makeMove(move.base, -move.turns);
  }
  function invertAlg(moves) {
    return moves.slice().reverse().map(invertMove);
  }
  function algToString(moves) {
    return moves.map((m) => m.name).join(' ');
  }

  function applyMove(state, move) {
    const idx = AXIS_INDEX[move.axis];
    const quarter = move.turns > 0 ? ROT[move.axis] : transpose(ROT[move.axis]);
    let m = quarter;
    for (let i = 1; i < Math.abs(move.turns); i++) m = matMul(quarter, m);
    for (const c of state.cubies) {
      if (!move.layers.includes(c.pos[idx])) continue;
      c.pos = matVec(m, c.pos);
      c.rot = matMul(m, c.rot);
    }
    return state;
  }
  function applyAlg(state, moves) {
    for (const mv of moves) applyMove(state, mv);
    return state;
  }

  // Ô màu đang nằm ở vị trí `pos`, quay về hướng `dir`. Trả về null nếu không có.
  function stickerAt(state, pos, dir) {
    for (const c of state.cubies) {
      if (c.pos[0] !== pos[0] || c.pos[1] !== pos[1] || c.pos[2] !== pos[2]) continue;
      const n = matVec(transpose(c.rot), dir);
      for (let k = 0; k < 3; k++) {
        if (n[k] !== 0 && c.home[k] !== n[k]) return null;
      }
      return { face: faceOf(n), home: c.home, n };
    }
    return null;
  }

  const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

  // Các ô màu trên một mặt (9 ô), theo hướng `dir`.
  function faceStickers(state, dir) {
    const k = dir.findIndex((v) => v !== 0);
    const out = [];
    for (const a of ALL)
      for (const b of ALL) {
        const pos = [0, 0, 0];
        pos[k] = dir[k];
        pos[(k + 1) % 3] = a;
        pos[(k + 2) % 3] = b;
        out.push(stickerAt(state, pos, dir));
      }
    return out;
  }

  function isSolved(state) {
    return DIRS.every((dir) => {
      const s = faceStickers(state, dir);
      return s.every((x) => x && x.face === s[0].face);
    });
  }

  function randomScramble(length) {
    const faces = ['R', 'L', 'U', 'D', 'F', 'B'];
    const suffix = ['', "'", '2'];
    const out = [];
    let last = null;
    let beforeLast = null;
    while (out.length < (length || 20)) {
      const f = faces[Math.floor(Math.random() * 6)];
      if (f === last) continue;
      // Tránh kiểu R L R (cùng trục ba lần liên tiếp).
      if (last && beforeLast && BASE_MOVES[f].axis === BASE_MOVES[last].axis && f === beforeLast) continue;
      out.push(f + suffix[Math.floor(Math.random() * 3)]);
      beforeLast = last;
      last = f;
    }
    return out.join(' ');
  }

  // Tạo lượt xoay từ trục, lớp và số lượt 90 độ theo chiều CSS (dùng khi kéo trực tiếp trên khối).
  const LAYER_NAMES = { x: { 1: 'R', '-1': 'L', 0: 'M' }, y: { '-1': 'U', 1: 'D', 0: 'E' }, z: { 1: 'F', '-1': 'B', 0: 'S' } };
  function moveFromLayer(axis, layer, turns) {
    return makeMove(LAYER_NAMES[axis][layer], turns);
  }

  // Gộp các lượt liền nhau trên cùng một lớp (U U' biến mất, U U thành U2).
  function simplify(moves) {
    const out = [];
    for (const m of moves) {
      const last = out[out.length - 1];
      if (last && last.base === m.base) {
        out.pop();
        let t = (((last.turns + m.turns) % 4) + 4) % 4;
        if (t === 3) t = -1;
        if (t !== 0) out.push(makeMove(m.base, t === 2 ? 2 * Math.sign(m.turns) : t));
      } else out.push(m);
    }
    return out;
  }

  // 24 phép xoay của khối lập phương.
  const ROTATIONS = (() => {
    const seen = new Map();
    const id = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const queue = [id];
    seen.set(id.join(), id);
    while (queue.length) {
      const m = queue.shift();
      for (const r of [ROT.x, ROT.y, ROT.z]) {
        const n = matMul(r, m);
        if (!seen.has(n.join())) {
          seen.set(n.join(), n);
          queue.push(n);
        }
      }
    }
    return [...seen.values()];
  })();

  // Hướng cầm khối hiện tại: phép xoay đưa 6 viên tâm từ chỗ gốc tới chỗ đang nằm.
  // Một viên nằm đúng chỗ (so với các tâm) khi ma trận xoay của nó bằng đúng phép xoay này.
  function frameOf(state) {
    const centers = state.cubies.filter((c) => c.home.filter((v) => v === 0).length === 2);
    return ROTATIONS.find((r) => centers.every((c) => matVec(r, c.home).join() === c.pos.join()));
  }

  // Tạo lượt xoay từ trục, các lớp và số lượt 90 độ theo chiều CSS.
  function moveFromSpec(axis, layers, turns) {
    const key = layers.slice().sort((a, b) => a - b).join();
    const base = Object.keys(BASE_MOVES).find((b) => BASE_MOVES[b].axis === axis && BASE_MOVES[b].layers.slice().sort((a, c) => a - c).join() === key);
    return makeMove(base, turns);
  }

  // Cùng một lượt xoay đó, viết lại sau khi cả khối đã bị xoay theo ma trận `rot`.
  function conjugate(move, rot) {
    const e = [0, 0, 0];
    e[AXIS_INDEX[move.axis]] = 1;
    const v = matVec(rot, e);
    const k = v.findIndex((x) => x !== 0);
    const sign = v[k];
    return moveFromSpec('xyz'[k], move.layers.map((l) => l * sign), move.turns * sign);
  }

  const api = {
    frameOf,
    moveFromSpec,
    conjugate,
    AXIS_INDEX,
    DIRS,
    ROTATIONS,
    matMul,
    matVec,
    transpose,
    faceOf,
    makeMove,
    moveFromLayer,
    simplify,
    createSolved,
    clone,
    parseAlg,
    invertMove,
    invertAlg,
    algToString,
    applyMove,
    applyAlg,
    stickerAt,
    faceStickers,
    isSolved,
    randomScramble,
  };

  root.Cube = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

/*
 * Dò mặt khối rubik trong khung hình camera bằng OpenCV.js.
 *
 * Cách làm: tìm cạnh trên từng kênh màu, lấy các vùng kín gần vuông (ứng viên ô màu), rồi tìm một lưới 3x3
 * đi qua nhiều ô nhất. Lưới được khớp bằng bình phương tối thiểu nên chịu được mặt khối nghiêng, xoay nhẹ,
 * và thiếu vài ô do tay che.
 */
(function (root) {
  'use strict';
  const N = 240; // dò trên ảnh thu nhỏ cho nhanh
  let loading = null;
  let work = null;

  // Tải OpenCV.js (khoảng 10 MB) khi cần. Trả về Promise<{ cv }>.
  function load(src) {
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onerror = () => reject(new Error('Không tải được OpenCV.js'));
      s.onload = async () => {
        try {
          let m = root.cv;
          if (m instanceof Promise) m = await m;
          if (!m.Mat) await new Promise((done) => { m.onRuntimeInitialized = done; });
          root.cv = m;
          resolve({ cv: m }); // bọc lại: module của emscripten có thể có hàm then, không nên resolve trực tiếp
        } catch (e) {
          reject(e);
        }
      };
      document.head.appendChild(s);
    });
    loading.catch(() => { loading = null; });
    return loading;
  }

  // Các vùng kín gần vuông trong ảnh: { x, y, size } theo toạ độ ảnh thu nhỏ.
  function candidates(cv, canvas) {
    if (!work) {
      work = document.createElement('canvas');
      work.width = N;
      work.height = N;
    }
    work.getContext('2d', { willReadFrequently: true }).drawImage(canvas, 0, 0, N, N);
    const src = cv.imread(work);
    const channels = new cv.MatVector();
    const edges = cv.Mat.zeros(N, N, cv.CV_8UC1);
    const tmp = new cv.Mat();
    const kernel = cv.Mat.ones(3, 3, cv.CV_8U);
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    const out = [];
    try {
      cv.split(src, channels);
      for (let k = 0; k < 3; k++) {
        const ch = channels.get(k);
        cv.GaussianBlur(ch, ch, new cv.Size(5, 5), 0);
        cv.Canny(ch, tmp, 30, 90);
        cv.bitwise_or(edges, tmp, edges);
        ch.delete();
      }
      cv.dilate(edges, edges, kernel, new cv.Point(-1, -1), 2);
      cv.bitwise_not(edges, edges);
      cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
      const minArea = (0.05 * N) ** 2;
      const maxArea = (0.3 * N) ** 2;
      for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const area = cv.contourArea(cnt);
        if (area >= minArea && area <= maxArea) {
          const rect = cv.minAreaRect(cnt);
          const w = rect.size.width;
          const h = rect.size.height;
          if (w > 0 && h > 0 && Math.min(w, h) / Math.max(w, h) > 0.62 && area / (w * h) > 0.72)
            out.push({ x: rect.center.x, y: rect.center.y, size: Math.sqrt(area) });
        }
        cnt.delete();
      }
    } finally {
      src.delete();
      channels.delete();
      edges.delete();
      tmp.delete();
      kernel.delete();
      contours.delete();
      hierarchy.delete();
    }
    return out;
  }

  // Khớp p = c + i*u + j*v bằng bình phương tối thiểu. cells: [{ i, j, x, y }].
  function fitLattice(cells) {
    const n = cells.length;
    let si = 0, sj = 0, sii = 0, sjj = 0, sij = 0;
    for (const c of cells) {
      si += c.i; sj += c.j; sii += c.i * c.i; sjj += c.j * c.j; sij += c.i * c.j;
    }
    // Ma trận [[n, si, sj], [si, sii, sij], [sj, sij, sjj]]
    const det = n * (sii * sjj - sij * sij) - si * (si * sjj - sij * sj) + sj * (si * sij - sii * sj);
    if (Math.abs(det) < 1e-6) return null;
    const solve = (key) => {
      let b0 = 0, b1 = 0, b2 = 0;
      for (const c of cells) {
        b0 += c[key]; b1 += c.i * c[key]; b2 += c.j * c[key];
      }
      return [
        (b0 * (sii * sjj - sij * sij) - si * (b1 * sjj - sij * b2) + sj * (b1 * sij - sii * b2)) / det,
        (n * (b1 * sjj - sij * b2) - b0 * (si * sjj - sij * sj) + sj * (si * b2 - b1 * sj)) / det,
        (n * (sii * b2 - b1 * sij) - si * (si * b2 - b1 * sj) + b0 * (si * sij - sii * sj)) / det,
      ];
    };
    const X = solve('x');
    const Y = solve('y');
    return { c: [X[0], Y[0]], u: [X[1], Y[1]], v: [X[2], Y[2]] };
  }

  // Tìm lưới 3x3 đi qua nhiều ứng viên nhất. Trả về 4 góc của mặt khối theo toạ độ canvas, hoặc null.
  function find(cv, canvas) {
    const cands = candidates(cv, canvas);
    if (cands.length < 6) return null;
    let best = null;
    for (let a = 0; a < cands.length; a++)
      for (let b = 0; b < cands.length; b++) {
        if (a === b) continue;
        const A = cands[a], B = cands[b];
        if (Math.max(A.size, B.size) / Math.min(A.size, B.size) > 1.45) continue;
        const ux = B.x - A.x, uy = B.y - A.y;
        const pitch = Math.hypot(ux, uy);
        const size = (A.size + B.size) / 2;
        if (pitch < size * 1.0 || pitch > size * 2.1 || ux < 0 || Math.abs(uy) > Math.abs(ux)) continue; // giả thiết: B là ô ngay bên phải A
        // Toạ độ lưới của mọi ứng viên so với A, với v vuông góc u.
        const cells = new Map();
        for (const c of cands) {
          if (Math.max(c.size, size) / Math.min(c.size, size) > 1.45) continue;
          const dx = c.x - A.x, dy = c.y - A.y;
          const fi = (dx * ux + dy * uy) / (pitch * pitch);
          const fj = (-dx * uy + dy * ux) / (pitch * pitch);
          const i = Math.round(fi), j = Math.round(fj);
          if (Math.abs(i) > 2 || Math.abs(j) > 2) continue;
          const err = Math.hypot(fi - i, fj - j);
          if (err > 0.3) continue;
          const key = i + ',' + j;
          if (!cells.has(key) || cells.get(key).err > err) cells.set(key, { i, j, x: c.x, y: c.y, err });
        }
        if (cells.size < 6) continue;
        // Cửa sổ 3x3 chứa nhiều ô nhất.
        for (let i0 = -2; i0 <= 0; i0++)
          for (let j0 = -2; j0 <= 0; j0++) {
            const inside = [...cells.values()].filter((c) => c.i >= i0 && c.i <= i0 + 2 && c.j >= j0 && c.j <= j0 + 2);
            if (inside.length < 6) continue;
            const spanI = new Set(inside.map((c) => c.i)).size;
            const spanJ = new Set(inside.map((c) => c.j)).size;
            if (spanI < 3 || spanJ < 3) continue; // phải thấy đủ 3 cột và 3 hàng mới biết mặt nằm ở đâu
            const err = inside.reduce((s, c) => s + c.err, 0) / inside.length;
            if (!best || inside.length > best.count || (inside.length === best.count && err < best.err))
              best = { count: inside.length, err, cells: inside.map((c) => ({ i: c.i - i0 - 1, j: c.j - j0 - 1, x: c.x, y: c.y })) };
          }
      }
    if (!best) return null;
    const fit = fitLattice(best.cells);
    if (!fit) return null;
    const k = canvas.width / N;
    const corner = (i, j) => ({ x: (fit.c[0] + i * fit.u[0] + j * fit.v[0]) * k, y: (fit.c[1] + i * fit.u[1] + j * fit.v[1]) * k });
    return { tl: corner(-1.5, -1.5), tr: corner(1.5, -1.5), br: corner(1.5, 1.5), bl: corner(-1.5, 1.5), count: best.count };
  }

  root.RubikDetect = { load, find, candidates };
})(window);

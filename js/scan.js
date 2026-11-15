/*
 * Phân loại màu cho việc quét khối bằng camera. Không phụ thuộc DOM, chạy được trong Node để test.
 *
 * Đầu vào: 54 mẫu màu RGB (9 ô mỗi mặt). Ô tâm của mỗi mặt chắc chắn đúng màu của mặt đó, nên 6 ô tâm
 * được dùng làm màu mẫu. Nhờ vậy việc nhận màu tự thích nghi với ánh sáng và màu sticker của từng khối.
 * Sau đó 48 ô còn lại được chia sao cho mỗi màu có đúng 8 ô, thay vì gán từng ô độc lập.
 */
(function (root) {
  'use strict';
  const FACES = ['U', 'F', 'R', 'B', 'L', 'D'];

  // Đặc trưng của một mẫu màu: tỉ lệ đỏ / lục / lam trong tổng (không đổi khi mặt sáng hay tối hơn),
  // cộng thêm độ sáng với trọng số nhỏ để phân biệt các màu có tỉ lệ gần nhau.
  function features(rgb) {
    const sum = rgb[0] + rgb[1] + rgb[2] + 1;
    return [(rgb[0] / sum) * 100, (rgb[1] / sum) * 100, (rgb[2] / sum) * 100, (sum / 765) * 12];
  }
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]);

  // samples: { U: [9 x [r,g,b]], F: ..., ... } -> { U: [9 chữ cái mặt], ... }
  function classify(samples) {
    const ref = {};
    for (const f of FACES) ref[f] = features(samples[f][4]);
    const items = [];
    for (const f of FACES)
      samples[f].forEach((rgb, i) => {
        if (i !== 4) items.push({ f, i, feat: features(rgb), color: null });
      });
    const cost = (item, color) => distance(item.feat, ref[color]);

    // Gán tham lam theo cặp (ô, màu) gần nhất trước, mỗi màu tối đa 8 ô.
    const pairs = [];
    items.forEach((item, k) => FACES.forEach((c) => pairs.push({ k, c, d: cost(item, c) })));
    pairs.sort((a, b) => a.d - b.d);
    const room = Object.fromEntries(FACES.map((c) => [c, 8]));
    for (const p of pairs) {
      if (items[p.k].color || !room[p.c]) continue;
      items[p.k].color = p.c;
      room[p.c]--;
    }
    // Đổi màu giữa hai ô nếu làm tổng sai lệch nhỏ đi, lặp tới khi không cải thiện được nữa.
    for (let improved = true, guard = 0; improved && guard < 50; guard++) {
      improved = false;
      for (let a = 0; a < items.length; a++)
        for (let b = a + 1; b < items.length; b++) {
          const A = items[a], B = items[b];
          if (A.color === B.color) continue;
          if (cost(A, B.color) + cost(B, A.color) < cost(A, A.color) + cost(B, B.color) - 1e-9) {
            [A.color, B.color] = [B.color, A.color];
            improved = true;
          }
        }
    }

    const net = {};
    for (const f of FACES) {
      net[f] = Array(9).fill(null);
      net[f][4] = f;
    }
    for (const item of items) net[item.f][item.i] = item.color;
    return net;
  }

  // Màu chuẩn của một khối rubik thông thường, chỉ dùng để đoán 6 ô tâm là những màu nào.
  const NOMINAL = { U: [245, 245, 245], D: [255, 213, 0], F: [0, 155, 72], B: [0, 70, 173], R: [200, 25, 45], L: [255, 110, 0] };

  // faces: 6 mặt đã chụp theo thứ tự bất kỳ, mỗi mặt là 9 mẫu RGB. Trả về { U: [...], F: [...], ... }.
  // Sáu ô tâm được ghép với sáu màu cùng một lúc (chọn cách ghép có tổng sai lệch nhỏ nhất),
  // nên đỏ và cam không bị nhận trùng nhau như khi đoán riêng từng mặt.
  function identify(faces) {
    const centers = faces.map((f) => features(f[4]));
    const nominal = FACES.map((c) => features(NOMINAL[c]));
    let best = null;
    const walk = (k, used, total, order) => {
      if (best && total >= best.total) return;
      if (k === 6) {
        best = { total, order: order.slice() };
        return;
      }
      for (let c = 0; c < 6; c++) {
        if (used[c]) continue;
        used[c] = true;
        order.push(c);
        walk(k + 1, used, total + distance(centers[k], nominal[c]), order);
        order.pop();
        used[c] = false;
      }
    };
    walk(0, [], 0, []);
    const out = {};
    best.order.forEach((c, k) => {
      out[FACES[c]] = faces[k];
    });
    return out;
  }

  const api = { FACES, features, distance, classify, identify };
  root.RubikScan = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

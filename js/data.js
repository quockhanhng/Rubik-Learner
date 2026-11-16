/*
 * Dữ liệu bài học và công thức. Khối 3D, thư viện và phần luyện tập cùng đọc từ đây.
 *
 * Mỗi công thức:
 *   alg    - chuỗi ký hiệu
 *   prefix - xoay cả khối trước khi dựng tình huống (z2 = lật vàng lên trên, xanh lá vẫn ở trước)
 *   mask   - nhóm ô màu được tô sáng (xem MASKS trong app.js)
 * Tình huống ban đầu được dựng bằng cách chạy ngược công thức từ khối đã giải.
 */
(function (root) {
  'use strict';

  const rep = (alg, n) => Array(n).fill(alg).join(' ');
  // Bộ F2L, OLL, PLL, COLL, WV đầy đủ nằm ở js/sdb.js (do tools/gen-sdb.js sinh ra từ SpeedCubeDB).
  const SDB = root.RUBIK_SDB || require('./sdb.js');

  const algorithms = [
    // ---- Tổ hợp cơ bản ----
    {
      id: 'trig-sexy', family: 'trigger', group: 'trigger', name: 'Sexy move',
      alg: "R U R' U'", prefix: 'z2', mask: 'all',
      note: 'Tổ hợp xuất hiện nhiều nhất. Lặp 6 lần thì khối trở về như cũ.',
    },
    {
      id: 'trig-sledge', family: 'trigger', group: 'trigger', name: 'Sledgehammer',
      alg: "R' F R F'", prefix: 'z2', mask: 'all',
      note: 'Hay đi kèm với sexy move trong các công thức OLL.',
    },

    // ---- OLL 2 bước: tạo chữ thập vàng ----
    {
      id: 'oll-line', family: 'two', kind: 'oll', group: 'oll-cross', name: 'Đường thẳng',
      alg: "F R U R' U' F'", prefix: 'z2', mask: 'yellowCross',
      note: 'Đặt đường thẳng vàng nằm ngang rồi xoay.',
    },
    {
      id: 'oll-l', family: 'two', kind: 'oll', group: 'oll-cross', name: 'Chữ L',
      alg: "F U R U' R' F'", prefix: 'z2', mask: 'yellowCross',
      note: 'Đặt chữ L ở góc trái phía sau (hai cạnh vàng nằm ở phía sau và bên trái).',
    },
    {
      id: 'oll-dot', family: 'two', kind: 'oll', group: 'oll-cross', name: 'Dấu chấm',
      alg: "F R U R' U' F' f R U R' U' f'", prefix: 'z2', mask: 'yellowCross',
      note: 'Chữ f thường nghĩa là xoay cùng lúc 2 lớp phía trước.',
    },

    // ---- OLL 2 bước: lật góc vàng ----
    {
      id: 'oll-sune', family: 'two', kind: 'oll', group: 'oll-corner', name: 'Sune',
      alg: "R U R' U R U2 R'", prefix: 'z2', mask: 'oll',
      note: 'Một góc vàng đã ngửa, đặt nó ở góc trái phía trước.',
    },
    {
      id: 'oll-antisune', family: 'two', kind: 'oll', group: 'oll-corner', name: 'Antisune',
      alg: "R U2 R' U' R U' R'", prefix: 'z2', mask: 'oll',
      note: 'Bản ngược của Sune. Góc đã ngửa đặt ở góc phải phía sau.',
    },
    {
      id: 'oll-h', family: 'two', kind: 'oll', group: 'oll-corner', name: 'H (hai cặp đèn pha)',
      alg: "R U R' U R U' R' U R U2 R'", prefix: 'z2', mask: 'oll',
      note: 'Không góc nào ngửa, các ô vàng nằm ở mặt trái và mặt phải.',
    },
    {
      id: 'oll-pi', family: 'two', kind: 'oll', group: 'oll-corner', name: 'Pi',
      alg: "R U2 R2 U' R2 U' R2 U2 R", prefix: 'z2', mask: 'oll',
      note: 'Không góc nào ngửa, hai ô vàng cùng nằm ở mặt trái.',
    },
    {
      id: 'oll-headlights', family: 'two', kind: 'oll', group: 'oll-corner', name: 'Đèn pha (U)',
      alg: "R2 D R' U2 R D' R' U2 R'", prefix: 'z2', mask: 'oll',
      note: 'Hai góc đã ngửa nằm ở phía sau, hai ô vàng còn lại cùng quay ra trước.',
    },
    {
      id: 'oll-t', family: 'two', kind: 'oll', group: 'oll-corner', name: 'Chữ T',
      alg: "r U R' U' r' F R F'", prefix: 'z2', mask: 'oll',
      note: 'Hai góc đã ngửa nằm bên phải, hai ô vàng còn lại quay ra trước và ra sau.',
    },
    {
      id: 'oll-bowtie', family: 'two', kind: 'oll', group: 'oll-corner', name: 'Nơ bướm (L)',
      alg: "F R' F' r U R U' r'", prefix: 'z2', mask: 'oll',
      note: 'Hai góc đã ngửa nằm chéo nhau: trái phía sau và phải phía trước.',
    },

    // ---- PLL 2 bước: hoán vị góc ----
    {
      id: 'pll-t', family: 'two', kind: 'pll', group: 'pll-corner', name: 'T perm (đổi 2 góc kề)',
      alg: "R U R' U' R' F R2 U' R' U' R U R' F'", prefix: 'z2', mask: 'all',
      note: 'Đổi chỗ hai góc bên phải, kèm hai cạnh trái và phải.',
    },
    {
      id: 'pll-y', family: 'two', kind: 'pll', group: 'pll-corner', name: 'Y perm (đổi 2 góc chéo)',
      alg: "F R U' R' U' R U R' F' R U R' U' R' F R F'", prefix: 'z2', mask: 'all',
      note: 'Dùng khi không mặt bên nào có hai góc cùng màu.',
    },

    // ---- PLL 2 bước: hoán vị cạnh ----
    {
      id: 'pll-ua', family: 'two', kind: 'pll', group: 'pll-edge', name: 'Ua (xoay vòng 3 cạnh)',
      alg: "R U' R U R U R U' R' U' R2", prefix: 'z2', mask: 'all',
      note: 'Mặt đã hoàn chỉnh đặt ở phía sau.',
    },
    {
      id: 'pll-ub', family: 'two', kind: 'pll', group: 'pll-edge', name: 'Ub (xoay vòng 3 cạnh, chiều ngược)',
      alg: "R2 U R U R' U' R' U' R' U R'", prefix: 'z2', mask: 'all',
      note: 'Mặt đã hoàn chỉnh đặt ở phía sau.',
    },
    {
      id: 'pll-h', family: 'two', kind: 'pll', group: 'pll-edge', name: 'H perm (đổi 2 cặp cạnh đối)',
      alg: 'M2 U M2 U2 M2 U M2', prefix: 'z2', mask: 'all',
      note: 'M là lớp giữa, xoay cùng chiều với L.',
    },
    {
      id: 'pll-z', family: 'two', kind: 'pll', group: 'pll-edge', name: 'Z perm (đổi 2 cặp cạnh kề)',
      alg: "M' U M2 U M2 U M' U2 M2", prefix: 'z2', mask: 'all',
      note: 'Sau công thức có thể cần xoay U thêm một lượt để khớp màu.',
    },
  ];

  // ---- Các bộ đầy đủ ----
  // Mỗi trường hợp có nhiều cách (alts); alg là cách đầu tiên. F2L có thêm công thức riêng cho từng khe (slots).
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const SETS = {
    f2l: {
      family: 'f2l', kind: 'f2l', mask: 'pair', title: 'F2L',
      groups: {
        'Free Pairs': 'Cặp sẵn sàng, chỉ việc đưa vào khe',
        'Connected Pairs': 'Góc và cạnh đang dính nhau',
        'Disconnected Pairs': 'Góc và cạnh nằm tách rời',
        'Corner In Slot': 'Góc nằm trong khe, cạnh ở tầng trên',
        'Edge In Slot': 'Cạnh nằm trong khe, góc ở tầng trên',
        'Pieces In Slot': 'Cả góc và cạnh nằm trong khe',
      },
    },
    oll: {
      family: 'oll', kind: 'oll', mask: 'oll', title: 'OLL',
      groups: {
        'OCLL': 'Đã có chữ thập, chỉ lật góc (OCLL)',
        'All Corners Oriented': 'Góc đã ngửa hết, chỉ lật cạnh',
        'T Shapes': 'Hình chữ T',
        'Square Shapes': 'Hình vuông',
        'C Shapes': 'Hình chữ C',
        'W Shapes': 'Hình chữ W',
        'P Shapes': 'Hình chữ P',
        'Fish Shapes': 'Hình con cá',
        'Knight Move Shapes': 'Hình nước đi quân mã',
        'Awkward Shapes': 'Hình khó nhận',
        'L Shapes': 'Hình chữ L nhỏ',
        'Lightning Shapes': 'Hình tia chớp',
        'Line Shapes': 'Hình đường thẳng',
        'Dot Case': 'Dấu chấm (chưa cạnh nào ngửa)',
      },
    },
    pll: {
      family: 'pll', kind: 'pll', mask: 'all', title: 'PLL', suffix: ' perm',
      groups: { 'EPLL': 'Chỉ đổi cạnh', 'Adj Swap': 'Đổi 2 góc kề', 'Opp Swap': 'Đổi 2 góc chéo' },
    },
    coll: {
      family: 'coll', kind: 'coll', mask: 'all', title: 'COLL',
      groups: { 'Sune': 'Sune', 'Anti Sune': 'Antisune', 'H': 'H', 'Pi': 'Pi', 'U': 'U', 'T': 'T', 'L': 'L' },
    },
    wv: { family: 'wv', kind: 'wv', mask: 'oll', title: 'Winter Variation', groups: { '': 'Đưa cặp cuối vào khe và lật luôn góc' } },
  };
  const SLOTS = [
    { id: 'FR', name: 'Khe phải - trước' },
    { id: 'FL', name: 'Khe trái - trước' },
    { id: 'BL', name: 'Khe trái - sau' },
    { id: 'BR', name: 'Khe phải - sau' },
  ];
  const groups = [
    { id: 'trigger', name: 'Tổ hợp cơ bản' },
    { id: 'oll-cross', name: 'OLL 2 bước · Tạo chữ thập' },
    { id: 'oll-corner', name: 'OLL 2 bước · Lật góc' },
    { id: 'pll-corner', name: 'PLL 2 bước · Hoán vị góc' },
    { id: 'pll-edge', name: 'PLL 2 bước · Hoán vị cạnh' },
  ];
  for (const [key, set] of Object.entries(SETS)) {
    for (const [g, label] of Object.entries(set.groups)) groups.push({ id: `${key}-${slug(g) || 'all'}`, name: `${set.title} · ${label}` });
    (SDB.sets[key] || []).forEach((c, i) => {
      const num = /(\d+)$/.exec(c.n);
      const item = {
        id: `${key}-${num && key !== 'coll' ? num[1].padStart(2, '0') : 'x-' + slug(c.n)}`,
        family: set.family, kind: set.kind, group: `${key}-${slug(c.g) || 'all'}`,
        name: c.n + (set.suffix || ''), alg: c.a[0][0], alts: c.a[0], setup: c.s, prefix: 'z2', mask: set.mask, order: i,
      };
      if (c.a.length > 1) item.slots = SLOTS.map((s, k) => ({ ...s, algs: c.a[k] })).filter((s) => s.algs && s.algs.length);
      algorithms.push(item);
    });
  }

  const lessons = [
    {
      id: 'cross',
      title: 'Chữ thập trắng',
      goal: 'Đưa 4 viên cạnh trắng lên mặt trên, màu bên hông khớp với tâm của mặt bên.',
      body: [
        'Cầm khối với tâm trắng ở trên. Tâm không bao giờ đổi chỗ, nên tâm trắng quyết định đây là mặt trắng.',
        'Tìm từng viên cạnh có màu trắng. Xoay tầng dưới để viên đó nằm ngay dưới vị trí của nó (màu bên hông trùng với tâm mặt bên), rồi đưa nó lên.',
        'Bước này chủ yếu là quan sát, chưa cần thuộc công thức. Ba tình huống dưới đây là những gì hay gặp nhất.',
      ],
      cases: [
        { id: 'cross-down', name: 'Cạnh trắng ở tầng dưới, ô trắng hướng xuống', alg: 'F2', prefix: '', mask: 'cross' },
        { id: 'cross-mid', name: 'Cạnh trắng ở tầng giữa', alg: 'R', prefix: '', mask: 'cross' },
        { id: 'cross-flip', name: 'Cạnh đúng chỗ nhưng bị lật', alg: "F U' R U", prefix: '', mask: 'cross' },
      ],
    },
    {
      id: 'corners',
      title: 'Góc trắng',
      goal: 'Hoàn thành tầng trắng: 4 góc trắng vào đúng chỗ.',
      body: [
        'Lật khối để mặt trắng xuống dưới. Từ bước này trở đi, vàng luôn ở trên.',
        'Tìm một góc có màu trắng ở tầng trên. Xoay U để đưa nó về ngay phía trên ô trống của nó, ở góc phải phía trước.',
        'Nhìn xem ô trắng đang quay về hướng nào rồi dùng công thức tương ứng. Nếu một góc trắng kẹt sai chỗ ở tầng dưới, dùng R U R\' để đẩy nó lên tầng trên trước.',
      ],
      cases: [
        { id: 'corner-right', name: 'Ô trắng quay sang phải', alg: "R U R'", prefix: 'z2', mask: 'firstLayer' },
        { id: 'corner-front', name: 'Ô trắng quay ra trước', alg: "F' U' F", prefix: 'z2', mask: 'firstLayer' },
        { id: 'corner-up', name: 'Ô trắng quay lên trên', alg: "R U2 R' U' R U R'", prefix: 'z2', mask: 'firstLayer' },
      ],
    },
    {
      id: 'middle',
      title: 'Tầng giữa',
      goal: 'Đưa 4 viên cạnh không có màu vàng vào tầng giữa.',
      body: [
        'Tìm ở tầng trên một viên cạnh không có màu vàng. Xoay U cho màu mặt bên của nó khớp với tâm, tạo thành một đường dọc cùng màu ở mặt trước.',
        'Xem ô màu trên đỉnh của viên đó trùng với tâm bên phải hay bên trái, rồi dùng công thức đưa sang phía đó.',
        'Nếu viên cạnh nằm sai trong tầng giữa, chèn một viên bất kỳ vào chỗ đó để đẩy nó ra, rồi làm lại.',
      ],
      cases: [
        { id: 'mid-right', name: 'Đưa cạnh sang phải', alg: "U R U' R' U' F' U F", prefix: 'z2', mask: 'f2l' },
        { id: 'mid-left', name: 'Đưa cạnh sang trái', alg: "U' L' U L U F U' F'", prefix: 'z2', mask: 'f2l' },
      ],
    },
    {
      id: 'yellow-cross',
      title: 'Chữ thập vàng',
      goal: 'Tạo chữ thập vàng ở mặt trên. Chưa cần quan tâm màu bên hông.',
      body: [
        'Chỉ nhìn 4 viên cạnh ở mặt trên. Sẽ có một trong ba hình: dấu chấm, chữ L, hoặc đường thẳng.',
        'Với đường thẳng, đặt nó nằm ngang. Với chữ L, đặt nó ở góc trái phía sau. Sau đó xoay công thức.',
        'Nếu chỉ muốn nhớ một công thức: lặp lại F R U R\' U\' F\' sẽ đi từ dấu chấm tới chữ L, tới đường thẳng, rồi tới chữ thập. Sau mỗi lần, đặt lại chữ L về góc trái phía sau hoặc đường thẳng nằm ngang.',
      ],
      cases: [
        { id: 'yc-line', name: 'Đường thẳng', alg: "F R U R' U' F'", prefix: 'z2', mask: 'yellowCross' },
        { id: 'yc-l', name: 'Chữ L', alg: "F U R U' R' F'", prefix: 'z2', mask: 'yellowCross' },
        { id: 'yc-dot', name: 'Dấu chấm', alg: "F R U R' U' F' f R U R' U' f'", prefix: 'z2', mask: 'yellowCross' },
      ],
    },
    {
      id: 'yellow-edges',
      title: 'Khớp cạnh vàng',
      goal: 'Màu bên hông của 4 cạnh vàng khớp với tâm của từng mặt bên.',
      body: [
        'Xoay U cho tới khi có ít nhất 2 cạnh khớp màu với tâm.',
        'Nếu 2 cạnh khớp nằm kề nhau: đặt chúng ở phía sau và bên phải, rồi xoay công thức.',
        'Nếu 2 cạnh khớp nằm đối nhau: xoay công thức một lần từ bất kỳ hướng nào, sẽ ra trường hợp kề nhau.',
      ],
      cases: [
        { id: 'ye-swap', name: 'Đổi cạnh trước và cạnh trái', alg: "R U R' U R U2 R' U", prefix: 'z2', mask: 'llEdges' },
      ],
    },
    {
      id: 'yellow-corners-pos',
      title: 'Đưa góc vàng về đúng chỗ',
      goal: 'Mỗi góc vàng nằm đúng vị trí giữa 3 tâm cùng màu với nó, dù có thể còn bị xoay.',
      body: [
        'Tìm một góc đã nằm đúng chỗ: 3 màu của nó trùng với 3 tâm xung quanh, không cần đúng hướng.',
        'Đặt góc đó ở phía trước bên phải rồi xoay công thức. Ba góc còn lại sẽ đổi chỗ vòng tròn. Có thể phải làm 2 lần.',
        'Nếu không góc nào đúng chỗ, xoay công thức một lần từ hướng bất kỳ rồi tìm lại.',
      ],
      cases: [
        { id: 'yc-cycle', name: 'Xoay vòng 3 góc', alg: "U R U' L' U R' U' L", prefix: 'z2', mask: 'all' },
      ],
    },
    {
      id: 'yellow-corners-twist',
      title: 'Xoay góc vàng',
      goal: 'Lật cả 4 góc cho màu vàng ngửa lên. Khối được giải xong.',
      body: [
        'Đặt một góc chưa ngửa ở phía trước bên phải. Lặp R\' D\' R D cho tới khi ô vàng của góc đó ngửa lên (2 hoặc 4 lần).',
        'Chỉ xoay U để đưa góc chưa ngửa tiếp theo về vị trí trước bên phải, rồi lặp lại. Không xoay cả khối.',
        'Giữa chừng hai tầng dưới trông như bị phá. Đó là bình thường: khi góc cuối cùng ngửa lên, mọi thứ tự trở về đúng chỗ.',
      ],
      cases: [
        {
          id: 'twist-two', name: 'Ví dụ: hai góc kề nhau cần xoay',
          alg: `${rep("R' D' R D", 2)} U ${rep("R' D' R D", 4)} U'`, prefix: 'z2', mask: 'all',
        },
      ],
    },
  ];

  // Sắp công thức theo thứ tự nhóm để thư viện hiển thị đúng trình tự học.
  const order = (a) => groups.findIndex((g) => g.id === a.group);
  algorithms.forEach((a, i) => { a.seq = i; });
  algorithms.sort((a, b) => order(a) - order(b) || a.seq - b.seq);

  const families = [
    { id: 'trigger', name: 'Cơ bản' },
    { id: 'two', name: '2 bước' },
    { id: 'f2l', name: 'F2L' },
    { id: 'oll', name: 'OLL' },
    { id: 'pll', name: 'PLL' },
    { id: 'coll', name: 'COLL' },
    { id: 'wv', name: 'WV' },
  ];

  // Lấy một công thức trong thư viện làm tình huống của bài học (tìm cả trong các cách khác của từng trường hợp).
  const Cube = root.Cube || require('./cube.js');
  const norm = (alg) => Cube.algToString(Cube.parseAlg(alg));
  const ref = (alg, name) => {
    const want = norm(alg);
    const found = algorithms.find((a) => (a.alts || [a.alg]).some((x) => norm(x) === want));
    if (!found) return { id: 'cfop-' + slug(alg.replace(/'/g, 'i')), name: name || alg, alg, prefix: 'z2', mask: 'pair' };
    return { ...found, id: 'cfop-' + found.id, name: name || found.name, alg: found.alts ? found.alts.find((x) => norm(x) === want) : found.alg, fixed: true };
  };
  const refGroup = (group) => algorithms.filter((a) => a.group === group).map((a) => ref(a.alg));

  const cfopLessons = [
    {
      id: 'cfop-cross',
      title: 'Chữ thập dưới đáy',
      goal: 'Làm chữ thập trắng ngay ở mặt dưới, không lật khối sau khi xong.',
      body: [
        'CFOP giữ mặt trắng ở dưới suốt cả lần giải. Làm chữ thập ở đáy lúc đầu sẽ khó nhìn hơn, nhưng đổi lại không mất thời gian lật khối và mắt luôn thấy được tầng trên để tìm cặp F2L.',
        'Cách tập: giải chữ thập như cũ nhưng cầm trắng ở dưới, và cố nghĩ trước cả 4 cạnh trước khi xoay. Mục tiêu lâu dài là xong chữ thập trong 8 lượt trở xuống.',
        'Ba tình huống dưới đây là ba vị trí cơ bản của một cạnh trắng so với chỗ của nó.',
      ],
      cases: [
        { id: 'cfop-cross-up', name: 'Cạnh ở tầng trên, ô trắng quay lên', alg: 'F2', prefix: 'z2', mask: 'cross' },
        { id: 'cfop-cross-mid', name: 'Cạnh ở tầng giữa', alg: "R'", prefix: 'z2', mask: 'cross' },
        { id: 'cfop-cross-front', name: 'Cạnh ở tầng trên, ô trắng quay ra trước', alg: "U' R' F R", prefix: 'z2', mask: 'cross' },
      ],
    },
    {
      id: 'cfop-f2l-insert',
      title: 'F2L: đưa cặp vào khe',
      goal: 'Hiểu ý tưởng F2L: góc trắng và cạnh tầng giữa đi cùng nhau vào khe, thay vì giải riêng từng viên.',
      body: [
        'Mỗi khe ở hai tầng dưới cần một góc trắng và một cạnh. F2L ghép hai viên đó thành một cặp ở tầng trên, rồi đưa cả cặp xuống trong một lần. Làm 4 lần là xong hai tầng.',
        'Trên khối bên trái, chỉ chữ thập và cặp đang giải được tô màu. Khe cần điền nằm ở góc phải phía trước.',
        'Mọi trường hợp F2L cuối cùng đều quy về một trong bốn kiểu đưa cặp vào khe dưới đây. Hai kiểu đầu là cặp đã dính liền nhau; hai kiểu sau là góc và cạnh nằm tách ra, gặp nhau ngay lúc đi xuống.',
      ],
      cases: [
        ref("R U' R'", 'Cặp dính liền, đưa vào từ bên phải'),
        ref("F' U F", 'Cặp dính liền, đưa vào từ phía trước'),
        ref("R U R'", 'Góc và cạnh tách rời, đưa vào từ bên phải'),
        ref("F' U' F", 'Góc và cạnh tách rời, đưa vào từ phía trước'),
      ],
    },
    {
      id: 'cfop-f2l-pair',
      title: 'F2L: ghép cặp ở tầng trên',
      goal: 'Khi cả góc và cạnh đều ở tầng trên, đưa chúng về một trong bốn kiểu cơ bản.',
      body: [
        'Quy tắc chung: giấu một viên xuống bằng R hoặc F\', xoay U để viên kia tới đúng vị trí, rồi đưa viên đã giấu lên lại. Lúc đó hai viên đã thành cặp hoặc sẵn sàng đi xuống.',
        'Xem chậm ba ví dụ dưới đây và để ý: nửa đầu công thức là lúc ghép cặp, ba lượt cuối luôn là một kiểu đưa cặp vào khe ở bài trước.',
        'Đừng học thuộc 41 trường hợp ngay. Tự giải bằng cách ghép cặp trước, khi đã quen thì mở thư viện ra so với công thức ngắn nhất.',
      ],
      cases: [
        ref("R U' R' U R U R'", 'Ô trắng quay ngang, cạnh nằm sát góc nhưng không khớp màu'),
        ref("R U R' U2 R U' R'", 'Ô trắng quay ngang, cạnh nằm xa góc'),
        ref("R U2 R' U' R U R'", 'Ô trắng quay lên, cạnh nằm sát góc'),
      ],
    },
    {
      id: 'cfop-f2l-stuck',
      title: 'F2L: viên bị kẹt trong khe',
      goal: 'Xử lý khi góc hoặc cạnh đã nằm trong khe nhưng sai chỗ hoặc sai hướng.',
      body: [
        'Nếu một viên nằm trong khe mà chưa đúng, đưa nó lên tầng trên bằng R U R\' hoặc R U\' R\', rồi giải như bài trước. Công thức trong thư viện làm đúng việc đó nhưng gộp lại cho ngắn hơn.',
        'Mẹo: trước khi lấy viên kẹt ra, xoay U để viên còn lại nằm ở chỗ thuận lợi. Như vậy lúc lấy ra hai viên đã gần thành cặp.',
        'Trường hợp cả góc và cạnh cùng kẹt trong khe là dài nhất, nhưng cũng ít gặp nhất.',
      ],
      cases: [
        ref("R U' R' U R U' R'", 'Góc kẹt trong khe, cạnh ở tầng trên'),
        ref("R U' R' U2 R U' R'", 'Cạnh kẹt trong khe, góc ở tầng trên'),
        ref("R U' R' U R U2 R' U R U' R'", 'Cả cặp kẹt trong khe, góc bị xoay'),
      ],
    },
    {
      id: 'cfop-oll',
      title: 'OLL 2 bước',
      goal: 'Làm cả mặt trên thành màu vàng bằng 2 công thức: tạo chữ thập, rồi lật góc.',
      body: [
        'OLL đầy đủ có 57 công thức. Bản 2 bước chỉ cần 10: bước một tạo chữ thập vàng (3 trường hợp), bước hai lật 4 góc (7 trường hợp).',
        'Bước một nhìn 4 cạnh vàng để nhận ra dấu chấm, chữ L hoặc đường thẳng. Bước hai đếm số góc đã ngửa và nhìn các ô vàng bên hông để nhận ra trường hợp.',
      ],
      cases: [...refGroup('oll-cross'), ...refGroup('oll-corner')],
    },
    {
      id: 'cfop-pll',
      title: 'PLL 2 bước',
      goal: 'Đưa các viên tầng trên về đúng chỗ bằng 2 công thức: góc trước, cạnh sau.',
      body: [
        'PLL đầy đủ có 21 công thức. Bản 2 bước chỉ cần 6: bước một đưa 4 góc về đúng chỗ (2 trường hợp), bước hai đưa 4 cạnh về đúng chỗ (4 trường hợp).',
        'Bước một: tìm mặt bên có hai góc cùng màu ("đèn pha"). Nếu có, đặt nó bên trái và dùng T perm. Nếu không mặt nào có, dùng Y perm.',
        'Bước hai: nếu có một mặt bên đã hoàn chỉnh, đặt nó ra sau và dùng Ua hoặc Ub. Nếu không có, dùng H perm hoặc Z perm.',
      ],
      cases: [...refGroup('pll-corner'), ...refGroup('pll-edge')],
    },
  ];

  const tracks = [
    { id: 'lbl', name: 'Từng tầng', desc: 'Cho người mới, 7 bước', lessons },
    { id: 'cfop', name: 'CFOP', desc: 'Giải nhanh, có F2L', lessons: cfopLessons },
  ];

  const data = { algorithms, groups, families, tracks, source: SDB.source };
  root.RUBIK_DATA = data;
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(typeof window !== 'undefined' ? window : globalThis);

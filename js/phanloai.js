/* =========================================================================
   Phân loại rác — a small game in Gem's studio, by Tagom's sorting rules
   (their six posters, used whole with Tagom's permission, 23/10/2026).

   Loaded only when someone opens it (js/studio.js phanloaiSheet), so the
   studio itself stays light. Five levels, each opened by the one before
   (kept in this browser, gem-pl):
     1. the tools, gently (no clock, a hint for a slip): one bottle taken
        apart with them, Tagom's way (the cap to plastic 2-4-5, the label to
        hard nylon, the bottle squashed flat to plastic 1), then a cup to
        rinse, an air cushion to let down, a snack bag to fold (level 4
        uses all six tools);
     2. ten things picked at random, each to one of Tagom's six bags, or to
        general waste (food scraps: Tagom takes none).
        The boxes, cups, trays and jars that are hard to tell by eye carry
        their plastic number, as on Tagom's posters (and on the things
        themselves); nylon, which Tagom sorts by feel (no numbers), is felt:
        tapped it is squeezed (hard nylon crinkles, a manga sound word, soft
        makes none), its two grips pull it (soft stretches, hard won't);
     3. sixty seconds, as many as you can: a wrong bag costs 3 seconds;
     4. the table after a party: eight things, some to get ready first (the
        cap off, the label off, squashed, rinsed, the air out, folded), then
        each in its bag, in 90 seconds; a clear table opens level 5;
     5. the party goes on: six on the table, ten more landing faster and
        faster, each with its own time: too late and it goes in the bin,
        five in the bin and it overflows, the round lost.
   Food scraps, the pump bottle and the bucket are いらすとや's pictures
   (irasutoya.com, credited on the first page, Anna 24/10).
   Udon tugs a trouser hem at the first mistake of a round; after that, a
   hint only. The end says where to take what was sorted: Tagom's station,
   and what Gem takes too (flat foam sheets, whole CDs: there, not a bag in
   the game). Pictures: tools/rac-assets.py -> images/studio/rac, tagom.
   ========================================================================= */
(function () {
  'use strict';

  var R = 'images/studio/rac/', T = 'images/studio/tagom/';
  var ROUND = 10;

  // Tagom's six bags (yellow posters: nylon, pink: plastic)
  var BINS = [
    { id: 'nilon-cung', poster: 'nilon-cung', tone: 'y' },
    { id: 'nilon-mem',  poster: 'nilon-mem',  tone: 'y' },
    { id: 'nhua-1-de',  poster: 'nhua-1-de',  tone: 'p' },
    { id: 'nhua-1-kho', poster: 'nhua-1-kho', tone: 'p' },
    { id: 'nhua-245',   poster: 'nhua-245',   tone: 'p' },
    { id: 'nhua-67',    poster: 'nhua-67',    tone: 'p' },
    // not Tagom's: what they don't take (food scraps), in a plain bag
    { id: 'rac-thuong', poster: null,         tone: 'g' }
  ];
  var POSTERS = ['nilon-cung', 'nilon-mem', 'nhua-1-de', 'nhua-1-kho', 'nhua-245', 'nhua-67'];

  // The things to sort, as on Tagom's posters. bin: where it goes; code: the
  // plastic number shown on it, only where the thing is hard to tell by eye
  // (Anna 23/10: boxes, cups, trays, jars; not a toothbrush, a CD, foam)
  var ITEMS = [
    { id: 'chai-tran', bin: 'nhua-1-de' }, { id: 'chai-to', bin: 'nhua-1-de' }, { id: 'lo-keo', bin: 'nhua-1-de', code: 1 },
    { id: 'hu-kem', bin: 'nhua-1-de', code: 1 }, { id: 'chai-dau', bin: 'nhua-1-de' },
    { id: 'ly-tra-sua', bin: 'nhua-1-kho', code: 1 }, { id: 'nap-cau', bin: 'nhua-1-kho', code: 1 },
    { id: 'hop-banh', bin: 'nhua-1-kho', code: 1 }, { id: 'khay-den', bin: 'nhua-1-kho', code: 1 },
    { id: 'lo-thuoc', bin: 'nhua-1-kho', code: 1 },
    { id: 'can-giat', bin: 'nhua-245', code: 2 }, { id: 'binh-sua', bin: 'nhua-245', code: 2 }, { id: 'nap-chai', bin: 'nhua-245' },
    { id: 'hop-com', bin: 'nhua-245', code: 5 }, { id: 'do-choi', bin: 'nhua-245' },
    { id: 'hop-sua-chua', bin: 'nhua-67', code: 6 }, { id: 'thia', bin: 'nhua-67' }, { id: 'dia', bin: 'nhua-67', code: 6 },
    { id: 'ban-chai', bin: 'nhua-67' },
    { id: 'goi-snack', bin: 'nilon-cung' }, { id: 'vo-banh', bin: 'nilon-cung' }, { id: 'tui-zip', bin: 'nilon-cung' },
    { id: 'bao-gao', bin: 'nilon-cung' }, { id: 'tui-vai', bin: 'nilon-cung' },
    { id: 'tui-bong', bin: 'nilon-mem' }, { id: 'mang-boc', bin: 'nilon-mem' }, { id: 'xop-hoi', bin: 'nilon-mem' },
    { id: 'tui-khi', bin: 'nilon-mem' }, { id: 'tui-goi-hang', bin: 'nilon-mem' },
    { id: 'dia-cd', bin: 'nhua-67' }, { id: 'xop', bin: 'nhua-67' },
    // いらすとや's (by: credited): the pump bottle and the bucket as Tagom's 2-4-5
    // poster has them (pumps, flexible single-layer plastic); food scraps
    { id: 'chai-bom', bin: 'nhua-245', by: 'irasutoya' }, { id: 'xo', bin: 'nhua-245', by: 'irasutoya' },
    { id: 'xuong-ca', bin: 'rac-thuong', by: 'irasutoya' }, { id: 'vo-trung', bin: 'rac-thuong', by: 'irasutoya' },
    { id: 'loi-tao', bin: 'rac-thuong', by: 'irasutoya' }
  ];
  // level 1 has Tagom's six bags; from level 2, general waste as well
  var BIN_IDS = ['nilon-cung', 'nilon-mem', 'nhua-1-de', 'nhua-1-kho', 'nhua-245', 'nhua-67'];
  var ALL_BINS = BIN_IDS.concat('rac-thuong');

  // the table (levels 1, 4, 5): what a thing wants doing before it goes in
  // a bag (a bottle: cap and label off before it is squashed)
  var PREP = { chai: ['nap', 'tem', 'bep'], 'chai-dau-nap': ['nap', 'tem', 'bep'], 'ly-tra-sua': ['rua'], 'tui-khi': ['xep'], 'goi-snack': ['gap'] };
  var TOOLS = ['nap', 'tem', 'bep', 'rua', 'xep', 'gap'];
  // the bottles, and what comes off them: things of their own on the table
  var EXTRA = { chai: 'nhua-1-de', 'chai-dau-nap': 'nhua-1-de', nap: 'nhua-245', tem: 'nilon-cung' };
  // a bottle's pictures: cap and label on; bare (cap cut from the first)
  var BOTTLE = { chai: { full: 'chai', bare: 'chai-tran' }, 'chai-dau-nap': { full: 'chai-dau-nap', bare: 'chai-dau', cls: ' is-dau' } };
  // the rest, before and after: [the step, its picture before, after]
  var STEP_PIC = { 'ly-tra-sua': ['rua', 'ly-tra-sua-day', 'ly-tra-sua'], 'tui-khi': ['xep', 'tui-khi', 'tui-khi-xep'],
                   'goi-snack': ['gap', 'goi-snack', 'goi-snack-gap'] };
  // what else a party leaves (ids in ITEMS)
  var PARTY = ['hop-banh', 'thia', 'dia', 'nap-cau', 'vo-banh', 'hop-sua-chua', 'chai-to', 'hop-com', 'tui-bong',
               'khay-den', 'lo-keo', 'mang-boc', 'tui-zip', 'nap-chai', 'chai-tran', 'xuong-ca', 'vo-trung', 'loi-tao'];
  // h, p, g: the title, the line under it, the how-to card's; ms: the time
  // (none: level 1); bpm: the music, and in the last ten seconds; lead: how
  // many that need work are on the table at the start. Level 5: life, how
  // long a thing waits, and per, more for each step it needs; gap, the
  // wait for the next to land (the first, the last); apart: the first six
  // run out that far apart; bin: things gone in the bin before it overflows
  // (easier 24/10: a player who knows every answer lost from 1.5 s a tap)
  var TABLE = {
    chai: { n: 1, intro: 1, h: 'pl.chai_h', p: 'pl.chai_p', g: 'pl.g1_p', queue: ['ly-tra-sua', 'tui-khi', 'goi-snack'] },
    ban:  { n: 4, h: 'pl.ban_h', p: 'pl.ban_p', g: 'pl.g4_p', ms: 90000, bpm: 92, fast: 116, start: 8, lead: 4, plain: 4,
            prep: ['chai', 'ly-tra-sua', 'tui-khi', 'goi-snack'], swap: 1 },
    tiec: { n: 5, h: 'pl.tiec_h', p: 'pl.tiec_p', g: 'pl.g5_p', ms: 150000, bpm: 100, fast: 126, start: 6, lead: 2, plain: 10,
            life: 26000, per: 8000, gap: [8000, 6000], apart: 5000, bin: 5, prep: ['chai', 'chai-dau-nap', 'ly-tra-sua', 'tui-khi', 'goi-snack', 'ly-tra-sua'] }
  };
  // the tools, drawn here (24 x 24, a line in the ink colour)
  var ICON = {
    nap: '<path d="M9.5 21.5v-6h5v6"/><rect x="7" y="7" width="10" height="5" rx="1.2" transform="rotate(-14 12 9.5)"/><path d="M9.5 8.6l.6 2.4M12 8l.6 2.4M14.5 7.4l.6 2.4"/><path d="M19.5 7V2.5M17.7 4.2l1.8-1.8 1.8 1.8"/>',
    tem: '<path d="M7 3h10M8 3v18h8V3"/><path d="M8 9h8v6h-3"/><path d="M13 15c0 1.6 1.2 2.6 3.4 2.4"/><path d="M13 15l3.4 2.4"/>',
    bep: '<path d="M2.5 12h4M17.5 12h4"/><path d="M4.5 9l3 3-3 3M19.5 9l-3 3 3 3"/><rect x="10" y="5" width="4" height="14" rx="1.5"/>',
    rua: '<path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z"/><path d="M9 14.5a3 3 0 0 0 3 3"/>',
    xep: '<path d="M4 9c3-2 9-2 12 0v6c-3 2-9 2-12 0z"/><path d="M8 8.5v7M12 8.5v7"/><path d="M18.5 10c1.5.7 1.5 3.3 0 4M21 8.5c2.2 1.6 2.2 5.4 0 7"/>',
    gap: '<path d="M3 7l4.5 10L12 7l4.5 10L21 7"/>'
  };

  // the numbers, as on Tagom's posters
  var RESIN ={ 1: 'PET', 2: 'HDPE', 4: 'LDPE', 5: 'PP', 6: 'PS', 7: 'OTHER' };
  var ARROWS = 'M23.3 9L33.2 25.5M27.9 23.3L33.2 25.5L33.7 19.8M29.9 31L10.1 31M14.7 27.6L10.1 31L14.7 34.4M6.8 25.5L16.7 9M17.2 14.7L16.7 9L11.4 11.2';

  // Tagom's station (Anna 23/10): the fanpage has the hours as they change
  var TAGOM_ADDR = 'Số 105B1 (mặt sau), ngõ 3 Khuất Duy Tiến, Thanh Xuân Bắc, Hà Nội';
  var TAGOM_FB = 'https://www.facebook.com/tagom.tamer/';
  var maps = function (q) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q); };

  var STR = {
    'pl.title':     { vi: `Phân loại rác cùng GemxTagom`, en: `Sorting waste with GemxTagom` },
    // who made it, on what (Anna 24/10)
    'pl.lead':      { vi: `Trò chơi do Gem Chạm Sắc phát triển, dựa trên cách phân loại của Tagom, nhóm thu gom rác tái chế ở Hà Nội. Chạm một poster để xem kĩ, hoặc chơi thử.`,
                      en: `A game made by Gem Chạm Sắc, on the way Tagom sorts waste (a recycling collection group in Hanoi). Tap a poster to look closer, or have a go.` },
    // the levels: each opens the next
    'pl.levels':    { vi: `Các màn chơi`, en: `Levels` },
    'pl.lv':        { vi: `Màn {n}`, en: `Level {n}` },
    'pl.lv1':       { vi: `Cái chai và các dụng cụ`, en: `A bottle and the tools` },
    'pl.lv2':       { vi: `Phân loại 10 món`, en: `Sort ten things` },
    'pl.lv3':       { vi: `Thử thách 60 giây`, en: `The 60-second challenge` },
    'pl.lv4':       { vi: `Dọn bàn sau buổi tiệc`, en: `Clearing up after the party` },
    'pl.lv5':       { vi: `Tiệc chưa tàn`, en: `The party goes on` },
    'pl.lock':      { vi: `Xong màn {n} để mở`, en: `Finish level {n} to open` },
    'pl.lock5':     { vi: `Dọn sạch bàn ở màn 4 để mở`, en: `Clear the table in level 4 to open` },
    'pl.done_lv':   { vi: `Đã xong`, en: `Done` },
    'pl.best3':     { vi: `Kỷ lục: {n} món`, en: `Best: {n}` },
    'pl.stars':     { vi: `{n} trên 3 sao`, en: `{n} of 3 stars` },
    'pl.go_lv':     { vi: `Sang màn {n}`, en: `On to level {n}` },
    'pl.where':     { vi: `Mang rác đi đâu?`, en: `Where to take it?` },
    'pl.posters':   { vi: `Poster của Tagom`, en: `Tagom's posters` },
    'pl.back':      { vi: `← Quay lại`, en: `← Back` },
    'pl.play':      { vi: `Chơi phân loại`, en: `Play` },
    'pl.chai_h':    { vi: `Cái chai và các dụng cụ`, en: `A bottle and the tools` },
    'pl.chai_p':    { vi: `Chọn món, chạm dụng cụ để sửa soạn, rồi kéo vào đúng bao (hoặc chạm bao).`,
                      en: `Pick the thing, tap a tool to get it ready, then drag it to its bag (or tap the bag).` },
    'pl.intro_start': { vi: `Cái chai còn nắp, còn tem: thử chạm "Tháo nắp" ở dưới.`, en: `The bottle still has its cap and label: try "Cap off" below.` },
    'pl.chai_done': { vi: `Xong cái chai: nắp vào nhựa 2-4-5, tem vào nilon cứng, chai bẹp vào nhựa 1 dễ.`,
                      en: `The bottle's done: the cap to plastic 2-4-5, the label to hard nylon, the flat bottle to plastic 1.` },
    'pl.intro_more': { vi: `Thêm ba món nữa, mỗi món một dụng cụ (màn 4 sẽ cần đến).`, en: `Three more, a tool each (level 4 will need them).` },
    'pl.which_tool': { vi: `{x}: dùng dụng cụ nào?`, en: `{x}: which tool?` },
    'pl.try':       { vi: `Thử "{t}" xem.`, en: `Try "{t}".` },
    'pl.ready_now': { vi: `Món này sửa soạn xong rồi: kéo vào bao nha.`, en: `This one's ready: into its bag.` },
    'pl.intro_done': { vi: `Xong màn 1! Sáu dụng cụ này sẽ gặp lại ở màn 4.`, en: `Level 1 done! You'll meet these six tools again in level 4.` },
    'pl.step':      { vi: `Phần {i}/{n}`, en: `Part {i} of {n}` },
    'pl.sort_h':    { vi: `Món này bỏ vào đâu?`, en: `Where does this go?` },
    'pl.sort_p':    { vi: `Kéo món vào đúng bao, hoặc chạm vào bao. Hộp, cốc khó nhận ra có kí hiệu số; nilon thì bóp, kéo thử.`,
                      en: `Drag it to the right bag, or tap the bag. Boxes and cups hard to tell carry their number; nylon: squeeze it, stretch it.` },
    'pl.code':      { vi: `Kí hiệu nhựa số {n} ({r})`, en: `Plastic number {n} ({r})` },
    'pl.feel':      { vi: `Chạm để bóp thử · kéo mép để thử độ giãn`, en: `Tap to squeeze it · pull an edge to stretch it` },
    // sound words, as in a comic
    'pl.sfx_bop':   { vi: `SỘT SOẠT!`, en: `CRINKLE!` },
    'pl.sfx_bop2':  { vi: `sột`, en: `crk` },
    'pl.sfx_dan':   { vi: `GIÃÃN~`, en: `STRETCH~` },
    'pl.sfx_khong': { vi: `KHÔNG GIÃN!`, en: `WON'T STRETCH!` },
    'pl.count':     { vi: `Món {i}/{n} · đúng {ok}`, en: `{i} of {n} · {ok} right` },
    'pl.right':     { vi: `Đúng rồi!`, en: `Right!` },
    'pl.which':     { vi: `{x}: bỏ vào bao nào?`, en: `{x}: which bag?` },
    'pl.wrong':     { vi: `Chưa đúng: món này vào {bin}.`, en: `Not quite: this goes to {bin}.` },
    'pl.see':       { vi: `Xem poster`, en: `See the poster` },
    'pl.next':      { vi: `Món tiếp`, en: `Next` },
    'pl.end_h':     { vi: `Bạn phân loại đúng {ok}/{n} món`, en: `You sorted {ok} of {n} right` },
    'pl.end_all':   { vi: `Đúng hết! Udon vui lắm.`, en: `All right! Udon is delighted.` },
    'pl.end_miss':  { vi: `Mấy món dễ nhầm:`, en: `The tricky ones:` },
    'pl.again':     { vi: `Chơi lượt mới`, en: `Play again` },
    'pl.where_h':   { vi: `Mang rác đã phân loại đi đâu?`, en: `Where to take what you sorted` },
    'pl.where_p':   { vi: `Rửa sạch, để khô, gấp gọn rồi mang đi nha.`, en: `Rinse, dry and fold it flat first.` },
    'pl.tagom_h':   { vi: `Trạm Tagom`, en: `Tagom's station` },
    'pl.tagom_what': { vi: `Nhận nhựa và nilon theo 6 nhóm trên poster.`, en: `Takes plastic and nylon in the six groups on the posters.` },
    'pl.tagom_near': { vi: `Dãy nhà đối diện trường mầm non Thanh Xuân Bắc.`, en: `The row facing Thanh Xuân Bắc kindergarten.` },
    'pl.tagom_hours': { vi: `Thứ 2 – thứ 6: 14h – 19h · Thứ 7, Chủ nhật: 9h – 19h (nghỉ trưa 12h – 14h)`,
                        en: `Mon – Fri: 2pm – 7pm · Sat, Sun: 9am – 7pm (closed 12 – 2pm)` },
    'pl.tagom_fb':  { vi: `Fanpage Tagom (lịch mới nhất)`, en: `Tagom on Facebook (latest hours)` },
    'pl.gem_h':     { vi: `Gem Chạm Sắc`, en: `Gem Chạm Sắc` },
    'pl.gem_what':  { vi: `Gem nhận xốp tấm phẳng, nguyên tấm (không lỗ khoét, không bẻ vụn) và đĩa CD cũ còn nguyên tấm, không vỡ.`,
                      en: `Gem takes flat foam sheets, whole (no cut-outs, not broken up), and old CDs, whole and unbroken.` },
    'pl.map':       { vi: `Chỉ đường`, en: `Directions` },
    'pl.close':     { vi: `Đóng`, en: `Close` },
    'pl.udon':      { vi: `Udon kéo ống quần bạn rồi kìa!`, en: `Udon is tugging at your trousers!` },
    // Udon's line over the tug (the hint in full stays under the stage)
    'pl.ud_wrong':  { vi: `Gâu! Không phải bao này đâu!`, en: `Woof! Not that bag!` },
    'pl.ud_tool':   { vi: `Gâu! Thử dụng cụ khác xem!`, en: `Woof! Try another tool!` },
    'pl.back_play': { vi: `← Chơi tiếp`, en: `← Back to the game` },
    // how to play: a card the first time each level opens, "?" brings it back
    'pl.help':      { vi: `Cách chơi`, en: `How to play` },
    'pl.music_on':  { vi: `Nhạc: bật`, en: `Music: on` },
    'pl.music_off': { vi: `Nhạc: tắt`, en: `Music: off` },
    'pl.g_go':      { vi: `Bắt đầu`, en: `Start` },
    'pl.g1_p':      { vi: `Trước khi vào bao, nhiều món cần sửa soạn một chút.`, en: `Before it goes in a bag, many things need a little getting ready.` },
    'pl.g1_1h':     { vi: `Cái chai: tháo nắp, bóc tem, bóp bẹp`, en: `The bottle: cap off, label off, squash` },
    'pl.g1_1':      { vi: `Chạm dụng cụ ở dưới (hoặc kéo chai lên dụng cụ). Nắp, tem tháo ra thành món riêng.`,
                      en: `Tap a tool below (or drag the bottle onto it). The cap and label come off as things of their own.` },
    'pl.g1_2h':     { vi: `Bỏ vào đúng bao`, en: `Into the right bag` },
    'pl.g1_2':      { vi: `Kéo từng món vào bao, hoặc chạm món rồi chạm bao. Nhầm thì Udon nhắc, không trừ điểm.`,
                      en: `Drag each to its bag, or tap it, then the bag. Udon tells you if it's wrong; no points lost.` },
    'pl.g1_3h':     { vi: `Ba món nữa, ba dụng cụ`, en: `Three more, three tools` },
    'pl.g1_3':      { vi: `Ly trà sữa còn trà: rửa sạch. Túi khí: làm xẹp. Gói snack: gấp gọn. Màn 4 dùng lại cả sáu dụng cụ.`,
                      en: `A cup with tea left: rinse. An air cushion: let the air out. A snack bag: fold. Level 4 uses all six tools.` },
    'pl.g2_p':      { vi: `10 món đồ nhựa, nilon quen thuộc, lần lượt từng món.`, en: `Ten everyday plastic and nylon things, one at a time.` },
    'pl.g2_1h':     { vi: `Nhìn món đồ`, en: `Look at the thing` },
    'pl.g2_1':      { vi: `Món đang chơi hiện ở giữa. Hộp, cốc, khay khó nhận ra có kí hiệu số như in ở đáy đồ thật; nilon thì chạm để bóp thử, kéo mép để thử độ giãn.`,
                      en: `The thing to sort is in the middle. Boxes, cups and trays hard to tell carry their number, as under the real thing; nylon: tap to squeeze it, pull an edge to stretch it.` },
    'pl.g2_2h':     { vi: `Chọn bao`, en: `Pick its bag` },
    'pl.g2_2':      { vi: `Kéo món vào bao, hoặc chạm vào bao. Số trên kí hiệu, nilon cứng hay mềm: so với tên bao.`,
                      en: `Drag it to a bag, or tap the bag. The number, or hard or soft nylon: match it to the bag's name.` },
    'pl.g2_3h':     { vi: `Sai cũng không sao`, en: `Wrong is fine` },
    'pl.g2_3':      { vi: `Udon nhắc bao đúng và lý do, bấm "Xem poster" để xem lại. Không trừ điểm, bấm "Món tiếp" để chơi tiếp.`,
                      en: `Udon tells you the right bag and why; "See the poster" to check. No points lost: "Next" to carry on.` },
    // the clock (levels 3–5)
    'pl.sec':       { vi: `giây`, en: `sec` },
    'pl.minus':     { vi: `−{s} giây`, en: `−{s} s` },
    'pl.ready_go':  { vi: `Bắt đầu!`, en: `Go!` },
    'pl.best_new':  { vi: `Kỷ lục mới!`, en: `A new best!` },
    // level 3
    'pl.fast_h':    { vi: `Thử thách 60 giây`, en: `60 seconds` },
    'pl.fast_p':    { vi: `Phân loại được càng nhiều món càng tốt. Sai bao bị trừ 3 giây.`, en: `Sort as many as you can. A wrong bag costs 3 seconds.` },
    'pl.fast_count': { vi: `Đúng {ok} · Sai {no}`, en: `{ok} right · {no} wrong` },
    'pl.fast_end':  { vi: `Hết giờ! Bạn phân loại đúng {ok} món`, en: `Time! You sorted {ok} right` },
    'pl.best_was':  { vi: `Kỷ lục của bạn: {n} món`, en: `Your best: {n}` },
    'pl.g3_p':      { vi: `60 giây: phân loại được càng nhiều món càng tốt.`, en: `60 seconds: sort as many as you can.` },
    'pl.g3_1h':     { vi: `Nhanh tay`, en: `Be quick` },
    'pl.g3_1':      { vi: `Kéo món vào bao hoặc chạm bao. Xong món này, món mới hiện ngay.`, en: `Drag it to a bag or tap the bag. The next one comes at once.` },
    'pl.g3_2h':     { vi: `Sai bao trừ 3 giây`, en: `A wrong bag costs 3 seconds` },
    'pl.g3_2':      { vi: `Bao đúng sáng lên để bạn nhớ. Udon không kéo chân nữa, nhưng đồng hồ không chờ ai.`,
                      en: `The right bag lights up so you remember. Udon won't tug now, but the clock waits for no one.` },
    'pl.g3_3h':     { vi: `10 giây cuối`, en: `The last ten seconds` },
    'pl.g3_3':      { vi: `Đồng hồ kêu tích tắc, nhạc nhanh hơn. Kỷ lục được lưu trên máy này.`, en: `The clock ticks, the music speeds up. Your best is kept on this device.` },
    // levels 4 and 5: the party table
    'pl.ban_h':     { vi: `Dọn bàn sau buổi tiệc`, en: `Clearing up after the party` },
    'pl.ban_p':     { vi: `Chọn món, sửa soạn bằng dụng cụ, rồi bỏ vào đúng bao.`, en: `Pick a thing, get it ready with a tool, then into its bag.` },
    'pl.tiec_h':    { vi: `Tiệc chưa tàn`, en: `The party goes on` },
    'pl.tiec_p':    { vi: `Mỗi món có giờ riêng: không kịp là vào thùng rác. Đừng để thùng đầy ắp!`,
                      en: `Each thing has its own time: too late and it goes in the bin. Don't let it overflow!` },
    'pl.ban_count': { vi: `Trên bàn: {n} món · nhầm {m}`, en: `On the table: {n} · {m} slips` },
    'pl.tiec_count': { vi: `Thùng rác {w}/{c} · sắp tới {q} · nhầm {m}`, en: `Bin {w}/{c} · {q} to come · {m} slips` },
    'pl.late':      { vi: `Không kịp: {x} vào thùng rác, thành rác chôn lấp.`, en: `Too late: {x} goes in the bin, to landfill.` },
    'pl.late_ok':   { vi: `{x} vào rác thường.`, en: `{x} goes in the general waste.` },
    'pl.thung_h':   { vi: `Thùng rác đầy ắp rồi!`, en: `The bin is overflowing!` },
    'pl.lost_h':    { vi: `Không kịp phân loại, thành rác chôn lấp:`, en: `Too late to sort, gone to landfill:` },
    'pl.tools':     { vi: `Dụng cụ`, en: `Tools` },
    'pl.t.nap':     { vi: `Tháo nắp`, en: `Cap off` },
    'pl.t.tem':     { vi: `Bóc tem`, en: `Label off` },
    'pl.t.bep':     { vi: `Bóp bẹp`, en: `Squash` },
    'pl.t.rua':     { vi: `Rửa sạch`, en: `Rinse` },
    'pl.t.xep':     { vi: `Làm xẹp`, en: `Air out` },
    'pl.t.gap':     { vi: `Gấp gọn`, en: `Fold` },
    // what a thing still has, on its tag
    'pl.c.nap':     { vi: `Còn nắp`, en: `Cap on` },
    'pl.c.tem':     { vi: `Còn tem`, en: `Label on` },
    'pl.c.bep':     { vi: `Chưa bóp bẹp`, en: `Not squashed` },
    'pl.c.rua':     { vi: `Còn trà`, en: `Tea left` },
    'pl.c.xep':     { vi: `Còn hơi`, en: `Air in` },
    'pl.c.gap':     { vi: `Chưa gấp`, en: `Not folded` },
    // into a bag before it is ready: what to do first
    'pl.h.nap':     { vi: `Chai còn nắp: tháo nắp trước đã.`, en: `The cap is still on: take it off first.` },
    'pl.h.tem':     { vi: `Chai còn tem: bóc tem trước đã.`, en: `The label is still on: peel it off first.` },
    'pl.h.bep':     { vi: `Bóp bẹp chai cho gọn đã.`, en: `Squash the bottle first.` },
    'pl.h.rua':     { vi: `Còn trà kìa: rửa sạch đã.`, en: `There's tea left: rinse it first.` },
    'pl.h.xep':     { vi: `Còn hơi kìa: làm xẹp đã.`, en: `Still full of air: let it out first.` },
    'pl.h.gap':     { vi: `Gấp gọn gói snack đã.`, en: `Fold the bag flat first.` },
    'pl.pick_first': { vi: `Chạm chọn một món trên bàn trước nha.`, en: `Tap a thing on the table first.` },
    'pl.no_need':   { vi: `Món này không cần "{t}".`, en: `This one doesn't need "{t}".` },
    'pl.order':     { vi: `Tháo nắp, bóc tem rồi mới bóp bẹp.`, en: `Cap and label off before you squash it.` },
    'pl.did':       { vi: `{t}: xong!`, en: `{t}: done!` },
    'pl.ud_prep':   { vi: `Gâu! Chưa sửa soạn xong đâu!`, en: `Woof! It isn't ready yet!` },
    'pl.sfx_xi':    { vi: `XÌÌÌ~`, en: `PSSSH~` },
    'pl.sfx_bep':   { vi: `BẸP!`, en: `CRUNCH!` },
    'pl.win_h':     { vi: `Bàn sạch bong!`, en: `The table is clear!` },
    'pl.time_h':    { vi: `Hết giờ!`, en: `Time's up!` },
    'pl.win_p':     { vi: `Còn {t} giây · nhầm {m} lần`, en: `{t} s to spare · {m} slips` },
    'pl.left_p':    { vi: `Còn {n} món chưa dọn.`, en: `{n} things still to clear.` },
    'pl.unlock5':   { vi: `Dọn sạch bàn trong 90 giây để mở màn 5.`, en: `Clear the table in 90 seconds to open level 5.` },
    'pl.best_t':    { vi: `Kỷ lục: {s} sao, còn {t} giây`, en: `Best: {s} stars, {t} s to spare` },
    'pl.g4_p':      { vi: `Tiệc xong, trên bàn còn 8 món. Vài món cần sửa soạn trước khi vào bao.`,
                      en: `The party's over: eight things on the table. Some need getting ready before they go in a bag.` },
    'pl.g4_1h':     { vi: `Chọn món`, en: `Pick a thing` },
    'pl.g4_1':      { vi: `Chạm một món trên bàn. Nhãn nhỏ dưới món cho biết món đó còn gì: còn nắp, còn trà, còn hơi…`,
                      en: `Tap a thing on the table. The little tags say what is left: cap on, tea left, air in…` },
    'pl.g4_2h':     { vi: `Sửa soạn`, en: `Get it ready` },
    'pl.g4_2':      { vi: `Chạm dụng cụ (hoặc kéo món lên dụng cụ). Nắp, tem tháo ra thành món riêng. Dùng khi không cần: trừ 2 giây.`,
                      en: `Tap a tool (or drag the thing onto it). A cap or label taken off is a thing of its own. A tool not needed: −2 s.` },
    'pl.g4_3h':     { vi: `Bỏ vào bao`, en: `Into its bag` },
    'pl.g4_3':      { vi: `Chưa sửa soạn xong hay nhầm bao: trừ 5 giây. Dọn sạch bàn trong 90 giây để mở màn 5.`,
                      en: `Not ready, or the wrong bag: −5 s. Clear the table in 90 seconds to open level 5.` },
    'pl.g5_p':      { vi: `Tiệc vẫn vui: cứ vài giây lại có món mới đặt lên bàn.`, en: `The party goes on: every few seconds something new lands on the table.` },
    'pl.g5_1h':     { vi: `16 món, đến nhanh dần`, en: `16 things, coming faster` },
    'pl.g5_1':      { vi: `6 món có sẵn, 10 món đến sau, món sau đến nhanh hơn món trước. Bàn trống thì món tiếp đến ngay.`,
                      en: `Six to start, ten more, each sooner than the last. An empty table brings the next at once.` },
    'pl.g5_2h':     { vi: `Mỗi món có giờ riêng`, en: `Each thing has its own time` },
    'pl.g5_2':      { vi: `Vạch dưới mỗi món ngắn dần. Hết vạch mà chưa phân loại thì món đó vào thùng rác. 5 món là thùng đầy ắp: thua.`,
                      en: `The bar under each thing runs down. When it runs out, the thing goes in the bin. Five and the bin overflows: the round is lost.` },
    'pl.g5_3h':     { vi: `Như màn 4`, en: `As in level 4` },
    'pl.g5_3':      { vi: `Sửa soạn rồi bỏ vào đúng bao, trong 150 giây.`, en: `Get each one ready, then into its bag, in 150 seconds.` },
    // the bags
    'pl.b.nilon-cung': { vi: `Nilon cứng`, en: `Hard nylon` },
    'pl.b.nilon-mem':  { vi: `Nilon mềm`, en: `Soft nylon` },
    'pl.b.nhua-1-de':  { vi: `Nhựa 1 dễ`, en: `Plastic 1, easy` },
    'pl.b.nhua-1-kho': { vi: `Nhựa 1 khó`, en: `Plastic 1, hard` },
    'pl.b.nhua-245':   { vi: `Nhựa 2·4·5`, en: `Plastic 2·4·5` },
    'pl.b.nhua-67':    { vi: `Nhựa 6·7 khó`, en: `Plastic 6·7, hard` },
    'pl.b.rac-thuong': { vi: `Rác thường`, en: `General waste` },
    'pl.credit':       { vi: `Tranh đồ ăn thừa, chai bơm, xô, túi rác:`, en: `Food scraps, pump bottle, bucket, bin bag pictures:` },
    // the bottles and what comes off them, on the table (named as they change)
    'pl.i.nap':       { vi: `Nắp chai`, en: `The cap` },
    'pl.i.tem':       { vi: `Tem nhãn`, en: `The label` },
    'pl.i.chai':      { vi: `Chai nước`, en: `A water bottle` },
    'pl.w.chai':      { vi: `Chai trong suốt số 1, đã tháo nắp, bóc tem, bóp bẹp: nhựa 1 dễ.`, en: `A clear bottle marked 1, cap and label off, squashed: plastic 1, easy.` },
    'pl.i.chai-dau-nap': { vi: `Chai dầu ăn`, en: `A cooking-oil bottle` },
    'pl.w.chai-dau-nap': { vi: `Chai trong suốt số 1, đã tháo nắp, bóc tem, bóp bẹp: nhựa 1 dễ.`, en: `A clear bottle marked 1, cap and label off, squashed: plastic 1, easy.` },
    'pl.w.nap':       { vi: `Nắp chai là nhựa 2-4-5, tháo riêng khỏi chai.`, en: `Caps are plastic 2-4-5: take them off the bottle.` },
    'pl.w.tem':       { vi: `Tem nhãn nhiều lớp, không kéo giãn: nilon cứng.`, en: `A label is many layers, not stretchy: hard nylon.` },
    // the things, and why they go where they go (Tagom's own rules)
    'pl.i.chai-tran':    { vi: `Chai nước trong (đã tháo nắp, bóc tem)`, en: `A clear water bottle (cap and label off)` },
    'pl.w.chai-tran':    { vi: `Chai, lọ trong suốt có kí hiệu số 1.`, en: `Clear bottles and jars marked 1.` },
    'pl.i.chai-to':      { vi: `Chai nước 1,5 lít`, en: `A 1.5-litre water bottle` },
    'pl.w.chai-to':      { vi: `Chai trong suốt có kí hiệu số 1.`, en: `A clear bottle marked 1.` },
    'pl.i.lo-keo':       { vi: `Lọ kẹo nhựa trong`, en: `A clear sweet jar` },
    'pl.w.lo-keo':       { vi: `Lọ trong suốt có kí hiệu số 1.`, en: `A clear jar marked 1.` },
    'pl.i.hu-kem':       { vi: `Hũ mỹ phẩm trong`, en: `A clear cosmetics jar` },
    'pl.w.hu-kem':       { vi: `Hũ trong suốt có kí hiệu số 1.`, en: `A clear jar marked 1.` },
    'pl.i.chai-dau':     { vi: `Chai dầu ăn trong`, en: `A clear cooking-oil bottle` },
    'pl.w.chai-dau':     { vi: `Chai trong suốt có kí hiệu số 1.`, en: `A clear bottle marked 1.` },
    'pl.i.ly-tra-sua':   { vi: `Ly trà sữa nhựa trong`, en: `A clear milk-tea cup` },
    'pl.w.ly-tra-sua':   { vi: `Nhựa số 1 trong suốt nhưng không phải chai lọ, mỏng giòn: nhựa 1 khó.`, en: `Clear plastic 1 but not a bottle or jar, thin and brittle: plastic 1, hard.` },
    'pl.i.nap-cau':      { vi: `Nắp cầu ly nước`, en: `A dome cup lid` },
    'pl.w.nap-cau':      { vi: `Kí hiệu số 1, trong suốt mỏng giòn, không phải chai lọ: nhựa 1 khó.`, en: `Marked 1, thin, brittle and clear, not a bottle or jar: plastic 1, hard.` },
    'pl.i.hop-banh':     { vi: `Hộp nhựa trong đựng bánh`, en: `A clear cake box` },
    'pl.w.hop-banh':     { vi: `Kí hiệu số 1, hộp trong suốt mỏng giòn: nhựa 1 khó.`, en: `Marked 1, a thin, brittle clear box: plastic 1, hard.` },
    'pl.i.khay-den':     { vi: `Khay nhựa đen đựng thịt`, en: `A black meat tray` },
    'pl.w.khay-den':     { vi: `Nhựa số 1 có màu, bề mặt bóng: nhựa 1 khó.`, en: `Plastic 1, coloured and glossy: plastic 1, hard.` },
    'pl.i.lo-thuoc':     { vi: `Lọ thuốc nhựa nâu`, en: `A brown medicine bottle` },
    'pl.w.lo-thuoc':     { vi: `Nhựa số 1 có màu: vào nhựa 1 khó, dù là lọ.`, en: `Coloured plastic 1: hard, even though it's a bottle.` },
    'pl.i.can-giat':     { vi: `Can nước giặt`, en: `A detergent jug` },
    'pl.w.can-giat':     { vi: `Nhựa dẻo, đàn hồi, đơn lớp (HDPE số 2).`, en: `Flexible, single-layer plastic (HDPE, 2).` },
    'pl.i.binh-sua':     { vi: `Bình sữa nhựa trắng`, en: `A white milk jug` },
    'pl.w.binh-sua':     { vi: `Nhựa dẻo, đơn lớp (HDPE số 2).`, en: `Flexible, single-layer plastic (HDPE, 2).` },
    'pl.i.nap-chai':     { vi: `Nắp chai nhựa`, en: `Bottle caps` },
    'pl.w.nap-chai':     { vi: `Nắp chai là nhựa 2-4-5, tháo riêng khỏi chai.`, en: `Caps are plastic 2-4-5: take them off the bottle.` },
    'pl.i.hop-com':      { vi: `Hộp đựng thực phẩm`, en: `A food box` },
    'pl.w.hop-com':      { vi: `Hộp nhựa dẻo có nắp bật (PP số 5).`, en: `A flexible box with a snap lid (PP, 5).` },
    'pl.i.do-choi':      { vi: `Đồ chơi nhựa`, en: `A plastic toy` },
    'pl.w.do-choi':      { vi: `Nhựa dẻo, đơn lớp: nhựa 2-4-5.`, en: `Flexible, single-layer plastic: 2-4-5.` },
    'pl.i.hop-sua-chua': { vi: `Hũ sữa chua`, en: `A yogurt cup` },
    'pl.w.hop-sua-chua': { vi: `Nhựa PS số 6: cứng, giòn.`, en: `PS plastic, 6: rigid and brittle.` },
    'pl.i.thia':         { vi: `Thìa nhựa màu`, en: `A coloured plastic spork` },
    'pl.w.thia':         { vi: `Nhựa màu, cứng, không đàn hồi: nhựa 6-7 khó.`, en: `Coloured, rigid, not flexible: plastic 6-7.` },
    'pl.i.dia':          { vi: `Đĩa nhựa dùng một lần`, en: `A disposable plate` },
    'pl.w.dia':          { vi: `Nhựa cứng số 6.`, en: `Rigid plastic, 6.` },
    'pl.i.ban-chai':     { vi: `Bàn chải đánh răng`, en: `A toothbrush` },
    'pl.w.ban-chai':     { vi: `Nhiều loại nhựa ghép lại: nhựa 6-7 khó.`, en: `Several plastics together: 6-7, hard.` },
    'pl.i.dia-cd':       { vi: `Đĩa CD cũ`, en: `An old CD` },
    'pl.w.dia-cd':       { vi: `Đĩa CD có trên poster nhựa 6-7 khó của Tagom. Đĩa còn nguyên tấm thì Gem cũng nhận.`, en: `CDs are on Tagom's plastic 6-7 poster. Gem takes whole ones too.` },
    'pl.i.goi-snack':    { vi: `Gói snack`, en: `A snack bag` },
    'pl.w.goi-snack':    { vi: `Nhiều lớp, có lớp nhôm, sột soạt khi bóp.`, en: `Many layers, a foil one, crinkly when squeezed.` },
    'pl.i.vo-banh':      { vi: `Vỏ bánh quy`, en: `A biscuit wrapper` },
    'pl.w.vo-banh':      { vi: `Nhiều lớp, không kéo giãn được.`, en: `Many layers, not stretchy.` },
    'pl.i.tui-zip':      { vi: `Túi zip trong`, en: `A clear zip bag` },
    'pl.w.tui-zip':      { vi: `Cứng, sột soạt khi bóp, không kéo giãn: nilon cứng.`, en: `Stiff, crinkly, not stretchy: hard nylon.` },
    'pl.i.bao-gao':      { vi: `Bao gạo dệt`, en: `A woven rice sack` },
    'pl.w.bao-gao':      { vi: `Bao dệt bằng sợi nhựa: nilon cứng.`, en: `Woven from plastic strips: hard nylon.` },
    'pl.i.tui-vai':      { vi: `Túi "vải" không dệt`, en: `A non-woven "fabric" bag` },
    'pl.w.tui-vai':      { vi: `Vải không dệt thật ra là nhựa: nilon cứng.`, en: `Non-woven "fabric" is plastic: hard nylon.` },
    'pl.i.tui-bong':     { vi: `Túi bóng đi chợ`, en: `A market carrier bag` },
    'pl.w.tui-bong':     { vi: `Mềm, kéo giãn được, đơn lớp.`, en: `Soft, stretchy, one layer.` },
    'pl.i.mang-boc':     { vi: `Màng bọc thực phẩm`, en: `Cling film` },
    'pl.w.mang-boc':     { vi: `Mềm, kéo giãn được.`, en: `Soft and stretchy.` },
    'pl.i.xop-hoi':      { vi: `Màng xốp hơi`, en: `Bubble wrap` },
    'pl.w.xop-hoi':      { vi: `Nilon mềm: làm xẹp rồi mang đi.`, en: `Soft nylon: let the air out first.` },
    'pl.i.tui-khi':      { vi: `Túi khí chống sốc`, en: `An air-column cushion` },
    'pl.w.tui-khi':      { vi: `Làm xẹp các cột khí rồi bỏ vào nilon mềm.`, en: `Let the air out, then soft nylon.` },
    'pl.i.tui-goi-hang': { vi: `Túi gói hàng online`, en: `A courier mailer bag` },
    'pl.w.tui-goi-hang': { vi: `Mềm, kéo giãn được: nilon mềm.`, en: `Soft and stretchy: soft nylon.` },
    'pl.i.xop':          { vi: `Tấm xốp phẳng`, en: `A flat foam sheet` },
    'pl.w.xop':          { vi: `Xốp là nhựa PS (số 6): nhựa 6-7 khó. Tấm xốp phẳng, nguyên tấm thì Gem cũng nhận.`, en: `Foam is PS (6): plastic 6-7. Gem takes flat, whole sheets too.` },
    'pl.i.chai-bom':     { vi: `Chai nhựa có vòi bơm`, en: `A pump bottle` },
    'pl.w.chai-bom':     { vi: `Chai nhựa dẻo; vòi bơm cũng có trên poster nhựa 2-4-5 của Tagom.`, en: `A flexible plastic bottle; pumps are on Tagom's 2-4-5 poster too.` },
    'pl.i.xo':           { vi: `Xô nhựa vỡ`, en: `A broken plastic bucket` },
    'pl.w.xo':           { vi: `Nhựa dẻo, đàn hồi, đơn lớp: nhựa 2-4-5.`, en: `Flexible, elastic, single-layer plastic: 2-4-5.` },
    'pl.i.xuong-ca':     { vi: `Xương cá`, en: `Fish bones` },
    'pl.w.xuong-ca':     { vi: `Thức ăn thừa: Tagom không nhận, bỏ rác thường.`, en: `Food scraps: Tagom takes none; general waste.` },
    'pl.i.vo-trung':     { vi: `Vỏ trứng`, en: `An eggshell` },
    'pl.w.vo-trung':     { vi: `Thức ăn thừa: bỏ rác thường (hoặc ủ làm phân).`, en: `Food scraps: general waste (or compost).` },
    'pl.i.loi-tao':      { vi: `Lõi táo`, en: `An apple core` },
    'pl.w.loi-tao':      { vi: `Thức ăn thừa: bỏ rác thường (hoặc ủ làm phân).`, en: `Food scraps: general waste (or compost).` }
  };

  var api = null, root = null, S = null;
  // a new screen: the old one's timers (the clock, the next thing, 3-2-1) check it and stop
  var GEN = 0;

  // the levels in order; each opens when the one before is done
  var LEVELS = [
    { n: 1, id: 'chai', run: function () { table('chai'); } },
    { n: 2, id: 'sort', run: sort },
    { n: 3, id: 'nhanh', run: fast },
    { n: 4, id: 'ban', run: function () { table('ban'); } },
    { n: 5, id: 'tiec', run: function () { table('tiec'); } }
  ];
  function lvOf(id) { return LEVELS.filter(function (L) { return L.id === id; })[0]; }

  function lang() { return window.GemI18n && window.GemI18n.getLang() === 'en' ? 'en' : 'vi'; }
  function t(k) { var s = STR[k]; return s ? s[lang()] : k; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // a line of ours, re-translated when the language changes (i18n.js)
  function tr(tag, k, attrs) { return '<' + tag + ' data-i18n="' + k + '"' + (attrs || '') + '>' + esc(t(k)) + '</' + tag + '>'; }
  function binName(id) { return t('pl.b.' + id); }
  function img(name, cls, alt) { return '<img class="' + (cls || '') + '" src="' + R + name + '.webp" alt="' + esc(alt || '') + '" draggable="false">'; }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- open: the hub, a poster, a level ---------- */
  // a: { openSheet(html, full), body() } from js/studio.js; opts.poster: open on it
  function open(a, opts) {
    api = a;
    if (window.GemI18n && window.GemI18n.add) window.GemI18n.add(STR);
    api.openSheet('<div class="pl" data-pl-view="hub"></div>', true);
    root = api.body().querySelector('.pl');
    root.addEventListener('click', onClick);
    root.addEventListener('pointerdown', onDown);
    clockStop();
    S = { level: null };
    if (opts && opts.poster && POSTERS.indexOf(opts.poster) >= 0) poster(opts.poster, true);
    else hub();
  }

  function view(name, html) {
    GEN++;
    clockStop();
    S.wait = null;
    if (!/^(nhanh|ban|tiec)$/.test(name)) tempo(84);   // the timed levels play it quicker
    root.setAttribute('data-pl-view', name);
    root.innerHTML = html;
    var sh = root.closest('.st-sheet');
    if (sh) sh.scrollTop = 0;
  }

  // how far this visitor has come (the highest level done), and the best rounds
  function prog() { return seen().lv || 0; }
  function keep(o) { try { localStorage.setItem('gem-pl', JSON.stringify(o)); } catch (e) { /* private mode */ } }
  function pass(n) { var o = seen(); if ((o.lv || 0) < n) { o.lv = n; keep(o); } }
  function openLevel(id) {
    var L = lvOf(id);
    if (!L) return;
    if (L.n > prog() + 1) hub(); else L.run();
  }
  // the poster's "Chơi phân loại": the first level not done yet
  function nextLevel() { return LEVELS[Math.min(prog(), LEVELS.length - 1)].id; }

  var LOCK = '<svg class="pl-lock" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7.5" rx="1.5" fill="currentColor"/>' +
    '<path d="M5.2 7V5.2a2.8 2.8 0 0 1 5.6 0V7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  var TICK = '<svg class="pl-lock" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function stars(n) {
    return '<span class="pl-stars" role="img" aria-label="' + esc(t('pl.stars').replace('{n}', n)) + '">' + [1, 2, 3].map(function (k) {
      return '<svg viewBox="0 0 20 20" aria-hidden="true"' + (k <= n ? ' class="is-on"' : '') + '><path d="M10 1.8l2.5 5.2 5.7.8-4.1 4 1 5.6L10 14.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z"/></svg>';
    }).join('') + '</span>';
  }

  function hub() {
    S.level = null;
    var lv = prog(), o = seen();
    view('hub',
      tr('h2', 'pl.title', ' id="st-sheet-title"') + tr('p', 'pl.lead', ' class="st-lead"') +
      tr('h3', 'pl.levels', ' class="pt-label"') +
      '<ol class="pl-levels">' + LEVELS.map(function (L) {
        var open = L.n <= lv + 1, best = o['b' + L.n], sub = '';
        if (!open) sub = LOCK + esc(L.n === 5 ? t('pl.lock5') : t('pl.lock').replace('{n}', L.n - 1));
        else if (L.n === 3 && best) sub = esc(t('pl.best3').replace('{n}', best));
        else if (L.n > 3 && best) sub = stars(best.s);
        else if (L.n <= lv) sub = TICK + esc(t('pl.done_lv'));
        return '<li><button type="button" class="pl-lv' + (open ? '' : ' is-locked') + '" data-pl-go="' + L.id + '"' + (open ? '' : ' disabled') + '>' +
          '<b class="pl-lv-n" aria-hidden="true">' + L.n + '</b>' +
          '<span class="pl-lv-t"><span class="sr-only">' + esc(t('pl.lv').replace('{n}', L.n)) + ': </span>' + esc(t('pl.lv' + L.n)) + '</span>' +
          (sub ? '<small class="pl-lv-s">' + sub + '</small>' : '') + '</button></li>';
      }).join('') + '</ol>' +
      '<div class="pl-acts"><button type="button" class="pt-tool" data-pl-go="where">' + esc(t('pl.where')) + '</button></div>' +
      tr('h3', 'pl.posters', ' class="pt-label"') +
      '<ul class="pl-posters">' + POSTERS.map(function (p) {
        var b = BINS.filter(function (x) { return x.poster === p; })[0];
        return '<li><button type="button" class="pl-poster" data-pl-poster="' + p + '">' +
          '<img src="' + T + p + '.webp" alt="" loading="lazy" draggable="false"><span>' + esc(binName(b.id)) + '</span></button></li>';
      }).join('') + '</ul>' +
      '<p class="pl-credit">' + esc(t('pl.credit')) + ' <a href="https://www.irasutoya.com/" target="_blank" rel="noopener">いらすとや (irasutoya.com)</a></p>');
  }

  function poster(p, fromWall) {
    var mid = S.level === 'sort' && S.items && !fromWall;
    view('poster',
      (mid ? '<button type="button" class="pt-tool pt-mini pl-back" data-pl-go="resume">' + esc(t('pl.back_play')) + '</button>'
        : '<button type="button" class="pt-tool pt-mini pl-back" data-pl-go="hub">' + esc(t('pl.back')) + '</button>') +
      '<figure class="pl-big"><img src="' + T + 'to/' + p + '.webp" alt="' + esc(binName(BINS.filter(function (x) { return x.poster === p; })[0].id)) + '"></figure>' +
      '<div class="pl-acts"><button type="button" class="st-btn" data-pl-go="up">' + esc(t('pl.play')) + '</button></div>');
  }

  /* ---------- the bins (bags) ---------- */
  function bins(ids) {
    return '<div class="pl-bins" role="group">' + ids.map(function (id) {
      var b = BINS.filter(function (x) { return x.id === id; })[0];
      return '<button type="button" class="pl-bin pl-' + b.tone + '" data-pl-bin="' + id + '">' +
        img(id === 'rac-thuong' ? 'tui-rac' : 'bao', '', '') +
        '<span>' + esc(binName(id)) + '</span></button>';
    }).join('') + '</div>';
  }

  /* ---------- level 2: ten things ---------- */
  function sort() {
    // at least one from each bag, the rest at random; one of Gem's two now and then
    var pick = [], by = {};
    shuffle(ITEMS.slice()).forEach(function (it) { (by[it.bin] = by[it.bin] || []).push(it); });
    ALL_BINS.forEach(function (b) { pick.push(by[b].shift()); });
    var rest = shuffle([].concat.apply([], Object.keys(by).map(function (k) { return by[k]; })));
    while (pick.length < ROUND) pick.push(rest.shift());
    S.items = shuffle(pick);
    S.i = 0; S.ok = 0; S.miss = []; S.tugged = false; S.answered = false;
    tempo(84);
    sortView();
    // the next ones in the background (each about 12 KB)
    S.items.forEach(function (it) { var im = new Image(); im.src = R + it.id + '.webp'; });
    renderSort();
    guideFirst('sort');
    musicStart();
  }

  // the round's screen (again after a look at a poster, on the next thing)
  function sortView() {
    S.level = 'sort';
    view('sort',
      head('pl.sort_h') + tr('p', 'pl.sort_p', ' class="st-lead pl-lead"') +
      '<p class="pl-count pt-small" aria-live="polite"></p>' +
      '<div class="pl-stage pl-stage-sort"><div class="pl-one"></div>' + udon() + '</div>' +
      '<p class="pl-say" aria-live="polite"></p>' +
      '<div class="pl-acts pl-next-row" hidden>' +
        '<button type="button" class="pt-tool" data-pl-see hidden>' + esc(t('pl.see')) + '</button>' +
        '<button type="button" class="st-btn" data-pl-go="next">' + esc(t('pl.next')) + '</button></div>' +
      bins(ALL_BINS) +
      guideHtml('sort', 'pl.sort_h', 'pl.g2_p', [
        '<span class="pl-gi">' + S.items.slice(0, 3).map(function (it, k) { return img(it.id, 'pl-gi-' + k, ''); }).join('') + '</span>',
        '<span class="pl-gi">' + img('bao', 'pl-gi-d', '') + '<span class="pl-gi-code">' + codeMark(6) + '</span></span>',
        '<span class="pl-gi">' + img('ud-ngoi-cho', 'pl-gi-d', '') + '</span>']));
  }

  // the plastic number, drawn as on the things themselves (no picture file)
  function codeMark(n) {
    return '<svg class="pl-code" viewBox="0 0 40 46" role="img" aria-label="' + esc(t('pl.code').replace('{n}', n).replace('{r}', RESIN[n])) + '">' +
      '<path d="' + ARROWS + '" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<text x="20" y="27" text-anchor="middle" font-size="14.5" font-weight="800">' + n + '</text>' +
      '<text x="20" y="44" text-anchor="middle" font-size="8.5" font-weight="700">' + RESIN[n] + '</text></svg>';
  }

  /* ---------- how to play ---------- */
  // the level's title with a "?" beside it
  function head(k) {
    var on = musicOn();
    return '<div class="pl-head">' + tr('h2', k, ' id="st-sheet-title"') +
      '<button type="button" class="pt-tool pt-mini pl-help" data-pl-guide aria-label="' + esc(t('pl.help')) + '" title="' + esc(t('pl.help')) + '">?</button>' +
      '<button type="button" class="pt-tool pt-mini pl-music" data-pl-music aria-pressed="' + on + '">' + esc(t(on ? 'pl.music_on' : 'pl.music_off')) + '</button></div>';
  }
  function guideHtml(level, h, p, ills) {
    var n = lvOf(level).n;
    return '<div class="pl-guide" role="dialog" aria-modal="true" aria-labelledby="pl-g-h" hidden><div class="pl-g-card">' +
      '<button type="button" class="pt-own-x pl-g-x" data-pl-guide-go aria-label="' + esc(t('pl.close')) + '">×</button>' +
      '<h3 class="pl-g-h" id="pl-g-h"><span data-i18n="pl.help">' + esc(t('pl.help')) + '</span> · <span data-i18n="' + h + '">' + esc(t(h)) + '</span></h3>' +
      tr('p', p, ' class="pl-g-p"') +
      '<ol class="pl-g-steps">' + ills.map(function (ill, k) {
        return '<li class="pl-g-step">' + ill + '<span class="pl-g-txt"><b>' + (k + 1) + '. ' + tr('span', 'pl.g' + n + '_' + (k + 1) + 'h') + '</b>' +
          tr('span', 'pl.g' + n + '_' + (k + 1)) + '</span></li>';
      }).join('') + '</ol>' +
      '<button type="button" class="st-btn pl-g-go" data-pl-guide-go>' + esc(t('pl.g_go')) + '</button>' +
    '</div></div>';
  }
  // once per level, the first time (gem-pl in this browser)
  function seen() { try { return JSON.parse(localStorage.getItem('gem-pl') || '{}') || {}; } catch (e) { return {}; } }
  function guideFirst(level) { if (!seen()[level]) guideShow(true); }
  function guideShow(on) {
    var g = root.querySelector('.pl-guide');
    if (!g) return;
    g.hidden = !on;
    if (on) { g.querySelector('.pl-g-go').focus({ preventScroll: true }); return; }
    var o = seen();
    o[S.level] = 1;
    keep(o);
    var help = root.querySelector('[data-pl-guide]');
    if (help) help.focus({ preventScroll: true });
    if (S.wait) { var go = S.wait; S.wait = null; countIn(go); }   // a timed level starts now
  }

  // one thing, big, in the middle (levels 2 and 3): its number if it is a
  // hard plastic, its grips if it is nylon
  function card(it) {
    var film = /^nilon-/.test(it.bin) ? it.bin.slice(6) : '';
    return '<button type="button" class="pl-item is-sel is-big" data-pl-item="' + it.id + '"' +
        (film ? ' data-pl-film="' + film + '"' : '') + '>' +
      '<span class="pl-pic">' + (film ? '<span class="pl-stretch">' + img(it.id, '', t('pl.i.' + it.id)) + '</span>' +
          '<span class="pl-grip is-l" data-pl-grip="l" aria-hidden="true"></span><span class="pl-grip is-r" data-pl-grip="r" aria-hidden="true"></span>'
        : img(it.id, '', t('pl.i.' + it.id))) + (it.code ? codeMark(it.code) : '') + '</span>' +
      '<span>' + esc(t('pl.i.' + it.id)) + '</span>' +
      (film ? '<small class="pl-feel">' + esc(t('pl.feel')) + '</small>' : '') + '</button>';
  }

  function renderSort() {
    var it = S.items[S.i];
    root.querySelector('.pl-count').textContent = t('pl.count').replace('{i}', S.i + 1).replace('{n}', S.items.length).replace('{ok}', S.ok);
    root.querySelector('.pl-one').innerHTML = card(it);
    S.sel = it.id;
    S.answered = false;
    root.querySelector('.pl-next-row').hidden = true;
    say('');
  }

  function end() {
    S.level = 'end';
    pass(2);
    view('end',
      '<h2 id="st-sheet-title">' + esc(t('pl.end_h').replace('{ok}', S.ok).replace('{n}', S.items.length)) + '</h2>' +
      '<div class="pl-end-udon">' + img(S.miss.length ? 'ud-ngoi-cho' : 'ud-nhay', '', '') + '</div>' +
      (S.miss.length ? missList(S.miss) : tr('p', 'pl.end_all', ' class="st-lead"')) +
      endActs('sort', 'nhanh'));
  }

  // the tricky ones of a round: where each goes, and Tagom's reason
  function nm(id) { return t('pl.i.' + id); }
  function missList(miss) {
    return miss.length ? tr('p', 'pl.end_miss', ' class="pt-label"') + listOf(miss) : '';
  }
  function listOf(list) {
    return '<ul class="pl-miss">' + list.map(function (it) {
      return '<li>' + img(it.id === 'chai' || it.id === 'chai-dau-nap' ? 'chai-bep' : it.id, '', '') + '<span><b>' + esc(nm(it.id)) + '</b> → ' + esc(binName(it.bin)) +
        '<br><small>' + esc(t('pl.w.' + it.id)) + '</small></span></li>';
    }).join('') + '</ul>';
  }
  // again, the next level (once it is open), where to take it, the levels
  function endActs(again, up) {
    var L = up && lvOf(up);
    return '<div class="pl-acts">' +
      '<button type="button" class="' + (L && L.n <= prog() + 1 ? 'pt-tool' : 'st-btn') + '" data-pl-go="' + again + '">' + esc(t('pl.again')) + '</button>' +
      (L && L.n <= prog() + 1 ? '<button type="button" class="st-btn" data-pl-go="' + up + '">' + esc(t('pl.go_lv').replace('{n}', L.n)) + '</button>' : '') +
      '<button type="button" class="pt-tool" data-pl-go="where">' + esc(t('pl.where')) + '</button>' +
      '<button type="button" class="pt-tool" data-pl-go="hub">' + esc(t('pl.levels')) + '</button>' +
    '</div>';
  }

  /* ---------- the clock (levels 3–5) ----------
     It counts only while the round is seen: the tab in view, the how-to card
     shut. A late timer (a busy phone) doesn't eat the visitor's time. In the
     last ten seconds it ticks, goes red, and the music hurries. */
  var CLOCK = 0;
  // the clock and the count, Udon at the end (level 5: the bin filling up
  // beside him; level 1: no clock)
  function hud(kind) {
    return '<div class="pl-hud' + (kind ? ' is-' + kind : '') + '">' + (kind === 'intro' ? '' :
      '<div class="pl-clock" role="timer"><span class="pl-clock-bar"><i></i></span>' +
      '<b class="pl-clock-s"></b>' + tr('small', 'pl.sec', ' class="pl-clock-u"') + '</div>') +
      '<p class="pl-count pt-small" aria-live="polite"></p>' + (kind === 'bin' ? METER : '') + udon() + '</div>';
  }
  // a bin, drawn here, filled from the bottom as things go in it
  var METER = '<svg class="pl-meter" viewBox="0 0 48 56" aria-hidden="true"><defs><clipPath id="pl-mclip"><path d="M10 17l3 32h22l3-32z"/></clipPath></defs>' +
    '<rect class="pl-meter-fill" x="0" y="49" width="48" height="0" clip-path="url(#pl-mclip)"/>' +
    '<path d="M6 17h36M19 17v-4h10v4M10 17l3 32h22l3-32M19 23v20M24 23v20M29 23v20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  function ready() { return '<div class="pl-ready" aria-live="assertive" hidden><b></b></div>'; }
  function clockSet(ms) { S.clock = { left: ms, all: ms, run: 0, last: 0, sec: 0 }; clockDraw(); }
  function clockStart(end) {
    clockStop();
    S.clock.last = performance.now();
    S.clock.end = end;
    CLOCK = setInterval(clockTick, 100);
  }
  function clockStop() { clearInterval(CLOCK); CLOCK = 0; }
  function clockTick() {
    var c = S && S.clock, now = performance.now();
    if (!c || !c.end || !root || !root.isConnected) { clockStop(); return; }
    var dt = Math.min(250, now - c.last), g = root.querySelector('.pl-guide');
    c.last = now;
    if (document.hidden || (g && !g.hidden)) return;
    c.left -= dt;
    c.run += dt;
    if (S.onRun) S.onRun(c.run);   // level 5: the next thing lands
    if (!CLOCK) return;            // ... and the table may have overflowed
    clockDraw();
    if (c.left <= 0) { clockStop(); c.end(); }
  }
  function clockDraw() {
    var c = S.clock, box = root.querySelector('.pl-clock');
    if (!c || !box) return;
    var s = Math.max(0, Math.ceil(c.left / 1000)), low = c.left <= 10000;
    box.querySelector('i').style.transform = 'scaleX(' + Math.max(0, c.left / c.all).toFixed(3) + ')';
    box.querySelector('.pl-clock-s').textContent = s;
    if (low !== box.classList.contains('is-low')) { box.classList.toggle('is-low', low); tempo(low ? S.bpmFast : S.bpm); }
    if (low && s && s !== c.sec && CLOCK) tick();
    c.sec = s;
  }
  // a slip costs time: "−3 giây" floats up off the clock (the round ends on the next tick)
  function lose(sec) {
    var c = S.clock, box = root.querySelector('.pl-clock');
    if (!c || !box) return;
    c.left = Math.max(0, c.left - sec * 1000);
    var f = document.createElement('span');
    f.className = 'pl-minus';
    f.textContent = t('pl.minus').replace('{s}', sec);
    box.appendChild(f);
    setTimeout(function () { f.remove(); }, 1000);
    clockDraw();
  }
  // 3, 2, 1, go! (after the how-to card, the first time)
  function countIn(go) {
    var g = root.querySelector('.pl-guide');
    if (g && !g.hidden) { S.wait = go; return; }
    var box = root.querySelector('.pl-ready'), b = box.querySelector('b'), n = 3, gen = GEN;
    box.hidden = false;
    (function step() {
      if (gen !== GEN) return;
      b.className = n ? '' : 'is-go';
      b.textContent = n || t('pl.ready_go');
      if (!reduce) { b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; }
      beep(n ? 'G4' : 'C5');
      if (n--) { setTimeout(step, 700); return; }
      setTimeout(function () { if (gen === GEN) box.hidden = true; }, 600);
      go();
    })();
  }

  /* ---------- level 3: sixty seconds ---------- */
  function fast() {
    S.level = 'nhanh';
    S.deck = []; S.cur = null; S.ok = 0; S.no = 0; S.miss = []; S.go = false; S.answered = true; S.tugged = true;
    S.onRun = null;   // only level 5 has things landing
    S.bpm = 100; S.bpmFast = 126;
    tempo(S.bpm);
    S.deck = shuffle(ITEMS.slice());
    view('nhanh',
      head('pl.fast_h') + tr('p', 'pl.fast_p', ' class="st-lead pl-lead"') + hud() +
      '<div class="pl-stage pl-stage-sort"><div class="pl-one"></div>' + ready() + '</div>' +
      '<p class="pl-say" aria-live="polite"></p>' +
      bins(ALL_BINS) +
      guideHtml('nhanh', 'pl.fast_h', 'pl.g3_p', [
        '<span class="pl-gi">' + S.deck.slice(0, 3).map(function (it, k) { return img(it.id, 'pl-gi-' + k, ''); }).join('') + '</span>',
        '<span class="pl-gi"><b class="pl-gi-num is-red">−3</b></span>',
        '<span class="pl-gi"><b class="pl-gi-num">10</b></span>']));
    clockSet(60000);
    fastNext();
    S.answered = true;   // not before "Bắt đầu!"
    guideFirst('nhanh');
    musicStart();
    countIn(function () { S.go = true; S.answered = false; clockStart(fastEnd); });
  }
  function fastNext() {
    if (!S.deck.length) S.deck = shuffle(ITEMS.filter(function (x) { return x !== S.cur; }));
    S.cur = S.deck.shift();
    root.querySelector('.pl-one').innerHTML = card(S.cur);
    S.sel = S.cur.id;
    S.answered = false;
    fastCount();
  }
  function fastCount() {
    root.querySelector('.pl-count').textContent = t('pl.fast_count').replace('{ok}', S.ok).replace('{no}', S.no);
  }
  function dropFast(item, bin) {
    var it = S.cur, one = root.querySelector('.pl-one .pl-item'), gen = GEN;
    if (!S.go || S.answered || !it || item !== it.id) return;
    S.answered = true;
    var ok = bin === it.bin;
    if (ok) { S.ok++; into(bin); hop(); chime(true); say(t('pl.right'), 'ok'); }
    else {
      S.no++;
      if (S.miss.indexOf(it) < 0) S.miss.push(it);
      lose(3);
      chime(false);
      say(t('pl.wrong').replace('{bin}', binName(it.bin)), 'no');
      flash(it.bin);
    }
    if (one) one.classList.add(ok ? 'is-in' : 'is-no');
    fastCount();
    setTimeout(function () { if (gen === GEN && S.go) fastNext(); }, ok ? 380 : 900);
  }
  function fastEnd() {
    S.go = false;
    var o = seen(), best = o.b3 || 0;
    if (S.ok > best) o.b3 = S.ok;
    if ((o.lv || 0) < 3) o.lv = 3;
    keep(o);
    tempo(84);
    view('end',
      '<h2 id="st-sheet-title">' + esc(t('pl.fast_end').replace('{ok}', S.ok)) + '</h2>' +
      '<div class="pl-end-udon">' + img(S.ok > best ? 'ud-nhay' : 'ud-ngoi-cho', '', '') + '</div>' +
      '<p class="pl-best">' + (S.ok > best && best ? esc(t('pl.best_new')) + ' ' : '') + esc(t('pl.best_was').replace('{n}', Math.max(best, S.ok))) + '</p>' +
      missList(S.miss) +
      endActs('nhanh', 'ban'));
  }
  // a wrong bag: the right one lights up a moment
  function flash(bin) {
    var b = root.querySelector('[data-pl-bin="' + bin + '"]');
    if (!b) return;
    b.classList.add('is-right');
    setTimeout(function () { b.classList.remove('is-right'); }, 900);
  }

  /* ---------- the table: level 1 (gently), levels 4 and 5 ----------
     A thing on the table: { k: its own key, id, bin, need: what is left to
     do }. Pick it, a tool for each tag on it, then its bag. A bottle's cap
     and label come off as things of their own. Level 1 has no clock and
     hints for a slip, one thing after another; level 5: more land as you
     go, each with its own time (due) before it goes in the bin. */
  function table(level) {
    var cfg = TABLE[level], five = level === 'tiec', intro = !!cfg.intro;
    S.level = level;
    S.cfg = cfg; S.uid = 0; S.sel = null; S.slips = 0; S.ok = 0; S.miss = []; S.go = false; S.tugged = false; S.fresh = null;
    S.waste = 0; S.lost = []; S.step = 1;
    S.bpm = cfg.bpm || 84; S.bpmFast = cfg.fast || 84;
    tempo(S.bpm);
    var mk = function (id) { return { id: id, bin: EXTRA[id] || ITEMS.filter(function (x) { return x.id === id; })[0].bin }; };
    if (intro) {
      S.table = [thing(mk('chai'))];
      S.queue = cfg.queue.map(mk).map(thing);
    } else {
      // level 4: the water bottle or the cooking-oil one
      var prepIds = cfg.prep.map(function (id) { return cfg.swap && id === 'chai' && Math.random() < 0.5 ? 'chai-dau-nap' : id; });
      var prep = shuffle(prepIds.map(mk)), plain = shuffle(PARTY.slice()).slice(0, cfg.plain).map(mk);
      S.table = shuffle(prep.splice(0, cfg.lead).concat(plain.splice(0, cfg.start - cfg.lead))).map(thing);
      S.queue = shuffle(prep.concat(plain)).map(thing);
    }
    S.landed = 0;
    S.nextAt = five ? cfg.gap[0] : 0;
    S.onRun = five ? tiecRun : null;
    if (five) S.table.forEach(function (th, i) { setLife(th, cfg.apart * i); });   // as if they came apart: not all gone at once
    view(level,
      head(cfg.h) + tr('p', cfg.p, ' class="st-lead pl-lead"') + hud(intro ? 'intro' : five ? 'bin' : '') +
      '<div class="pl-stage pl-stage-ban"><div class="pl-table" role="group"></div>' + (intro ? '' : ready()) + '</div>' +
      '<div class="pl-tools" role="group" aria-label="' + esc(t('pl.tools')) + '">' + TOOLS.map(function (k) {
        return '<button type="button" class="pl-tool" data-pl-tool="' + k + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[k] + '</svg>' +
          '<span>' + esc(t('pl.t.' + k)) + '</span></button>';
      }).join('') + '</div>' +
      '<p class="pl-say" aria-live="polite"></p>' +
      (intro ? '<div class="pl-acts pl-done" hidden><button type="button" class="st-btn" data-pl-go="sort">' + esc(t('pl.go_lv').replace('{n}', 2)) + '</button></div>' : '') +
      bins(intro ? BIN_IDS : ALL_BINS) +
      guideHtml(level, cfg.h, cfg.g, guideIlls(level)));
    if (!intro) clockSet(cfg.ms);
    if (intro) S.sel = S.table[0].k;
    drawTable();
    if (five) binDraw();
    guideFirst(level);
    musicStart();
    if (intro) { S.go = true; say(t('pl.intro_start')); }
    else countIn(function () { S.go = true; clockStart(function () { tableEnd('time'); }); });
  }
  function toolSvg(k) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[k] + '</svg>'; }
  function guideIlls(level) {
    if (level === 'chai') return [
      '<span class="pl-gi">' + img('chai', 'pl-gi-a', '') + '</span>',
      '<span class="pl-gi">' + img('bao', 'pl-gi-d', '') + '</span>',
      '<span class="pl-gi pl-gi-tools">' + toolSvg('rua') + toolSvg('xep') + toolSvg('gap') + '</span>'];
    if (level === 'tiec') return [
      '<span class="pl-gi">' + img('ly-tra-sua-day', 'pl-gi-0', '') + img('goi-snack', 'pl-gi-1', '') + img('chai-dau-nap', 'pl-gi-2', '') + '</span>',
      '<span class="pl-gi">' + img('thung-day', 'pl-gi-d', '') + '</span>',
      '<span class="pl-gi">' + img('bao', 'pl-gi-d', '') + '</span>'];
    return [
      '<span class="pl-gi">' + img('ly-tra-sua-day', 'pl-gi-a', '') + '<i class="pl-gi-chip">' + esc(t('pl.c.rua')) + '</i></span>',
      '<span class="pl-gi pl-gi-tools">' + toolSvg('rua') + toolSvg('nap') + '</span>',
      '<span class="pl-gi">' + img('bao', 'pl-gi-d', '') + '</span>'];
  }
  function thing(x) { return { k: 'k' + (++S.uid), id: x.id, bin: x.bin, need: (PREP[x.id] || []).slice() }; }
  function find(k) { return S.table.filter(function (th) { return th.k === k; })[0]; }
  function has(th, step) { return th.need.indexOf(step) >= 0; }
  // level 5: how long it may wait (longer for each step it needs)
  function setLife(th, run) { th.life = S.cfg.life + S.cfg.per * th.need.length; th.due = run + th.life; }

  // a thing as it is now: a bottle from its two pictures (the cap cut from
  // the one with it), the rest before or after their step
  function thingPic(th) {
    var B = BOTTLE[th.id], P = STEP_PIC[th.id];
    if (B) {
      if (!has(th, 'bep')) return img('chai-bep', '', '');
      if (has(th, 'tem')) return '<span class="pl-chai' + (B.cls || '') + (has(th, 'nap') ? '' : ' is-nocap') + '">' + img(B.full, 'pl-chai-img', '') + '</span>';
      return '<span class="pl-chai' + (B.cls || '') + '">' + img(B.bare, 'pl-chai-img', '') + (has(th, 'nap') ? img(B.full, 'pl-chai-cap', '') : '') + '</span>';
    }
    if (P) return img(has(th, P[0]) ? P[1] : P[2], '', '');
    return img(th.id, '', '');
  }
  function drawTable() {
    var box = root.querySelector('.pl-table');
    if (!box) return;
    box.innerHTML = S.table.map(function (th) {
      var tags = th.need.map(function (n) { return t('pl.c.' + n); });
      return '<button type="button" class="pl-thing' + (S.sel === th.k ? ' is-sel' : '') + (S.fresh === th.k ? ' is-new' : '') + '" data-pl-item="' + th.k + '"' +
          ' aria-pressed="' + (S.sel === th.k) + '" aria-label="' + esc(nm(th.id) + (tags.length ? ': ' + tags.join(', ') : '')) + '">' +
        '<span class="pl-pic">' + thingPic(th) + '</span>' +
        '<span class="pl-tn">' + esc(nm(th.id)) + '</span>' +
        (tags.length ? '<span class="pl-chips">' + tags.map(function (x) { return '<i>' + esc(x) + '</i>'; }).join('') + '</span>' : '') +
        (th.due ? '<span class="pl-life" aria-hidden="true"><i></i></span>' : '') +
      '</button>';
    }).join('');
    S.fresh = null;
    if (S.level === 'tiec' && S.clock) lifeDraw(S.clock.run);
    tableCount();
  }
  function tableCount() {
    var p = root.querySelector('.pl-count'), cfg = S.cfg;
    if (!p) return;
    p.textContent = cfg.intro ? t('pl.step').replace('{i}', S.step).replace('{n}', cfg.queue.length + 1)
      : cfg.bin ? t('pl.tiec_count').replace('{w}', S.waste).replace('{c}', cfg.bin).replace('{q}', S.queue.length).replace('{m}', S.slips)
      : t('pl.ban_count').replace('{n}', S.table.length).replace('{m}', S.slips);
    p.classList.toggle('is-tight', !!cfg.bin && S.waste >= cfg.bin - 2);
  }
  function pick(k) {
    S.sel = k;
    root.querySelectorAll('.pl-thing').forEach(function (b) {
      var on = b.getAttribute('data-pl-item') === k;
      b.classList.toggle('is-sel', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }
  function shake(k) {
    var el = root.querySelector('.pl-thing[data-pl-item="' + k + '"]');
    if (!el || reduce) return;
    el.classList.remove('is-shake'); void el.offsetWidth; el.classList.add('is-shake');
  }
  // a slip: time off the clock, or in level 1 a hint only
  function slip(k, sec, text) {
    S.slips++;
    chime(false);
    shake(k);
    if (S.cfg.intro) { say(text, 'no'); return; }
    lose(sec);
    say(text.replace(/\.$/, '') + ' (' + t('pl.minus').replace('{s}', sec) + ')', 'no');
    tableCount();
  }

  // a tool on the thing picked (or the thing dragged onto it)
  function useTool(k, tool) {
    if (!S.go) return;
    var th = k && find(k), intro = S.cfg.intro;
    if (!th) { say(t('pl.pick_first')); return; }
    if (!has(th, tool)) {
      if (intro) tug('pl.ud_tool');
      slip(th.k, 2, t('pl.no_need').replace('{t}', t('pl.t.' + tool)) +
        (intro ? ' ' + (th.need.length ? t('pl.try').replace('{t}', t('pl.t.' + th.need[0])) : t('pl.ready_now')) : ''));
      return;
    }
    if (tool === 'bep' && (has(th, 'nap') || has(th, 'tem'))) { slip(th.k, 2, t('pl.order')); return; }
    th.need.splice(th.need.indexOf(tool), 1);
    S.sel = th.k;
    if (tool === 'nap' || tool === 'tem') {
      var part = thing({ id: tool, bin: EXTRA[tool] });
      if (th.due) setLife(part, S.clock.run);
      S.table.splice(S.table.indexOf(th) + 1, 0, part);
      S.fresh = S.sel = part.k;
      say(t('pl.which').replace('{x}', nm(tool)));
    } else say(t('pl.did').replace('{t}', t('pl.t.' + tool)) + (intro ? ' ' + t('pl.which').replace('{x}', nm(th.id)) : ''), 'ok');
    drawTable();
    var el = root.querySelector('.pl-thing[data-pl-item="' + th.k + '"]');
    if (tool === 'xep') { sfx(el, t('pl.sfx_xi'), 'xi'); hiss(); }
    else if (tool === 'bep') { sfx(el, t('pl.sfx_bep'), 'bop'); crinkle(0.3); }
    else if (tool === 'gap') crinkle(0.2);
    else beep(tool === 'rua' ? 'A5' : 'E5');
  }

  function dropTable(k, bin) {
    var th = find(k), gen = GEN, cfg = S.cfg;
    if (!S.go || !th) return;
    if (th.need.length) { tug('pl.ud_prep'); slip(k, 5, t('pl.h.' + th.need[0])); return; }
    if (bin !== th.bin) {
      if (!S.miss.some(function (m) { return m.id === th.id; })) S.miss.push({ id: th.id, bin: th.bin });
      tug('pl.ud_wrong');
      slip(k, 5, t('pl.wrong').replace('{bin}', binName(th.bin)) + (cfg.intro ? ' ' + t('pl.w.' + th.id) : ''));
      return;
    }
    S.table.splice(S.table.indexOf(th), 1);
    if (S.sel === k) S.sel = null;
    S.ok++;
    into(bin); hop(); chime(true);
    say(t('pl.right'), 'ok');
    var el = root.querySelector('.pl-thing[data-pl-item="' + k + '"]');
    if (el) { el.classList.add('is-in'); el.disabled = true; }
    setTimeout(function () { if (gen === GEN) drawTable(); }, reduce ? 0 : 300);
    tableCount();
    if (S.table.length) return;
    if (cfg.intro) { if (S.queue.length) introNext(); else introDone(); }
    else if (!S.queue.length) tableEnd('win');
    else S.nextAt = Math.min(S.nextAt, S.clock.run + 600);   // an empty table: the next comes now
  }

  // level 1: the next thing (after the bottle, the three that teach a tool each)
  function introNext() {
    var first = S.step === 1, th = S.queue.shift(), gen = GEN;
    S.step++;
    setTimeout(function () {
      if (gen !== GEN) return;
      S.table.push(th);
      S.fresh = S.sel = th.k;
      drawTable();
      say((first ? t('pl.chai_done') + ' ' + t('pl.intro_more') + ' ' : '') + t('pl.which_tool').replace('{x}', nm(th.id)));
    }, reduce ? 0 : 450);
  }
  function introDone() {
    var gen = GEN;
    S.go = false;
    pass(1);
    // the table cleared: Udon hops on it
    setTimeout(function () { if (gen === GEN) root.querySelector('.pl-table').innerHTML = img('ud-nhay', 'pl-table-udon', ''); }, reduce ? 0 : 350);
    root.querySelector('.pl-done').hidden = false;
    say(t('pl.intro_done'), 'ok');
  }

  // level 5, each tick: the next thing lands; what waited too long goes in
  // the bin; the bars under the things run down
  function tiecRun(run) {
    landing(run);
    if (!CLOCK) return;
    expire(run);
    if (!CLOCK) return;
    lifeDraw(run);
  }
  // the next thing lands, each a little sooner (7 s down to 5 s)
  function landing(run) {
    if (!S.queue.length || run < S.nextAt) return;
    var th = S.queue.shift();
    setLife(th, run);
    S.table.push(th);
    S.landed++;
    var g = S.cfg.gap;
    S.nextAt = run + g[0] - (g[0] - g[1]) * Math.min(1, S.landed / (S.landed + S.queue.length));
    S.fresh = th.k;
    beep('G3');
    drawTable();
  }
  // too late: into the general bin. Recyclables fill it (landfill); food
  // scraps go there anyway, nothing lost
  function expire(run) {
    var gone = S.table.filter(function (th) { return run >= th.due; }), gen = GEN;
    if (!gone.length) return;
    gone.forEach(function (th) {
      S.table.splice(S.table.indexOf(th), 1);
      if (S.sel === th.k) S.sel = null;
      var el = root.querySelector('.pl-thing[data-pl-item="' + th.k + '"]');
      if (el) { el.classList.add('is-gone'); el.disabled = true; }
      if (th.bin === 'rac-thuong') { say(t('pl.late_ok').replace('{x}', nm(th.id))); return; }
      S.waste++;
      if (!S.lost.some(function (m) { return m.id === th.id; })) S.lost.push({ id: th.id, bin: th.bin });
      say(t('pl.late').replace('{x}', nm(th.id)), 'no');
      chime(false);
    });
    binDraw();
    setTimeout(function () { if (gen === GEN) drawTable(); }, reduce ? 0 : 350);
    if (S.waste >= S.cfg.bin) { tableEnd('full'); return; }
    if (S.table.length) return;
    if (S.queue.length) S.nextAt = Math.min(S.nextAt, run + 600);
    else tableEnd('win');
  }
  function lifeDraw(run) {
    S.table.forEach(function (th) {
      var el = th.due && root.querySelector('.pl-thing[data-pl-item="' + th.k + '"]');
      if (!el) return;
      var left = th.due - run, bar = el.querySelector('.pl-life i');
      if (bar) bar.style.transform = 'scaleX(' + Math.max(0, left / th.life).toFixed(3) + ')';
      el.classList.toggle('is-late', left < 4000);
    });
  }
  // the bin beside Udon: fuller with each thing gone to landfill
  function binDraw() {
    var m = root.querySelector('.pl-meter'), f = S.waste / S.cfg.bin;
    if (m) {
      var h = 32 * Math.min(1, f), r = m.querySelector('.pl-meter-fill');
      r.setAttribute('y', (49 - h).toFixed(1));
      r.setAttribute('height', h.toFixed(1));
      m.classList.toggle('is-high', f >= 0.6);
    }
    tableCount();
  }

  function tableEnd(how) {
    if (!S.go) return;
    S.go = false;
    S.onRun = null;
    clockStop();
    var cfg = S.cfg, c = S.clock, left = Math.max(0, Math.ceil(c.left / 1000)), win = how === 'win';
    // level 5: the bin counts; level 4: the slips and the time
    var got = !win ? 0 : cfg.bin ? (S.waste === 0 && S.slips <= 1 ? 3 : S.waste <= 2 && S.slips <= 3 ? 2 : 1)
      : (S.slips <= 1 && c.left >= c.all * 0.4 ? 3 : S.slips <= 3 ? 2 : 1);
    var o = seen(), key = 'b' + cfg.n, best = o[key], fresh = win && (!best || got > best.s || (got === best.s && left > best.t));
    if (fresh) o[key] = { s: got, t: left };
    if (win && (o.lv || 0) < cfg.n) o.lv = cfg.n;
    keep(o);
    tempo(84);
    if (how === 'full') { var tb = root.querySelector('.pl-table'); if (tb) tb.classList.add('is-over'); }
    var level = S.level, gen = GEN, rest = S.table.length + S.queue.length;
    setTimeout(function () {
      if (gen !== GEN) return;
      S.level = 'end';
      view('end',
        '<h2 id="st-sheet-title">' + esc(t(win ? 'pl.win_h' : how === 'full' ? 'pl.thung_h' : 'pl.time_h')) + '</h2>' +
        (win ? '<div class="pl-end-stars">' + stars(got) + '</div>' : '') +
        (how === 'full' ? '<div class="pl-end-thung">' + img('thung-day', '', t('pl.thung_h')) + '</div>'
          : '<div class="pl-end-udon">' + img(win ? 'ud-nhay' : 'ud-ngoi-cho', '', '') + '</div>') +
        '<p class="st-lead pl-end-p">' + esc(win ? t('pl.win_p').replace('{t}', left).replace('{m}', S.slips) : t('pl.left_p').replace('{n}', rest)) + '</p>' +
        (!win && cfg.n === 4 && prog() < 4 ? tr('p', 'pl.unlock5', ' class="pl-best"') : '') +
        (fresh && best ? tr('p', 'pl.best_new', ' class="pl-best"') : '') +
        (!fresh && best ? '<p class="pl-best">' + esc(t('pl.best_t').replace('{s}', best.s).replace('{t}', best.t)) + '</p>' : '') +
        (S.lost.length ? tr('p', 'pl.lost_h', ' class="pt-label"') + listOf(S.lost) : '') +
        missList(S.miss) +
        endActs(level, cfg.n === 4 ? 'tiec' : null));
    }, win ? 500 : 1000);
  }

  /* ---------- where to take it ---------- */
  function where() {
    var g = window.GemI18n ? window.GemI18n.t : function (k) { return k; };
    var gemAddr = g('footer.address'), gemHours = String(g('visit.hours_value')).replace(/<br\s*\/?>/g, ' · ');
    view('where',
      '<button type="button" class="pt-tool pt-mini pl-back" data-pl-go="hub">' + esc(t('pl.back')) + '</button>' +
      tr('h2', 'pl.where_h', ' id="st-sheet-title"') + tr('p', 'pl.where_p', ' class="st-lead"') +
      '<section class="pl-place">' + tr('h3', 'pl.tagom_h') + tr('p', 'pl.tagom_what') +
        '<p><b>' + esc(TAGOM_ADDR) + '</b><br>' + esc(t('pl.tagom_near')) + '</p>' + tr('p', 'pl.tagom_hours', ' class="pt-small"') +
        '<div class="pl-acts">' +
          '<a class="st-btn" href="' + esc(maps('105B1 ngõ 3 Khuất Duy Tiến, Thanh Xuân Bắc, Hà Nội')) + '" target="_blank" rel="noopener">' + esc(t('pl.map')) + '</a>' +
          '<a class="pt-tool" href="' + esc(TAGOM_FB) + '" target="_blank" rel="noopener">' + esc(t('pl.tagom_fb')) + '</a>' +
        '</div></section>' +
      '<section class="pl-place">' + tr('h3', 'pl.gem_h') + tr('p', 'pl.gem_what') +
        '<p><b>' + esc(gemAddr) + '</b><br><span class="pt-small">' + esc(gemHours) + '</span></p>' +
        '<div class="pl-acts"><a class="st-btn" href="' + esc(maps('114 Lê Gia Đỉnh, Hai Bà Trưng, Hà Nội')) + '" target="_blank" rel="noopener">' + esc(t('pl.map')) + '</a></div>' +
      '</section>');
  }

  /* ---------- answers ---------- */
  function drop(item, bin) {
    if (S.level === 'nhanh') return dropFast(item, bin);
    if (S.level === 'chai' || S.level === 'ban' || S.level === 'tiec') return dropTable(item, bin);
    if (S.level !== 'sort' || S.answered) return;
    var it = S.items[S.i];
    if (!it || item !== it.id) return;
    S.answered = true;
    var ok = bin === it.bin;
    var why = t('pl.w.' + it.id);
    if (ok) {
      S.ok++;
      into(bin);
      hop();
      chime(true);
      say(t('pl.right') + ' ' + why, 'ok');
    } else {
      S.miss.push(it);
      tug('pl.ud_wrong');
      chime(false);
      say(t('pl.wrong').replace('{bin}', binName(it.bin)) + ' ' + why, 'no');
      var b = BINS.filter(function (x) { return x.id === it.bin; })[0];
      var see = root.querySelector('[data-pl-see]');
      see.hidden = !b.poster;
      see.setAttribute('data-pl-see', b.poster || '');
    }
    root.querySelector('.pl-count').textContent = t('pl.count').replace('{i}', S.i + 1).replace('{n}', S.items.length).replace('{ok}', S.ok);
    root.querySelector('.pl-next-row').hidden = false;
    var one = root.querySelector('.pl-one .pl-item');
    if (one) one.classList.add(ok ? 'is-in' : 'is-no');
  }

  // the bag takes it: a little bounce
  function into(bin) {
    var b = root.querySelector('[data-pl-bin="' + bin + '"]');
    if (!b || reduce) return;
    b.classList.remove('is-take'); void b.offsetWidth; b.classList.add('is-take');
  }

  function say(text, kind) {
    var p = root.querySelector('.pl-say');
    if (!p) return;
    p.textContent = text;
    p.className = 'pl-say' + (kind ? ' is-' + kind : '');
  }

  /* ---------- Udon ---------- */
  function udon() {
    return '<div class="pl-udon" aria-hidden="true">' + img('ud-ngoi-cho', 'pl-ud-sit', '') + img('ud-nhay', 'pl-ud-hop', '') + '</div>' +
      '<div class="pl-tug" aria-hidden="true" hidden><p class="pl-tug-say"></p>' + img('ud-chay-1', 'pl-run pl-run-1', '') + img('ud-chay-2', 'pl-run pl-run-2', '') +
        img('ud-keo-1', 'pl-keo pl-keo-1', '') + img('ud-keo-2', 'pl-keo pl-keo-2', '') + '</div>';
  }

  function hop() {
    var u = root.querySelector('.pl-udon');
    if (!u) return;
    u.classList.add('is-hop');
    clearTimeout(S.hopT);
    S.hopT = setTimeout(function () { u.classList.remove('is-hop'); }, 700);
  }

  // the first mistake of a round: Udon runs in and tugs a trouser hem
  function tug(line) {
    if (S.tugged) return;
    S.tugged = true;
    var box = root.querySelector('.pl-tug');
    if (!box) return;
    box.querySelector('.pl-tug-say').textContent = t(line);
    box.hidden = false;
    box.setAttribute('aria-label', t('pl.udon'));
    box.className = 'pl-tug is-run';
    var n = 0;
    clearInterval(S.tugT);
    if (reduce) { box.className = 'pl-tug is-keo f1'; S.tugT = setTimeout(function () { box.hidden = true; }, 2400); return; }
    S.tugT = setInterval(function () {
      n++;
      if (n < 5) box.className = 'pl-tug is-run f' + (n % 2 + 1);
      else if (n < 20) box.className = 'pl-tug is-keo f' + (n % 2 + 1);
      else { clearInterval(S.tugT); box.classList.add('is-out'); setTimeout(function () { box.hidden = true; }, 300); }
    }, 140);
  }

  /* ---------- music ----------
     A slow tune of our own on a plucked string (the studio's đàn tranh
     sound, made in the browser: no sound file to load), low under the game,
     from the first level the visitor starts. A little chime for right and
     wrong. "Nhạc: tắt" silences both (kept in gem-pl). It stops when the
     sheet closes or the tab is hidden, and comes back with the tab. */
  var VOL = 0.16;
  // C pentatonic (Sol La Đô Rê Mi), two phrases of 8 bars: note, beats
  var TUNE = ('E5 1 G5 .5 A5 .5 G5 1 E5 1  D5 1 E5 .5 D5 .5 C5 2  A4 1 C5 1 D5 1 E5 1  G5 1.5 E5 .5 D5 2 ' +
              'E5 1 G5 .5 A5 .5 C6 1 A5 1  G5 1 A5 .5 G5 .5 E5 2  D5 1 E5 1 G5 1 E5 .5 D5 .5  C5 3 - 1 ' +
              'A4 1 C5 .5 D5 .5 E5 1 G5 1  A5 1.5 G5 .5 E5 2  D5 1 E5 .5 G5 .5 E5 1 D5 1  C5 1 A4 1 G4 2 ' +
              'A4 1 C5 1 D5 .5 E5 .5 G5 1  E5 1 D5 1 C5 1 D5 1  E5 1.5 G5 .5 D5 1 E5 .5 D5 .5  C5 4');
  // the low strings: two a bar, on its first and third beat
  var BASS = 'C3 G3  G2 D3  A2 E3  G2 D3  C3 G3  A2 E3  G2 D3  C3 G3  A2 E3  C3 G3  G2 D3  G2 D3  A2 E3  C3 G3  G2 D3  C3 G3';
  var NOTES = (function () {
    var ev = [], at = 0, m = TUNE.split(/\s+/), k;
    for (k = 0; k < m.length; k += 2) {
      if (m[k] !== '-') ev.push({ at: at, hz: hz(m[k]), v: 0.9 });
      at += +m[k + 1];
    }
    BASS.split(/\s+/).forEach(function (n, j) { ev.push({ at: j * 2, hz: hz(n), v: 0.5 }); });
    ev.sort(function (a, b) { return a.at - b.at; });
    ev.len = at;   // beats in one time round
    return ev;
  })();
  function hz(name) {
    var m = /^([A-G])(\d)$/.exec(name), semi = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
    return 440 * Math.pow(2, (semi + 12 * (+m[2] + 1) - 69) / 12);
  }
  var M = { timer: 0, ctx: null, out: null, root: null, i: 0, base: 0, beat: 60 / 84, bufs: {}, rate: {}, away: false };
  // the timed levels play it quicker, and quicker still at the end: the
  // notes ahead keep their place in the bar
  function tempo(bpm) {
    var b = 60 / bpm;
    if (M.timer && b !== M.beat) { var now = M.ctx.currentTime; M.base = now - (now - M.base) * b / M.beat; }
    M.beat = b;
  }

  function musicOn() { return seen().nhac !== 0; }
  function musicSet(on) {
    var o = seen();
    o.nhac = on ? 1 : 0;
    keep(o);
    root.querySelectorAll('[data-pl-music]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(on));
      b.textContent = t(on ? 'pl.music_on' : 'pl.music_off');
    });
    if (on && S.level) musicStart(); else if (!on) musicStop();
  }
  function musicStart() {
    if (M.timer && M.root !== root) musicStop();   // a game left open before this one
    if (M.timer || !musicOn()) return;
    var ctx = api && api.audio && api.audio();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    M.ctx = ctx; M.root = root;
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 4200;
    M.out = ctx.createGain();
    M.out.gain.setValueAtTime(0.0001, ctx.currentTime);
    M.out.gain.exponentialRampToValueAtTime(VOL, ctx.currentTime + 1.5);   // comes in softly
    M.out.connect(lp); lp.connect(ctx.destination);
    M.i = 0; M.base = ctx.currentTime + 0.2;
    M.timer = setInterval(musicTick, 120);
    document.addEventListener('visibilitychange', musicAway);
    musicTick();
  }
  // a little ahead each time round: the timer may be late, the notes not
  function musicTick() {
    if (!M.root || !M.root.isConnected) { musicStop(); return; }   // the sheet was closed
    var ahead = M.ctx.currentTime + 0.4;
    while (M.base + NOTES[M.i].at * M.beat < ahead) {
      pluck(NOTES[M.i].hz, M.base + NOTES[M.i].at * M.beat, NOTES[M.i].v);
      if (++M.i === NOTES.length) { M.i = 0; M.base += NOTES.len * M.beat; }
    }
  }
  function musicStop() {
    if (!M.timer) return;
    clearInterval(M.timer);
    M.timer = 0;
    var out = M.out, now = M.ctx.currentTime;
    out.gain.cancelScheduledValues(now);
    out.gain.setValueAtTime(out.gain.value, now);
    out.gain.linearRampToValueAtTime(0, now + 0.3);
    setTimeout(function () { out.disconnect(); }, 400);
    M.out = null;
    if (!M.away) document.removeEventListener('visibilitychange', musicAway);
  }
  function musicAway() {
    if (document.hidden && M.timer) { M.away = true; musicStop(); }
    else if (!document.hidden && M.away) {
      M.away = false;
      document.removeEventListener('visibilitychange', musicAway);
      if (M.root && M.root.isConnected && M.root === root) musicStart();
    }
  }
  // the string: a burst of noise round a delay line one period long,
  // softened each time round (as the studio's đàn, a little mellower)
  function buf(f) {
    var key = f.toFixed(2);
    if (M.bufs[key]) return M.bufs[key];
    var sr = M.ctx.sampleRate, soft = 0.3, N = Math.max(2, Math.floor(sr / f)), len = Math.round(sr * 1.8);
    var b = M.ctx.createBuffer(1, len, sr), d = b.getChannelData(0), ring = new Float32Array(N), k;
    for (k = 0; k < N; k++) ring[k] = Math.random() * 2 - 1;
    var keep = Math.pow(0.01, 1 / (1.8 * f));
    for (k = 0; k < len; k++) {
      var a = ring[k % N], c = ring[(k + 1) % N];
      d[k] = a * 0.7;
      ring[k % N] = keep * ((1 - soft) * a + soft * c);
    }
    var tail = Math.round(sr * 0.06);
    for (k = 0; k < tail; k++) d[len - 1 - k] *= k / tail;   // no click at the end
    M.rate[key] = (N - soft) * f / sr;
    return (M.bufs[key] = b);
  }
  function pluck(f, at, v) {
    if (!M.out) return;
    var s = M.ctx.createBufferSource(), g = M.ctx.createGain();
    s.buffer = buf(f);
    s.playbackRate.value = M.rate[f.toFixed(2)];
    g.gain.value = v;
    s.connect(g); g.connect(M.out);
    s.start(at);
  }
  // right: two notes up; wrong: two soft low ones down
  function chime(ok) {
    if (!M.out) return;
    var now = M.ctx.currentTime + 0.02;
    (ok ? [['G5', 0], ['C6', 0.11]] : [['E4', 0], ['C4', 0.16]]).forEach(function (n) { pluck(hz(n[0]), now + n[1], ok ? 1.4 : 1.1); });
  }
  // one note: 3-2-1, a tool used, a thing landing on the table
  function beep(note) { if (M.out) pluck(hz(note), M.ctx.currentTime + 0.02, 1.2); }
  // the clock in its last ten seconds: a dry little tick
  function tick() {
    if (!M.out) return;
    var o = M.ctx.createOscillator(), g = M.ctx.createGain(), at = M.ctx.currentTime + 0.01;
    o.type = 'triangle';
    o.frequency.value = 1320;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(1.2, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
    o.connect(g); g.connect(M.out);
    o.start(at); o.stop(at + 0.08);
  }

  /* ---------- nylon, felt (Anna 23/10) ----------
     Tagom tells the two nylons apart by hand: hard is crinkly and won't
     stretch, soft stretches and makes no sound. So here a tap squeezes it
     (hard: "SỘT SOẠT!" in big comic letters and a crinkle; soft: a quiet
     "~ ~ ~", nothing to hear) and the grips on its edges pull it (soft
     stretches after the finger and springs back; hard gives a little,
     shakes: "KHÔNG GIÃN!"). Letters and sound made here, no files. */
  function sfx(card, text, kind) {
    var stage = card && card.closest('.pl-stage');
    if (!stage) return;
    var w = document.createElement('span');   // our own words: textContent
    w.className = 'pl-sfx is-' + kind;
    w.setAttribute('aria-hidden', 'true');
    var big = document.createElement('b');
    big.textContent = text;
    w.appendChild(big);
    if (kind === 'bop') {
      ['a', 'b'].forEach(function (k) {
        var e = document.createElement('i');
        e.className = 'pl-sfx-echo is-' + k;
        e.textContent = t('pl.sfx_bop2');
        w.appendChild(e);
      });
    }
    if (card.classList.contains('pl-thing')) {   // on the party table: over the thing itself
      var c = card.getBoundingClientRect(), s = stage.getBoundingClientRect();
      w.style.left = (c.left - s.left + c.width / 2) + 'px';
      w.style.top = (c.top - s.top) + 'px';
    }
    stage.appendChild(w);
    setTimeout(function () { w.remove(); }, 1100);
  }
  function squeeze(card) {
    var hard = card.getAttribute('data-pl-film') === 'cung', pic = card.querySelector('.pl-stretch');
    if (pic) { pic.classList.remove('is-squeeze'); void pic.offsetWidth; pic.classList.add('is-squeeze'); }
    if (hard) { sfx(card, t('pl.sfx_bop'), 'bop'); crinkle(0.35); }
    else sfx(card, '~ ~ ~', 'mem');
  }
  function stretch(e, grip) {
    var card = grip.closest('[data-pl-film]'), pic = card && card.querySelector('.pl-stretch');
    if (!pic || (S.level === 'sort' && S.answered) || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    var hard = card.getAttribute('data-pl-film') === 'cung', right = grip.getAttribute('data-pl-grip') === 'r';
    var w = pic.getBoundingClientRect().width || 1, x0 = e.clientX, id = e.pointerId, said = false, moved = false;
    pic.style.transition = 'none';
    pic.style.transformOrigin = right ? 'left center' : 'right center';
    var move = function (ev) {
      if (ev.pointerId !== id) return;
      if (ev.cancelable) ev.preventDefault();
      var pull = Math.max(0, right ? ev.clientX - x0 : x0 - ev.clientX);
      if (pull > 4) moved = true;
      // soft: after the finger, harder the further (up to 1.6); hard: a hair
      var sc = hard ? 1 + Math.min(0.05, pull / w * 0.1) : 1 + 0.6 * (1 - Math.exp(-pull / (w * 0.7)));
      pic.style.transform = 'scaleX(' + sc.toFixed(3) + ')';
      if (!said && hard && pull > 24) {
        said = true;
        pic.classList.remove('is-shake'); void pic.offsetWidth; pic.classList.add('is-shake');
        sfx(card, t('pl.sfx_khong'), 'khong');
        crinkle(0.25);
      } else if (!said && !hard && sc > 1.25) {
        said = true;
        sfx(card, t('pl.sfx_dan'), 'dan');
      }
    };
    var up = function (ev) {
      if (ev.pointerId !== id) return;
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      pic.style.transition = '';   // springs back (CSS)
      pic.style.transform = '';
      if (moved) S.dragged = true;   // not a tap on the card as well
    };
    document.addEventListener('pointermove', move, { passive: false });
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  }
  // crackles: short bursts of noise, high and thin (only with the sound on)
  function crinkle(len) {
    if (!M.out) return;
    var ctx = M.ctx, sr = ctx.sampleRate, n = Math.round(sr * len), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0), k;
    for (k = 0; k < n; k++) {
      var env = Math.pow(1 - k / n, 1.5);
      d[k] = (Math.random() < 0.06 ? (Math.random() * 2 - 1) : (Math.random() * 2 - 1) * 0.12) * env;
    }
    var src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = b;
    bp.type = 'bandpass'; bp.frequency.value = 4200; bp.Q.value = 0.9;
    g.gain.value = 3.2;
    src.connect(bp); bp.connect(g); g.connect(M.out);
    src.start(ctx.currentTime + 0.01);
  }
  // the air let out of a cushion: a soft hiss that dies away
  function hiss() {
    if (!M.out) return;
    var ctx = M.ctx, sr = ctx.sampleRate, n = Math.round(sr * 0.7), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0), k;
    for (k = 0; k < n; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / n, 2) * Math.min(1, k / (sr * 0.03));
    var src = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = b;
    hp.type = 'highpass'; hp.frequency.value = 2600;
    g.gain.value = 1.4;
    src.connect(hp); hp.connect(g); g.connect(M.out);
    src.start(ctx.currentTime + 0.01);
  }

  /* ---------- taps and drags ---------- */
  function onClick(e) {
    var el;
    if ((el = e.target.closest('[data-pl-go]'))) {
      var go = el.getAttribute('data-pl-go');
      if (go === 'hub') hub();
      else if (go === 'where') where();
      else if (go === 'up') openLevel(nextLevel());
      else if (go === 'next') { if (S.i + 1 < S.items.length) { S.i++; renderSort(); } else end(); }
      else if (go === 'resume') { if (S.i + 1 < S.items.length) { S.i++; sortView(); renderSort(); } else end(); }
      else openLevel(go);
      return;
    }
    if (e.target.closest('[data-pl-guide-go]')) { guideShow(false); return; }
    if (e.target.closest('[data-pl-music]')) { musicSet(!musicOn()); return; }
    if (e.target.closest('[data-pl-guide]')) { guideShow(true); return; }
    if ((el = e.target.closest('[data-pl-poster]'))) { poster(el.getAttribute('data-pl-poster')); return; }
    if ((el = e.target.closest('[data-pl-see]'))) { var p = el.getAttribute('data-pl-see'); if (p) poster(p); return; }
    if (S && S.dragged) { S.dragged = false; return; }   // a drag just ended: not a tap
    if ((el = e.target.closest('[data-pl-tool]'))) { useTool(S.sel, el.getAttribute('data-pl-tool')); return; }
    if ((el = e.target.closest('.pl-thing'))) { pick(el.getAttribute('data-pl-item')); return; }
    if ((el = e.target.closest('[data-pl-item]'))) {
      S.sel = el.getAttribute('data-pl-item');
      if (el.hasAttribute('data-pl-film') && !S.answered) squeeze(el);
      return;
    }
    if ((el = e.target.closest('[data-pl-bin]')) && S.sel) drop(S.sel, el.getAttribute('data-pl-bin'));
  }

  // drag a thing onto a bag (on the table, onto a tool too)
  function onDown(e) {
    var grip = e.target.closest('[data-pl-grip]');
    if (grip) { stretch(e, grip); return; }
    var src = e.target.closest('[data-pl-item]');
    if (!src || (e.pointerType === 'mouse' && e.button !== 0)) return;
    var item = src.getAttribute('data-pl-item');
    if ((S.level === 'sort' || S.level === 'nhanh') && S.answered) return;
    if (/^(chai|nhanh|ban|tiec)$/.test(S.level) && !S.go) return;   // not before "Bắt đầu!" (level 1: not once done)
    var pic = src.querySelector('img'), r = pic.getBoundingClientRect();
    var x0 = e.clientX, y0 = e.clientY, id = e.pointerId, ghost = null, over = null;
    // a bag; on the party table a tool too
    var binAt = function (x, y) {
      if (ghost) ghost.style.visibility = 'hidden';
      var el = document.elementFromPoint(x, y);
      if (ghost) ghost.style.visibility = '';
      return el && el.closest('[data-pl-bin], [data-pl-tool]');
    };
    var move = function (ev) {
      if (ev.pointerId !== id) return;
      var dx = ev.clientX - x0, dy = ev.clientY - y0;
      if (!ghost) {
        if (Math.abs(dx) + Math.abs(dy) < 8) return;
        ghost = pic.cloneNode();
        ghost.className = 'pl-ghost';
        ghost.style.left = r.left + 'px'; ghost.style.top = r.top + 'px'; ghost.style.width = r.width + 'px';
        document.body.appendChild(ghost);
        src.classList.add('is-lifted');
      }
      if (ev.cancelable) ev.preventDefault();
      ghost.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.06)';
      var b = binAt(ev.clientX, ev.clientY);
      if (b !== over) { if (over) over.classList.remove('is-over'); over = b; if (b) b.classList.add('is-over'); }
    };
    var up = function (ev) {
      if (ev.pointerId !== id) return;
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      if (!ghost) return;   // a tap: the click handles it
      S.dragged = true;
      setTimeout(function () { if (S) S.dragged = false; }, 0);
      if (over) over.classList.remove('is-over');
      ghost.remove();
      src.classList.remove('is-lifted');
      var b = ev.type === 'pointerup' && binAt(ev.clientX, ev.clientY);
      if (b && b.hasAttribute('data-pl-tool')) useTool(item, b.getAttribute('data-pl-tool'));
      else if (b) drop(item, b.getAttribute('data-pl-bin'));
    };
    document.addEventListener('pointermove', move, { passive: false });
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  }

  window.GemPhanLoai = { open: open, ITEMS: ITEMS, BINS: BINS, POSTERS: POSTERS, PREP: PREP, TABLE: TABLE };
})();

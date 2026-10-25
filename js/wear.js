// =========================================================================
// Góc thử đồ: where a piece sits on the character (studio.html, admin.html).
//
// A piece the database offers to try on has products.wear (admin.html →
// Sản phẩm → Sửa → Đeo thử): how it is worn (slot), its height as a share
// of the character's, a nudge from the point it hangs from, and the point
// of its picture held there (the handle's top). Its picture is the
// product's cut-out, or that of the "Mẫu" picked (options.choices[].cut),
// or wear.img. A bag sewn from one's own design at Bàn thiết kế is worn the
// same way, drawn from the design (DESIGN).
// =========================================================================
window.GemWear = (function () {
  // Where accessories go on each frame (tools/studio-assets.py --hands):
  // [width/height, hand x, hand y, back-of-head x, y, fist box x, y, w, h],
  // fractions of the frame. The hand is the near one (the front fist in a
  // walk, the grip on the cart handle); bags hang from it, and the fist
  // (char/pN-<frame>-tay.webp) is drawn back over the handle.
  var AT = {"p1-front": [0.3042, 0.917, 0.565, 0.114, 0.12, 0.8447, 0.4722, 0.1507, 0.1194], "p1-side": [0.2708, 0.659, 0.578, 0.149, 0.12, 0.559, 0.4931, 0.2051, 0.1083], "p1-q": [0.3097, 0.826, 0.515, 0.135, 0.12, 0.7578, 0.5042, 0.1659, 0.0236], "p1-walk1": [0.5292, 0.761, 0.558, 0.299, 0.12, 0.5774, 0.4903, 0.2441, 0.0931], "p1-walk2": [0.3042, 0.884, 0.594, 0.201, 0.12, 0.8128, 0.5208, 0.1096, 0.0958], "p1-walk3": [0.5472, 0.781, 0.558, 0.312, 0.12, 0.5279, 0.4764, 0.3122, 0.1083], "p1-walk4": [0.3833, 0.575, 0.587, 0.167, 0.12, 0.4493, 0.4958, 0.1993, 0.1153], "p1-cart1": [0.8653, 0.545, 0.524, 0.252, 0.12, 0.5104, 0.5028, 0.0514, 0.0361], "p1-cart2": [0.6708, 0.451, 0.505, 0.085, 0.12, 0.4244, 0.4944, 0.06, 0.0236], "p1-cart3": [0.7958, 0.496, 0.514, 0.161, 0.12, 0.4538, 0.5, 0.0646, 0.0375], "p2-front": [0.3181, 0.855, 0.584, 0.275, 0.12, 0.7817, 0.4986, 0.1572, 0.1139], "p2-side": [0.2042, 0.584, 0.587, 0.075, 0.12, 0.4014, 0.4986, 0.3265, 0.1111], "p2-q": [0.3097, 0.867, 0.579, 0.256, 0.12, 0.7848, 0.4944, 0.1525, 0.1125], "p2-walk1": [0.5292, 0.813, 0.534, 0.367, 0.12, 0.664, 0.4819, 0.2073, 0.075], "p2-walk2": [0.2528, 0.629, 0.601, 0.143, 0.12, 0.4396, 0.5125, 0.3132, 0.1125], "p2-walk3": [0.5361, 0.814, 0.529, 0.324, 0.12, 0.6451, 0.4736, 0.2409, 0.0847], "p2-walk4": [0.2389, 0.638, 0.598, 0.128, 0.12, 0.4244, 0.5125, 0.3372, 0.1097], "p2-cart1": [0.8292, 0.619, 0.53, 0.312, 0.12, 0.5812, 0.5083, 0.0553, 0.0375], "p2-cart2": [0.6861, 0.549, 0.525, 0.164, 0.12, 0.5081, 0.5069, 0.0628, 0.0319], "p2-cart3": [0.7444, 0.591, 0.52, 0.229, 0.12, 0.541, 0.5042, 0.0653, 0.0347], "p3-front": [0.3514, 0.903, 0.562, 0.277, 0.12, 0.8024, 0.4542, 0.1621, 0.1444], "p3-side": [0.3014, 0.589, 0.576, 0.138, 0.12, 0.4608, 0.4625, 0.212, 0.1417], "p3-q": [0.3472, 0.906, 0.565, 0.232, 0.12, 0.808, 0.4597, 0.144, 0.1361], "p3-walk1": [0.5208, 0.708, 0.567, 0.307, 0.12, 0.4853, 0.4611, 0.288, 0.1361], "p3-walk2": [0.3389, 0.933, 0.564, 0.266, 0.12, 0.8361, 0.5333, 0.1639, 0.05], "p3-walk3": [0.5278, 0.714, 0.557, 0.3, 0.12, 0.4789, 0.4583, 0.3, 0.1306], "p3-walk4": [0.3639, 0.621, 0.589, 0.26, 0.12, 0.4847, 0.4681, 0.2099, 0.1486], "p3-cart1": [0.8, 0.494, 0.528, 0.224, 0.12, 0.4427, 0.5139, 0.1233, 0.0292], "p3-cart2": [0.7028, 0.476, 0.526, 0.158, 0.12, 0.3874, 0.5056, 0.1462, 0.0431], "p3-cart3": [0.7181, 0.507, 0.527, 0.132, 0.12, 0.4526, 0.5153, 0.0812, 0.0306], "p4-front": [0.3681, 0.878, 0.608, 0.211, 0.12, 0.8151, 0.5556, 0.1321, 0.0778], "p4-side": [0.2958, 0.847, 0.469, 0.127, 0.12, 0.7277, 0.4319, 0.2629, 0.0625], "p4-q": [0.3903, 0.849, 0.607, 0.199, 0.12, 0.7865, 0.5542, 0.1174, 0.0736], "p4-walk1": [0.5264, 0.864, 0.564, 0.243, 0.12, 0.7995, 0.5389, 0.0844, 0.0403], "p4-walk2": [0.3833, 0.904, 0.555, 0.134, 0.12, 0.8225, 0.5319, 0.1232, 0.0417], "p4-walk3": [0.5125, 0.794, 0.556, 0.209, 0.12, 0.7398, 0.5389, 0.084, 0.0333], "p4-walk4": [0.4278, 0.83, 0.556, 0.12, 0.12, 0.7565, 0.5319, 0.1039, 0.0403], "p4-cart1": [0.8083, 0.615, 0.515, 0.21, 0.12, 0.5653, 0.4917, 0.0687, 0.0431], "p4-cart2": [0.7042, 0.557, 0.518, 0.132, 0.12, 0.5247, 0.4958, 0.0631, 0.0389], "p4-cart3": [0.7625, 0.592, 0.512, 0.169, 0.12, 0.5337, 0.4917, 0.0783, 0.0389]};

  // drawing order, back to front; one piece per slot
  var SLOTS = ['hair', 'bag', 'wrist', 'charm'];
  var SLOT_NAMES = {
    bag: 'Cầm tay (túi)', wrist: 'Cổ tay (dây đeo)', charm: 'Móc vào túi (charm)', hair: 'Trên tóc (cài hoa)'
  };
  // a new piece of that slot starts here (admin.html)
  var SLOT_DEF = {
    bag:   { h: 0.24, dy: -0.02, ax: 0.5, ay: 0 },
    wrist: { h: 0.13, dy: -0.05, ax: 0.25, ay: 0 },
    charm: { h: 0.1,  dy: 0,     ax: 0.25, ay: 0.04 },
    hair:  { h: 0.075, dy: 0,    ax: 0.5, ay: 0.5 }
  };

  // The five pieces of the first round, drawn for the corner: used until
  // the database answers (or if it has no "wear" column yet).
  var LEGACY = {
    denim:     { slot: 'bag',   h: 0.2,   dy: -0.02, ax: 0.44, ay: 0,    img: 'images/studio/wear/denim.webp' },
    oxford:    { slot: 'bag',   h: 0.18,  dy: -0.02, ax: 0.42, ay: 0,    img: 'images/studio/wear/oxford.webp' },
    daydeo:    { slot: 'wrist', h: 0.13,  dy: -0.05, ax: 0.22, ay: 0,    img: 'images/studio/wear/daydeo.webp' },
    bloom:     { slot: 'charm', h: 0.1,   dy: 0,     ax: 0.2,  ay: 0.04, img: 'images/studio/wear/bloom.webp' },
    scrunchie: { slot: 'hair',  h: 0.075, dy: 0,     ax: 0.55, ay: 0.5,  img: 'images/studio/wear/scrunchie.webp' }
  };

  // A bag sewn from one's design (GemPatch product id): how it is worn.
  // The picture is GemPatch.svg of the design, its viewBox cut to the
  // piece (box: x, y, w, h of the 340 board); ax / ay on that box. Bags
  // and the Origami key ring (Anna 25/10): not the laptop sleeve; the
  // scrunchie, strap and charm are shown by their own drawings (MAC)
  var DESIGN = {
    origami:   { slot: 'charm', h: 0.09, ax: 0.15, ay: 0,   box: [1, 1, 338, 339] },
    oxford:    { slot: 'bag',   h: 0.2,  ax: 0.49, ay: 0,   box: [47, 0, 246, 340] },
    tuitote:   { slot: 'bag',   h: 0.34, ax: 0.5,  ay: 0,   box: [60, 0, 220, 340] },
    tuino:     { slot: 'bag',   h: 0.28, ax: 0.6,  ay: 0,   box: [19, 0, 302, 340] },
    tuikhoa:   { slot: 'bag',   h: 0.3,  ax: 0.49, ay: 0,   box: [22, 0, 296, 340] },
    tuitamgiac: { slot: 'bag',  h: 0.28, ax: 0.5,  ay: 0,   box: [0, 0, 340, 340] },
    tuibuoc:   { slot: 'bag',   h: 0.28, ax: 0.5,  ay: 0,   box: [0, 0, 340, 340] }
  };

  // A drawing of the piece being worn, shown in the fitting corner in place
  // of the character, as it always was (Anna 25/10: "phải kiểu đeo như
  // cũ"): a hair tie on a character facing us is a dot by the ear; the
  // wrist strap and the charm hang from a bag on the shoulder
  var MAC = {
    scrunchie: 'images/studio/wear/scrunchie-mac.webp',
    daydeo: 'images/studio/wear/daydeo-mac.webp',
    bloom: 'images/studio/wear/bloom-mac.webp'
  };

  var IMG = /^(images\/studio\/[a-z0-9\/_-]+\.(webp|png)|https:\/\/dxdovvqsfjeizsoprrfn\.supabase\.co\/storage\/v1\/object\/public\/gem-media\/[A-Za-z0-9%._-]+)$/;
  function num(v, lo, hi, d) { return typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; }

  // A wear setting as stored (products.wear), checked: null if not one
  function norm(w) {
    if (!w || typeof w !== 'object' || SLOTS.indexOf(w.slot) < 0) return null;
    var d = SLOT_DEF[w.slot];
    return { slot: w.slot, h: num(w.h, 0.02, 0.6, d.h), dx: num(w.dx, -0.5, 0.5, 0), dy: num(w.dy, -0.5, 0.5, d.dy),
      ax: num(w.ax, 0, 1, d.ax), ay: num(w.ay, 0, 1, d.ay), img: typeof w.img === 'string' && IMG.test(w.img) ? w.img : null };
  }
  function okImg(src) { return typeof src === 'string' && IMG.test(src); }

  // Where a piece goes on a frame ("p2-walk3"): CSS for its box, in % of the
  // frame. bag: a bag is worn too (a charm clips onto its handle, off its
  // far side, so the bag doesn't hide it).
  function place(key, w, bag) {
    var at = AT[key];
    if (!at) return null;
    var head = w.slot === 'hair';
    var x = (head ? at[3] : at[1]) + (w.dx || 0) / at[0];
    var y = (head ? at[4] : at[2]) + (w.dy || 0);
    if (w.slot === 'charm') { x += (bag ? 0.05 : 0.01) / at[0]; y += bag ? 0.02 : -0.01; }
    return { left: (x * 100).toFixed(2) + '%', top: (y * 100).toFixed(2) + '%', height: (w.h * 100).toFixed(2) + '%',
      transform: 'translate(' + (-w.ax * 100).toFixed(1) + '%, ' + (-w.ay * 100).toFixed(1) + '%)' };
  }
  // the near fist, drawn back over what the hand holds
  function fist(key) {
    var at = AT[key];
    if (!at || at.length < 9) return null;
    return { left: (at[5] * 100).toFixed(2) + '%', top: (at[6] * 100).toFixed(2) + '%',
      width: (at[7] * 100).toFixed(2) + '%', height: (at[8] * 100).toFixed(2) + '%' };
  }
  function held(w) { return w.slot !== 'hair'; }

  return { AT: AT, SLOTS: SLOTS, SLOT_NAMES: SLOT_NAMES, SLOT_DEF: SLOT_DEF, LEGACY: LEGACY, DESIGN: DESIGN, MAC: MAC,
    norm: norm, okImg: okImg, place: place, fist: fist, held: held };
})();

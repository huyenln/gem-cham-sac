// =========================================================================
// Tủ sưu tầm — what this visitor has designed and bought, kept in this
// browser only (localStorage 'gem-tu'). No account, no phone number stored.
//
//   designs  [{ spec, at }]                 saved from the patchwork table
//   owned    [{ sku, spec, code, at, received }]
//
// Owned items arrive two ways:
//   - basket.js fires 'gem:ordered' after an order goes through (pending)
//   - claim(code, phone) asks the database (rpc claim_collection), for a
//     new phone/browser or an order placed at the counter
// Specs are re-checked with GemPatch.parse on load: the store is the user's
// own browser, but it still ends up in innerHTML via GemPatch.svg.
// =========================================================================
window.GemTu = (function () {
  var KEY = 'gem-tu';
  var MAX_DESIGNS = 24;
  var state = { designs: [], owned: [] };

  function validSpec(spec) {
    return !!(spec && window.GemPatch && window.GemPatch.parse(spec));
  }
  function validSku(sku) { return typeof sku === 'string' && /^[a-z0-9-]{1,40}$/.test(sku); }
  function validCode(code) { return typeof code === 'string' && /^[A-Z0-9]{4,12}$/.test(code); }

  function load() {
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { raw = null; }
    if (!raw || typeof raw !== 'object') return;
    state.designs = (Array.isArray(raw.designs) ? raw.designs : []).filter(function (d) {
      return d && validSpec(d.spec);
    }).slice(0, MAX_DESIGNS);
    state.owned = (Array.isArray(raw.owned) ? raw.owned : []).filter(function (o) {
      return o && validSku(o.sku) && (!o.code || validCode(o.code)) && (!o.spec || validSpec(o.spec));
    });
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode: lives for this visit */ }
    try { document.dispatchEvent(new CustomEvent('gem:tu')); } catch (e) { /* ignore */ }
  }

  function saveDesign(spec) {
    if (!validSpec(spec)) return false;
    state.designs = state.designs.filter(function (d) { return d.spec !== spec; });
    state.designs.unshift({ spec: spec, at: Date.now() });
    state.designs = state.designs.slice(0, MAX_DESIGNS);
    save();
    return true;
  }

  function removeDesign(spec) {
    state.designs = state.designs.filter(function (d) { return d.spec !== spec; });
    save();
  }

  function hasDesign(spec) {
    return state.designs.some(function (d) { return d.spec === spec; });
  }

  // One entry per (order, sku, spec): re-claiming the same order only
  // updates "received", it never doubles the shelf.
  function addOwned(code, sku, spec, received) {
    if (!validSku(sku) || (code && !validCode(code))) return;
    spec = spec && validSpec(spec) ? spec : null;
    var hit = null;
    state.owned.forEach(function (o) {
      if (o.code === code && o.sku === sku && (o.spec || null) === spec) hit = o;
    });
    if (hit) {
      if (received) hit.received = true;
      return;
    }
    state.owned.push({ sku: sku, spec: spec, code: code || null, at: Date.now(), received: !!received });
  }

  function owns(sku) {
    return state.owned.some(function (o) { return o.sku === sku; });
  }

  // Distinct skus owned among `skus` — for the "bộ sưu tập" progress bar.
  function countOf(skus) {
    var seen = {};
    state.owned.forEach(function (o) { if (skus.indexOf(o.sku) !== -1) seen[o.sku] = true; });
    return Object.keys(seen).length;
  }

  // → Promise<{ ok, added } | { ok:false, error }>
  function claim(code, phone) {
    code = String(code || '').trim().toUpperCase();
    if (!validCode(code) || String(phone || '').replace(/\D/g, '').length < 9) {
      return Promise.resolve({ ok: false, error: 'bad_input' });
    }
    if (!window.GemDB || !window.GemDB.claimCollection) {
      return Promise.resolve({ ok: false, error: 'offline' });
    }
    return window.GemDB.claimCollection(code, phone).then(function (res) {
      if (!res || !res.ok) return { ok: false, error: (res && res.error) || 'failed' };
      var before = state.owned.length;
      (res.items || []).forEach(function (sku) {
        // Designs bought on another device come back as the plain product:
        // the design itself only lives in the order note.
        var mine = state.owned.filter(function (o) { return o.code === res.code && o.sku === sku; });
        if (mine.length) mine.forEach(function (o) { if (res.received) o.received = true; });
        else addOwned(res.code, sku, null, res.received);
      });
      save();
      return { ok: true, added: state.owned.length - before, received: !!res.received };
    }, function () {
      return { ok: false, error: 'offline' };
    });
  }

  load();

  document.addEventListener('gem:ordered', function (e) {
    var d = e.detail || {};
    if (!validCode(d.code)) return;
    (d.items || []).forEach(function (it) {
      addOwned(d.code, it.sku, it.spec, false);
      if (it.spec) saveDesign(it.spec);
    });
    save();
  });

  // Another tab bought something: pick it up.
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) { load(); try { document.dispatchEvent(new CustomEvent('gem:tu')); } catch (x) { /* ignore */ } }
  });

  return {
    designs: function () { return state.designs.slice(); },
    owned: function () { return state.owned.slice(); },
    saveDesign: saveDesign,
    removeDesign: removeDesign,
    hasDesign: hasDesign,
    owns: owns,
    countOf: countOf,
    claim: claim
  };
})();

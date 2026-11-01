(function () {
  "use strict";

  var FD = window.FD;
  var D = window.FD_DATA;
  var el = FD.el;
  var money = FD.money;

  var VOL = ["Silent", "Low", "Medium", "High"];
  var GAIN = [0, 0.04, 0.16, 0.5];
  var REJECT_REASONS = ["Item sold out", "Restaurant closed", "Too busy right now"];
  var WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var ICONS = {
    orders: '<rect x="5" y="4" width="14" height="17" rx="1.5"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M8.5 11h7M8.5 14.5h7M8.5 18h4"/>',
    menu: '<path d="M6 3v7a2 2 0 0 0 2 2v9"/><path d="M10 3v7a2 2 0 0 1-2 2"/><path d="M8 3v5"/><path d="M17 3c-2 1.5-3 4-3 7 0 1.5 1 2.500 3 2.500V21"/>',
    wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M16 15h2"/>',
    vol0: '<path d="M4 9.500h3.500L12 5.500v13L7.500 14.500H4z"/><path d="M16 9.500l5 5M21 9.500l-5 5"/>',
    vol1: '<path d="M4 9.500h3.500L12 5.500v13L7.500 14.500H4z"/><path d="M15.500 10.500a2.500 2.500 0 0 1 0 3"/>',
    vol2: '<path d="M4 9.500h3.500L12 5.500v13L7.500 14.500H4z"/><path d="M15.500 10.500a2.500 2.500 0 0 1 0 3"/><path d="M18 8a6 6 0 0 1 0 8"/>',
    wifi: '<path d="M2.500 9a14 14 0 0 1 19 0"/><path d="M5.500 12.500a9.500 9.500 0 0 1 13 0"/><path d="M9 16a5 5 0 0 1 6 0"/><path d="M12 19.500h.01"/>',
    battery: '<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10.500v3"/><path d="M6 10v4M9 10v4M12 10v4"/>',
    phone: '<path d="M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    download: '<path d="M12 4v11"/><path d="M7.500 11 12 15.500 16.500 11"/><path d="M5 20h14"/>',
    send: '<path d="M4 12 20 4l-6 16-3-7z"/>'
  };
  function icon(name, cls) {
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("class", "rc-ic" + (cls ? " " + cls : ""));
    s.setAttribute("aria-hidden", "true");
    s.setAttribute("fill", "none");
    s.setAttribute("stroke", "currentColor");
    s.setAttribute("stroke-width", "1.8");
    s.setAttribute("stroke-linecap", "round");
    s.setAttribute("stroke-linejoin", "round");
    s.innerHTML = ICONS[name] || "";
    return s;
  }

  function tryLoad(name) { return D.loadData(name).catch(function () { return null; }); }
  function rows(x) {
    if (Array.isArray(x)) return x;
    if (x && typeof x === "object") {
      for (var k in x) { if (Array.isArray(x[k])) return x[k]; }
    }
    return [];
  }
  function pick(o, keys, dflt) {
    for (var i = 0; i < keys.length; i++) {
      if (o && o[keys[i]] !== undefined && o[keys[i]] !== null && o[keys[i]] !== "") return o[keys[i]];
    }
    return dflt;
  }
  function num(v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; }

  var FALLBACK_RESTAURANTS = [
    { id: "demo-1", name: "Dhanmondi Biryani Corner", area: "Dhanmondi", type: "restaurant", cuisine: "biryani", pct: 22 },
    { id: "demo-2", name: "Maa's Kitchen", area: "Mohammadpur", type: "home_kitchen", cuisine: "home_food", pct: 22 }
  ];
  var FALLBACK_MENU = {
    restaurant: [
      ["Kacchi Biryani", "Biryani", 420, 1], ["Chicken Tehari", "Biryani", 260, 1], ["Beef Tehari", "Biryani", 280, 1],
      ["Mutton Rezala", "Curry", 340, 1], ["Chicken Roast", "Sides", 120, 1], ["Plain Rice", "Sides", 50, 1],
      ["Borhani", "Drinks", 60, 1], ["Firni", "Desserts", 90, 0]
    ],
    home_kitchen: [
      ["Beef Bhuna Khichuri", "Mains", 320, 1], ["Hilsa Bhapa", "Mains", 380, 1], ["Chicken Curry", "Mains", 240, 1],
      ["Dal", "Sides", 60, 1], ["Alu Bhorta", "Sides", 70, 1], ["Payesh", "Desserts", 100, 1]
    ]
  };

  var ctx = { now: "2027-04-01 09:00:00", restaurants: [], menu: {}, payouts: [], personaId: null };

  function normRestaurant(x) {
    var type = String(pick(x, ["restaurant_type"], "")).toLowerCase();
    var cuisine = String(pick(x, ["cuisine"], "")).toLowerCase();
    if (!type && cuisine === "home_food") type = "home_kitchen";
    return {
      id: String(pick(x, ["restaurant_id", "id"], "")),
      name: pick(x, ["name", "restaurant_name"], ""),
      area: pick(x, ["area", "city"], ""),
      type: type || "restaurant",
      cuisine: cuisine,
      pct: num(pick(x, ["commission_pct_system", "commission_pct"], 20), 20)
    };
  }

  function loadContext() {
    return Promise.all([tryLoad("meta"), tryLoad("restaurants"), tryLoad("menu_items"), tryLoad("payouts")]).then(function (r) {
      var meta = r[0] || {};
      if (typeof meta.now === "string") ctx.now = meta.now;
      ctx.personaId = meta.personas && meta.personas.restaurant_id !== undefined ? String(meta.personas.restaurant_id) : null;
      var all = rows(r[1]).map(normRestaurant).filter(function (x) { return x.id !== "" && x.name; });
      var list = [];
      function add(x) { if (x && !list.some(function (y) { return y.id === x.id; })) list.push(x); }
      add(all.filter(function (x) { return x.id === ctx.personaId; })[0]);
      add(all.filter(function (x) { return x.type === "home_kitchen"; })[0]);
      add(all.filter(function (x) { return /biryani|kacchi/.test(x.cuisine) || /biryani|kacchi/i.test(x.name); })[0]);
      if (!list.length) add(all[0]);
      if (!list.some(function (x) { return x.type === "home_kitchen"; })) add(FALLBACK_RESTAURANTS[1]);
      if (!list.length) add(FALLBACK_RESTAURANTS[0]);
      ctx.restaurants = list;
      rows(r[2]).forEach(function (m) {
        var rid = String(pick(m, ["restaurant_id"], ""));
        var nm = pick(m, ["name", "item_name"], "");
        if (rid === "" || !nm) return;
        var avail = true;
        if (m.available === false || m.available === 0 || m.is_available === false || m.is_available === 0) avail = false;
        if (m.status === "unavailable" || m.status === "sold_out") avail = false;
        if (m.stock_qty !== undefined && m.stock_qty !== null && num(m.stock_qty, 1) <= 0) avail = false;
        (ctx.menu[rid] = ctx.menu[rid] || []).push({ name: nm, cat: pick(m, ["category", "cuisine"], "Menu"), price: num(pick(m, ["price", "price_tk"], 0), 0), avail: avail });
      });
      ctx.payouts = rows(r[3]);
    });
  }

  function menuFor(rest) {
    var m = ctx.menu[rest.id];
    if (m && m.length) return m;
    var fb = FALLBACK_MENU[rest.type] || FALLBACK_MENU.restaurant;
    return fb.map(function (x) { return { name: x[0], cat: x[1], price: x[2], avail: !!x[3] }; });
  }

  var S = { restId: null, vol: 1, tab: "orders", simSec: 0, autoDone: false, lastAlert: "none yet", byRest: {}, wa: {} };
  var M = null;
  var ui = {};
  var root = null;
  var audio = null, gesture = false;
  window.__rcBeeps = [];
  window.__rcSilent = [];

  function save() {
    D.write("rc_state", S);
  }
  function rest() {
    return ctx.restaurants.filter(function (x) { return x.id === S.restId; })[0] || ctx.restaurants[0];
  }
  function bucket() {
    var id = rest().id;
    if (!S.byRest[id]) { S.byRest[id] = seedBucket(rest()); }
    return S.byRest[id];
  }

  function mkItems(menu, k) {
    var a = menu[(k * 2) % menu.length], b = menu[(k * 2 + 1) % menu.length];
    var items = [{ name: a.name, qty: 1 + (k % 3), price: a.price }];
    if (b !== a) items.push({ name: b.name, qty: 1 + ((k + 1) % 2), price: b.price });
    return items;
  }
  function seedBucket(r) {
    var menu = menuFor(r).filter(function (x) { return x.avail; });
    if (!menu.length) menu = menuFor(r);
    var o1 = { no: 5071, status: "preparing", items: mkItems(menu, 5), pay: "cash", at: -840, note: "" };
    var o2 = { no: 5072, status: "preparing", items: mkItems(menu, 2), pay: "prepaid", at: -420, note: "Less spicy please" };
    var o3 = { no: 5069, status: "ready", items: mkItems(menu, 3), pay: "prepaid", at: -1500, note: "" };
    return { orders: [o1, o2, o3], done: 6, seq: 0, seen: [] };
  }

  function nowDate() {
    var p = D.parseIso(ctx.now) || { y: 2027, mo: 4, d: 1, hh: 9, mm: 0, ss: 0 };
    return new Date(Date.UTC(p.y, p.mo - 1, p.d, p.hh, p.mm, p.ss + S.simSec));
  }
  function two(n) { return (n < 10 ? "0" : "") + n; }
  function clockText() { var d = nowDate(); return two(d.getUTCHours()) + ":" + two(d.getUTCMinutes()); }
  function isoDay(d) { return d.getUTCFullYear() + "-" + two(d.getUTCMonth() + 1) + "-" + two(d.getUTCDate()); }
  function addDaysIso(iso, n) { return D.addDays(iso, n); }
  function dayName(iso) {
    var p = D.parseIso(iso);
    return p ? WEEKDAYS[new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay()] : "";
  }
  function niceDate(iso) { return dayName(iso) + ", " + D.fmtDate(iso); }
  function weekLabel(s, e) {
    var a = D.parseIso(s), b = D.parseIso(e);
    if (!a || !b) return String(s) + " to " + String(e);
    return a.d + (a.mo !== b.mo ? " " + MONTHS[a.mo - 1] : "") + " to " + b.d + " " + MONTHS[b.mo - 1] + " " + b.y;
  }
  function mmss(sec) { var s = Math.max(0, sec); return Math.floor(s / 60) + ":" + two(s % 60); }

  function beep() {
    var level = S.vol;
    if (level === 0) {
      window.__rcSilent.push(S.simSec);
      S.lastAlert = "no sound (tablet is silent)";
      return;
    }
    window.__rcBeeps.push({ vol: level, at: S.simSec });
    S.lastAlert = "one beep at " + VOL[level].toLowerCase() + " volume";
    if (!gesture) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audio = audio || new AC();
      if (audio.state === "suspended") audio.resume();
      var t0 = audio.currentTime;
      for (var i = 0; i < 3; i++) {
        var osc = audio.createOscillator(), g = audio.createGain();
        osc.type = "square"; osc.frequency.value = 880;
        g.gain.setValueAtTime(GAIN[level], t0 + i * 0.28);
        g.gain.setValueAtTime(0, t0 + i * 0.28 + 0.16);
        osc.connect(g); g.connect(audio.destination);
        osc.start(t0 + i * 0.28); osc.stop(t0 + i * 0.28 + 0.18);
      }
    } catch (e) {  }
  }

  function newOrder(o) {
    var b = bucket();
    b.orders.unshift(o);
    beep();
    save();
    render();
  }
  function testOrder() {
    var b = bucket();
    b.seq += 1;
    var menu = menuFor(rest()).filter(function (x) { return x.avail; });
    if (!menu.length) menu = menuFor(rest());
    newOrder({ no: 5080 + b.seq, status: "new", items: mkItems(menu, b.seq + 3), pay: b.seq % 2 ? "cash" : "prepaid", at: S.simSec,
      note: b.seq % 3 === 0 ? "No onion please" : "" });
  }

  function pollShared() {
    var list = D.read("orders_new", []);
    if (!Array.isArray(list) || !list.length) return;
    var b = bucket();
    list.forEach(function (o) {
      if (!o || String(o.restaurant_id) !== rest().id) return;
      var key = "shared-" + o.id;
      if (b.seen.indexOf(key) !== -1) return;
      b.seen.push(key);
      var items = (o.items || []).map(function (i) { return { name: i.name, qty: i.qty || 1, price: i.price || 0 }; });
      if (!items.length) return;
      newOrder({ no: o.id, status: "new", items: items, pay: o.payment_method === "cod" ? "cash" : "prepaid", at: S.simSec, note: "", shared: true });
    });
  }
  function syncShared(o, action) {
    if (!o.shared || !window.FD_STORE || !FD_STORE.advance) return;
    try { FD_STORE.advance(o.no, action).catch(function () {  }); } catch (e) {  }
  }

  function toast(msg) {
    var old = root.querySelector(".rc-toast");
    if (old) old.remove();
    var n = el("div", { "class": "rc-toast", role: "status", "data-testid": "rest-toast", text: msg });
    var host = root.querySelector(".rc-tablet") || root;
    host.appendChild(n);
    setTimeout(function () { if (n.parentNode) n.remove(); }, 2600);
  }

  function setVol(v) {
    S.vol = v; ui.volOpen = false; save(); render();
  }

  function strip() {
    var r = rest();
    var sel = el("select", { "data-testid": "rest-switch", "aria-label": "Restaurant", onchange: function (e) { S.restId = e.target.value; S.tab = "orders"; save(); render(); } },
      ctx.restaurants.map(function (x) {
        return el("option", { value: x.id, selected: x.id === r.id ? "selected" : null, text: x.name + (x.type === "home_kitchen" ? " (home kitchen)" : "") });
      }));
    sel.value = r.id;
    ui.last = el("span", { "class": "rc-last", "data-testid": "rest-last-alert", text: "Last new-order alert: " + S.lastAlert });
    return el("div", { "class": "rc-strip" }, [
      el("span", { text: "Restaurant" }), sel,
      el("span", { text: "Tablet volume" }),
      el("span", { "class": "rc-segs" }, VOL.map(function (v, i) {
        return el("button", { type: "button", "class": S.vol === i ? "is-on" : "", "data-testid": "rest-strip-vol-" + i, text: v, onclick: function () { setVol(i); } });
      })),
      el("button", { "class": "rc-sbtn", type: "button", "data-testid": "rest-test-order", text: "Send test order", onclick: function () { gesture = true; testOrder(); } }),
      el("button", { "class": "rc-sbtn", type: "button", "data-testid": "rest-reset", text: "Reset data", onclick: resetDemo }),
      el("span", { "class": "rc-sp" }),
      ui.last
    ]);
  }

  function resetDemo() {
    D.write("rc_state", null);
    S.byRest = {}; S.wa = {}; S.simSec = 0; S.autoDone = false; S.lastAlert = "none yet"; S.vol = 1; S.tab = "orders";
    window.__rcBeeps = []; window.__rcSilent = [];
    M = null;
    save(); render();
  }

  function statusBar() {
    ui.clock = el("span", { text: clockText() });
    var volIcon = S.vol === 0 ? "vol0" : S.vol === 1 ? "vol1" : "vol2";
    var btn = el("button", { "class": "rc-vol", type: "button", "data-testid": "rest-volume-icon", "aria-label": "Volume: " + VOL[S.vol],
      onclick: function (e) { e.stopPropagation(); ui.volOpen = !ui.volOpen; render(); } }, [icon(volIcon, "rc-ic-sm")]);
    return el("div", { "class": "rc-status" }, [
      ui.clock,
      el("div", { "class": "rc-status-r" }, [btn, icon("wifi", "rc-ic-sm"), icon("battery", "rc-ic-sm")])
    ]);
  }

  function volPop() {
    return el("div", { "class": "rc-volpop", "data-testid": "rest-volume-pop", role: "dialog", "aria-label": "Volume" }, [
      el("h3", { text: "Tablet volume" }),
      el("div", { "class": "rc-segs" }, VOL.map(function (v, i) {
        return el("button", { type: "button", "class": S.vol === i ? "is-on" : "", "data-testid": "rest-vol-" + i, text: v, onclick: function () { setVol(i); } });
      })),
      el("button", { "class": "rc-btn rc-btn-sm", type: "button", "data-testid": "rest-vol-close", text: "Done", onclick: function () { ui.volOpen = false; render(); } })
    ]);
  }

  function rail() {
    var b = bucket();
    var newCount = b.orders.filter(function (o) { return o.status === "new"; }).length;
    function nav(id, label, ic, badge) {
      return el("button", { "class": "rc-nav" + (S.tab === id ? " is-active" : ""), type: "button", "data-testid": "rest-tab-" + id, "aria-current": S.tab === id ? "page" : null,
        onclick: function () { S.tab = id; save(); render(); } },
        [icon(ic), el("span", { text: label })].concat(badge ? [el("span", { "class": "rc-badge", "data-testid": "rest-new-badge", text: String(badge) })] : []));
    }
    var brand = el("div", { "class": "rc-brand" });
    brand.innerHTML = '<span class="fd-wordmark"><svg class="fd-wordmark-mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16a8 8 0 0 1-16 0Z"/><path d="M9 8.5c0-1.2.9-1.2.9-2.4M13 8.5c0-1.2.9-1.2.9-2.4"/></svg><span class="fd-wordmark-text">Food Delivery</span></span>';
    return el("nav", { "class": "rc-rail", "aria-label": "Main" }, [
      brand,
      el("div", { "class": "rc-rname" }, [el("b", { "data-testid": "rest-name", text: rest().name }), el("span", { text: rest().area })]),
      nav("orders", "Orders", "orders", newCount),
      nav("menu", "Menu", "menu", 0),
      nav("payouts", "Payouts", "wallet", 0)
    ]);
  }

  function orderTotal(o) { return o.items.reduce(function (s, i) { return s + i.qty * i.price; }, 0); }

  function orderCard(o) {
    ui.timers = ui.timers || [];
    var top = [el("b", { text: "#" + o.no })];
    if (o.status === "new") {
      var w = el("span", { "class": "rc-muted rc-small", "data-testid": "rest-waiting" });
      w.textContent = "Waiting " + mmss(S.simSec - o.at);
      ui.timers.push({ node: w, order: o });
      top.push(el("span", { "class": "fd-pill", dataset: { status: "placed" }, text: "New" }));
      top.push(el("span", { style: { flex: "1" } }));
      top.push(w);
    } else {
      top.push(el("span", { "class": "fd-pill", dataset: { status: o.status === "ready" ? "transit" : "accepted" }, text: o.status === "ready" ? "Ready" : "Preparing" }));
    }
    var card = el("div", { "class": "rc-card" + (o.fresh ? " rc-fadein" : ""), "data-testid": "rest-order-" + o.status, dataset: { no: String(o.no) } }, [
      el("div", { "class": "rc-card-top" }, top),
      el("ul", { "class": "rc-items" }, o.items.map(function (i) { return el("li", {}, [el("span", { text: i.name }), el("b", { text: "x" + i.qty })]); })),
      o.note ? el("div", { "class": "rc-note", text: "Note: " + o.note }) : null,
      el("div", { "class": "rc-small rc-muted" }, [(o.pay === "cash" ? "Cash on delivery" : "Paid online") + ", food total ", el("b", { "class": "rc-money", text: money(orderTotal(o)) })])
    ]);
    o.fresh = false;
    var acts;
    if (o.status === "new") {
      acts = el("div", { "class": "rc-actions" }, [
        el("button", { "class": "rc-btn", type: "button", "data-testid": "rest-reject", text: "Reject", onclick: function () { gesture = true; M = { type: "reject", no: o.no }; render(); } }),
        el("button", { "class": "rc-btn rc-btn-primary", type: "button", "data-testid": "rest-accept", text: "Accept", onclick: function () { gesture = true; setStatus(o, "preparing", "accept"); } })
      ]);
    } else if (o.status === "preparing") {
      acts = el("div", { "class": "rc-actions" }, [
        el("button", { "class": "rc-btn rc-btn-primary", type: "button", "data-testid": "rest-ready", text: "Order ready", onclick: function () { setStatus(o, "ready", "ready"); } })
      ]);
    } else {
      acts = el("div", { "class": "rc-actions" }, [
        el("button", { "class": "rc-btn", type: "button", "data-testid": "rest-handover", text: "Handed to rider", onclick: function () { setStatus(o, "done", null); } })
      ]);
    }
    card.appendChild(acts);
    return card;
  }

  function setStatus(o, status, action) {
    var b = bucket();
    o.status = status;
    if (status === "done") {
      b.orders = b.orders.filter(function (x) { return x !== o; });
      b.done += 1;
    }
    if (action) syncShared(o, action);
    save(); render();
    if (status === "done") toast("Order #" + o.no + " handed to rider");
  }

  function ordersScreen() {
    ui.timers = [];
    var b = bucket();
    function col(title, status, emptyText) {
      var list = b.orders.filter(function (o) { return o.status === status; });
      var body = el("div", { "class": "rc-col-b" }, list.length ? list.map(orderCard) : [el("div", { "class": "rc-empty", text: emptyText })]);
      return el("section", { "class": "rc-col", "data-testid": "rest-col-" + status, "aria-label": title }, [
        el("div", { "class": "rc-col-h" }, [el("h2", { style: { margin: "0", fontSize: "15px" }, text: title }), el("span", { text: String(list.length) })]), body]);
    }
    return el("div", { "class": "rc-content" }, [
      el("div", { "class": "rc-head" }, [
        el("h1", { text: "Live orders" }), el("span", { "class": "rc-sp" }),
        el("span", { "class": "rc-muted", "data-testid": "rest-done-count", text: "Handed to riders today: " + b.done })
      ]),
      el("div", { "class": "rc-board" }, [
        col("New", "new", "No new orders"),
        col("Preparing", "preparing", "Nothing being prepared"),
        col("Ready for rider", "ready", "No orders waiting for a rider")
      ])
    ]);
  }

  function menuScreen() {
    var items = menuFor(rest());
    var cats = [];
    items.forEach(function (i) { if (cats.indexOf(i.cat) === -1) cats.push(i.cat); });
    var cat = ui.cat && (ui.cat === "All" || cats.indexOf(ui.cat) !== -1) ? ui.cat : "All";
    var shown = items.filter(function (i) { return cat === "All" || i.cat === cat; });
    var table = el("table", { "class": "rc-table", "data-testid": "rest-menu-table" }, [
      el("thead", {}, [el("tr", {}, [el("th", { text: "Item" }), el("th", { text: "Category" }), el("th", { "class": "r", text: "Price" }), el("th", { text: "Status" })])]),
      el("tbody", {}, shown.map(function (i) {
        return el("tr", { "data-testid": "rest-menu-row" }, [
          el("td", { style: { fontWeight: "600" }, text: i.name }), el("td", { "class": "rc-muted", text: i.cat }),
          el("td", { "class": "r rc-money", text: money(i.price) }),
          el("td", {}, [i.avail ? el("span", { "class": "rc-muted", text: "Available" }) : el("span", { "class": "rc-pillsold", text: "Sold out" })])
        ]);
      }))
    ]);
    return el("div", { "class": "rc-content" }, [
      el("div", { "class": "rc-head" }, [
        el("h1", { text: "Menu" }), el("span", { "class": "rc-sp" }),
        el("span", { "class": "rc-soon", "data-testid": "rest-photo-soon", text: "Photo reviews: coming soon" })
      ]),
      el("div", { "class": "rc-pad" }, [
        el("div", { "class": "rc-banner", "data-testid": "rest-menu-banner" }, [
          el("span", { text: "To change items or mark sold out, contact your KAM" }), el("span", { "class": "rc-sp" }),
          el("button", { "class": "rc-btn rc-btn-primary", type: "button", "data-testid": "rest-contact-kam", text: "Contact KAM", onclick: function () { M = { type: "kam" }; render(); } })
        ]),
        el("div", { "class": "rc-chips" }, ["All"].concat(cats).map(function (c) {
          return el("button", { "class": "rc-chip" + (c === cat ? " is-on" : ""), type: "button", "data-testid": "rest-chip", text: c, onclick: function () { ui.cat = c; render(); } });
        })),
        el("div", { "class": "rc-tablebox" }, [table])
      ])
    ]);
  }

  var KAM = { name: "Ayesha (KAM)", phone: "01711-000412" };
  function waThread() {
    var id = rest().id;
    if (!S.wa[id]) {
      S.wa[id] = [
        { day: "Yesterday" },
        { me: true, text: "Apu beef tehari shesh, menu theke off kore den", t: "12:52" },
        { me: false, text: "Ji bhai, kore dilam", t: "16:20" },
        { day: "Today" },
        { me: true, text: "Apu beef tehari abar ache, on kore den", t: "08:40" },
        { me: false, text: "Done bhai", t: "11:55" }
      ];
    }
    return S.wa[id];
  }

  function modalLayer() {
    if (!M) return null;
    var close = function () { M = null; render(); };
    if (M.type === "reject") {
      return el("div", { "class": "rc-overlay", "data-testid": "rest-reject-sheet", role: "dialog", "aria-label": "Reject order" }, [
        el("div", { "class": "rc-modal" }, [el("h2", { text: "Why are you rejecting order #" + M.no + "?" })]
          .concat(REJECT_REASONS.map(function (r) {
            return el("button", { "class": "rc-opt", type: "button", "data-testid": "rest-reject-reason", text: r, onclick: function () {
              var b = bucket();
              var no = M.no;
              b.orders = b.orders.filter(function (o) { return o.no !== no; });
              M = null; save(); render(); toast("Order #" + no + " rejected: " + r);
            } });
          }))
          .concat([el("button", { "class": "rc-btn", type: "button", "data-testid": "rest-reject-back", text: "Back", onclick: close })]))
      ]);
    }
    if (M.type === "kam") {
      return el("div", { "class": "rc-overlay", "data-testid": "rest-kam-sheet", role: "dialog", "aria-label": "Contact KAM" }, [
        el("div", { "class": "rc-modal" }, [
          el("h2", { text: "Contact your KAM" }),
          el("div", { "class": "rc-muted", text: KAM.name + ", " + KAM.phone }),
          el("button", { "class": "rc-btn rc-btn-primary rc-btn-block", type: "button", "data-testid": "rest-kam-call", onclick: function () { M = { type: "call" }; render(); } }, [icon("phone"), "Call KAM"]),
          el("button", { "class": "rc-btn rc-btn-block", type: "button", "data-testid": "rest-kam-wa", onclick: function () { M = { type: "wa" }; render(); } }, [icon("chat"), "Message on WhatsApp"]),
          el("button", { "class": "rc-btn rc-btn-block", type: "button", "data-testid": "rest-kam-close", text: "Close", onclick: close })
        ])
      ]);
    }
    if (M.type === "call") {
      return el("div", { "class": "rc-overlay", "data-testid": "rest-call", role: "dialog", "aria-label": "Calling" }, [
        el("div", { "class": "rc-modal", style: { alignItems: "center", textAlign: "center" } }, [
          icon("phone", "rc-ic-lg"), el("div", { "class": "rc-muted", text: "Calling..." }),
          el("h2", { text: KAM.name }), el("div", { text: KAM.phone }),
          el("button", { "class": "rc-btn rc-btn-primary", type: "button", "data-testid": "rest-end-call", text: "End call", onclick: close })
        ])
      ]);
    }
    if (M.type === "wa") {
      var thread = waThread();
      var body = el("div", { "class": "rc-wa-b", "data-testid": "rest-wa-body" }, thread.map(function (m) {
        if (m.day) return el("div", { "class": "rc-day", text: m.day });
        return el("div", { "class": "rc-msg" + (m.me ? " me" : "") }, [m.text, el("small", {}, [m.t + (m.me ? " " : ""), m.me ? icon("check", "rc-ic-sm") : null])]);
      }));
      var input = el("input", { type: "text", placeholder: "Type a message", "aria-label": "Message", "data-testid": "rest-wa-input" });
      var send = function () {
        var v = input.value.trim();
        if (!v) return;
        thread.push({ me: true, text: v, t: clockText() });
        ui.waFocus = true;
        save(); render();
      };
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") send(); });
      setTimeout(function () {
        var bb = root.querySelector(".rc-wa-b"); if (bb) bb.scrollTop = bb.scrollHeight;
        var ii = root.querySelector('[data-testid="rest-wa-input"]'); if (ii && ui.waFocus) { ii.focus(); }
      }, 0);
      return el("div", { "class": "rc-overlay", "data-testid": "rest-wa", role: "dialog", "aria-label": "WhatsApp" }, [
        el("div", { "class": "rc-wa" }, [
          el("div", { "class": "rc-wa-h" }, [icon("chat"), el("span", { text: KAM.name }), el("span", { "class": "rc-sp" }),
            el("button", { type: "button", "data-testid": "rest-wa-close", "aria-label": "Close", onclick: close }, [icon("x")])]),
          body,
          el("div", { "class": "rc-wa-f" }, [input, el("button", { "class": "rc-btn rc-btn-primary", type: "button", "data-testid": "rest-wa-send", onclick: send }, [icon("send"), "Send"])])
        ])
      ]);
    }
    if (M.type === "statement") {
      var s = M.row;
      return el("div", { "class": "rc-overlay", "data-testid": "rest-statement", role: "dialog", "aria-label": "Statement" }, [
        el("div", { "class": "rc-modal" }, [
          el("h2", { text: "Statement: " + weekLabel(s.start, s.end) }),
          el("div", { "class": "rc-lines" }, [
            line("Orders", String(s.orders)),
            line("Sales", money(s.gross)),
            line("Commission " + s.pct + "%", "- " + money(s.commission), "rest-stmt-commission"),
            line("Deductions", "- " + money(s.deductions)),
            line("Payout", money(s.payout), null, true),
            line(s.paid ? "Paid on" : "To be paid on", niceDate(s.paidOn)),
            line("Paid to", s.method === "bkash_merchant" ? "bKash merchant account" : "Bank account on file")
          ]),
          el("button", { "class": "rc-btn rc-btn-primary rc-btn-block", type: "button", "data-testid": "rest-stmt-download", onclick: function () { downloadStatement(s); } }, [icon("download"), "Download statement"]),
          el("button", { "class": "rc-btn rc-btn-block", type: "button", "data-testid": "rest-stmt-close", text: "Close", onclick: close })
        ])
      ]);
    }
    return null;
  }
  function line(a, b, tid, total) {
    return el("div", { "class": "rc-line" + (total ? " is-total" : "") }, [el("span", { text: a }), el("span", { "class": "rc-money", "data-testid": tid || null, text: b })]);
  }

  function downloadStatement(s) {
    var r = rest();
    var csv = [
      "restaurant,week_start,week_end,orders,sales_tk,commission_pct,commission_tk,deductions_tk,payout_tk,paid_on",
      ['"' + r.name.replace(/"/g, '""') + '"', s.start, s.end, s.orders, s.gross, s.pct, s.commission, s.deductions, s.payout, s.paidOn].join(",")
    ].join("\n");
    try {
      var blob = new Blob([csv], { type: "text/csv" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = "statement-" + s.start + ".csv";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      toast("Statement downloaded");
    } catch (e) { toast("Download is not available here"); }
  }

  function statements(r) {
    var todayIso = isoDay(nowDate());
    var out = [];
    var mine = ctx.payouts.filter(function (x) {
      return String(pick(x, ["restaurant_id"], "")) === r.id && pick(x, ["week_start"], null);
    });
    if (mine.length) {
      mine.sort(function (a, b) { return String(b.week_start).localeCompare(String(a.week_start)); });
      mine.slice(0, 8).forEach(function (x) {
        var gross = num(pick(x, ["gross_sales_tk", "gross_amount"], 0), 0);
        var pct = num(pick(x, ["commission_pct_applied"], r.pct), r.pct);
        var comm = num(pick(x, ["commission_tk", "commission"], Math.round(gross * pct / 100)), 0);
        var ded = num(pick(x, ["deductions_tk", "deductions"], 0), 0);
        var end = String(pick(x, ["week_end"], addDaysIso(String(x.week_start).slice(0, 10), 6))).slice(0, 10);
        var paidOn = String(pick(x, ["paid_on"], addDaysIso(end, 5))).slice(0, 10);
        out.push({
          start: String(x.week_start).slice(0, 10), end: end, orders: num(pick(x, ["orders_count"], 0), 0), gross: gross, pct: pct, commission: comm,
          deductions: ded, payout: num(pick(x, ["payout_tk", "net_amount"], gross - comm - ded), 0), paidOn: paidOn, method: pick(x, ["payout_method"], "bank_batch"),
          paid: paidOn <= todayIso
        });
      });
      return out;
    }
    var d = nowDate();
    var back = d.getUTCDay() + 1;
    var scale = r.type === "home_kitchen" ? 0.27 : 1;
    var ords = [338, 352, 361, 347, 329, 355, 342, 360];
    var avg = [478, 482, 476, 481, 479, 484, 477, 480];
    var ded = [0, 350, 0, 0, 600, 0, 0, 250];
    var lastSat = addDaysIso(todayIso, -back);
    for (var k = 0; k < 8; k++) {
      var end = addDaysIso(lastSat, -7 * k);
      var n = Math.round(ords[k] * scale);
      var gross = n * avg[k];
      var comm = Math.round(gross * r.pct / 100);
      var paidOn = addDaysIso(end, 5);
      out.push({ start: addDaysIso(end, -6), end: end, orders: n, gross: gross, pct: r.pct, commission: comm, deductions: ded[k], payout: gross - comm - ded[k],
        paidOn: paidOn, method: "bank_batch", paid: paidOn <= todayIso });
    }
    return out;
  }

  function payoutsScreen() {
    var r = rest();
    var st = statements(r);
    var latest = st[0];
    var next = st.filter(function (x) { return !x.paid; })[0];
    var dow = nowDate().getUTCDay();
    var perDay = latest ? latest.orders / 7 : 0;
    var soFar = Math.round(perDay * (dow + 1));
    var soFarSales = latest && latest.orders ? Math.round(latest.gross / latest.orders * soFar) : 0;
    var table = el("table", { "class": "rc-table", "data-testid": "rest-payout-table" }, [
      el("thead", {}, [el("tr", {}, ["Week", "Orders", "Sales", "Commission", "Deductions", "Payout", "Paid on"].map(function (h, i) {
        return el("th", { "class": i >= 1 && i <= 5 ? "r" : "", text: h });
      }).concat([el("th", { text: "Status" })]))]),
      el("tbody", {}, st.map(function (s, idx) {
        return el("tr", { "class": "rc-click", tabindex: "0", role: "button", "data-testid": "rest-payout-row", "aria-label": "Open statement " + weekLabel(s.start, s.end),
          onclick: function () { M = { type: "statement", row: s }; render(); },
          onkeydown: function (e) { if (e.key === "Enter") { M = { type: "statement", row: s }; render(); } } }, [
          el("td", { style: { fontWeight: "600" }, text: weekLabel(s.start, s.end) }),
          el("td", { "class": "r", text: String(s.orders) }),
          el("td", { "class": "r rc-money", text: money(s.gross) }),
          el("td", { "class": "r rc-money", text: money(s.commission) + " (" + s.pct + "%)" }),
          el("td", { "class": "r rc-money", text: money(s.deductions) }),
          el("td", { "class": "r rc-money", style: { fontWeight: "700" }, text: money(s.payout) }),
          el("td", { text: D.fmtDate(s.paidOn) }),
          el("td", {}, [el("span", { "class": "fd-pill", dataset: { status: s.paid ? "delivered" : "placed" }, text: s.paid ? "Paid" : "Scheduled" })])
        ]);
      }))
    ]);
    return el("div", { "class": "rc-content" }, [
      el("div", { "class": "rc-head" }, [el("h1", { text: "Payouts" }), el("span", { "class": "rc-sp" }),
        el("span", { "class": "rc-muted", "data-testid": "rest-payout-note", text: "Paid every Thursday for the week before" })]),
      el("div", { "class": "rc-pad" }, [
        el("div", { "class": "rc-kpis" }, [
          el("div", { "class": "rc-kpi" }, [el("span", { text: next ? "Next payout" : "Last payout" }), el("b", { "data-testid": "rest-next-payout", text: money((next || latest || { payout: 0 }).payout) }),
            el("span", { text: next ? niceDate(next.paidOn) : latest ? niceDate(latest.paidOn) : "" })]),
          el("div", { "class": "rc-kpi" }, [el("span", { text: "This week so far (Sun to today)" }), el("b", { text: soFar + " orders" }), el("span", { text: money(soFarSales) + " sales. Statement is made after the week ends." })])
        ]),
        el("div", { "class": "rc-tablebox" }, [table])
      ])
    ]);
  }

  function render() {
    root.innerHTML = "";
    ui.timers = [];
    var screen = S.tab === "menu" ? menuScreen() : S.tab === "payouts" ? payoutsScreen() : ordersScreen();
    var tablet = el("div", { "class": "rc-tablet" }, [
      statusBar(),
      el("div", { "class": "rc-main" }, [rail(), screen])
    ]);
    if (ui.volOpen) tablet.appendChild(volPop());
    var m = modalLayer();
    if (m) tablet.appendChild(m);
    root.appendChild(strip());
    root.appendChild(tablet);
  }

  function tick() {
    S.simSec += 1;
    if (ui.clock) ui.clock.textContent = clockText();
    (ui.timers || []).forEach(function (t) { t.node.textContent = "Waiting " + mmss(S.simSec - t.order.at); });
    if (!S.autoDone && S.simSec >= 6) {
      S.autoDone = true;
      var b = bucket();
      if (!b.orders.some(function (o) { return o.status === "new"; })) testOrder();
    }
    if (S.simSec % 2 === 0) pollShared();
    if (S.simSec % 5 === 0) save();
  }

  function boot() {
    root = document.getElementById("rc-root");
    var saved = D.read("rc_state", null);
    if (saved && typeof saved === "object") { Object.keys(saved).forEach(function (k) { S[k] = saved[k]; }); }
    document.addEventListener("pointerdown", function () { gesture = true; }, { once: true });
    document.addEventListener("click", function (e) {
      if (ui.volOpen && !e.target.closest(".rc-volpop") && !e.target.closest(".rc-vol")) { ui.volOpen = false; render(); }
    });
    loadContext().catch(function () {  }).then(function () {
      if (!ctx.restaurants.length) ctx.restaurants = FALLBACK_RESTAURANTS.slice();
      if (!S.restId || !ctx.restaurants.some(function (x) { return x.id === S.restId; })) S.restId = ctx.restaurants[0].id;
      render();
      setInterval(tick, 1000);
    });
  }

  boot();
})();

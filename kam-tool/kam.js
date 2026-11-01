(function () {
  "use strict";

  var CSV_IMPORT_ENABLED = false;

  var el = FD.el;
  var D = FD_DATA;
  var root = document.getElementById("app-root");
  var PAGE = 50;
  var CATS = ["Biryani", "Kacchi", "Burger", "Pizza", "Chinese", "Bangla", "Street food", "Cafe", "Home food", "Desserts", "Drinks", "Sides", "Other"];

  var ICONS = {
    store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
    inbox: '<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 3h6l1-3h5"/>',
    percent: '<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/>',
    wallet: '<path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 7l12-3v3"/><circle cx="17" cy="13.5" r="1"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.5v.01"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    chevR: '<path d="M9 6l6 6-6 6"/>',
    chevL: '<path d="M15 6l-6 6 6 6"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>'
  };
  function ic(name) {
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("class", "fd-icon fd-icon-sm");
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = ICONS[name] || "";
    return s;
  }

  function hash(s) {
    var h = 7;
    s = String(s);
    for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) % 2147483647; }
    return h;
  }
  function pick(arr, seed) { return arr[hash(seed) % arr.length]; }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }
  function rows(x) {
    if (Array.isArray(x)) { return x; }
    if (x && typeof x === "object") {
      var keys = ["rows", "data", "items", "history", "payouts", "tickets", "requests", "restaurants"];
      for (var i = 0; i < keys.length; i++) { if (Array.isArray(x[keys[i]])) { return x[keys[i]]; } }
    }
    return [];
  }
  var memo = {};
  function once(key, fn) { if (!memo[key]) { memo[key] = fn(); } return memo[key]; }
  function tryLoad(names) {
    var i = 0;
    function next() {
      if (i >= names.length) { return Promise.resolve([]); }
      return D.loadData(names[i++]).then(rows, next);
    }
    return next();
  }
  function now() { return once("now", function () { return D.loadData("meta").then(function (m) { return (m && m.now) || "2027-03-29 13:10:00"; }, function () { return "2027-03-29 13:10:00"; }); }); }
  function saved(key, dflt) { return D.read("kam_" + key, dflt); }
  function save(key, val) { D.write("kam_" + key, val); }
  function fmtMin(m) {
    m = num(m);
    if (m === null) { return ""; }
    if (m < 60) { return Math.round(m) + " min"; }
    var h = Math.floor(m / 60), r = Math.round(m % 60);
    if (h < 48) { return h + "h" + (r ? " " + r + "m" : ""); }
    return Math.round(h / 24) + " days";
  }
  function cap(s) {
    s = String(s || "");
    if (s === "whatsapp") { return "WhatsApp"; }
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
  }

  var STATUS_LABEL = { live: "Live", in_queue: "In queue", left: "Left", withdrawn: "Withdrawn" };
  var STATUS_PILL = { live: "delivered", in_queue: "placed", left: "cancelled", withdrawn: "cancelled" };

  function normRest(r) {
    var st = r.status || (r.open === false ? "left" : "live");
    return {
      id: String(r.restaurant_id != null ? r.restaurant_id : r.id),
      name: r.name || "",
      area: r.area || "",
      cuisine: r.cuisine || "",
      type: r.restaurant_type || "restaurant",
      signed_on: r.signed_on || "",
      live_on: r.live_on || "",
      status: st,
      left_on: r.left_on || "",
      withdrawn_on: r.withdrawn_on || "",
      exit_reason: r.exit_reason || "",
      c_contract: num(r.commission_pct_contract),
      c_system: num(r.commission_pct_system),
      packaging: r.packaging || "",
      kam_id: r.kam_id || "",
      onboarded_by: r.onboarded_by || "",
      docs_done_on: r.docs_done_on || "",
      menu_done_on: r.menu_done_on || "",
      days: num(r.days_signed_to_live_or_now),
      extra: false
    };
  }
  function baseRestaurants() {
    return once("rest", function () {
      return tryLoad(["restaurants"]).then(function (list) { return list.map(normRest); });
    });
  }
  function restaurants() {
    return Promise.all([baseRestaurants(), now()]).then(function (res) {
      var extra = saved("extra_rest", []);
      var live = saved("live", {});
      return res[0].concat(extra).map(function (r) {
        if (live[r.id]) {
          return Object.assign({}, r, { status: "live", live_on: live[r.id].slice(0, 10) });
        }
        return r;
      });
    });
  }
  function restMap(list) { var m = {}; list.forEach(function (r) { m[r.id] = r; }); return m; }

  var MSG = {
    item_unavailable: ["Beef tehari shesh", "Kacchi shesh hoye gese, bondho kore den", "Chicken roast ajker moto nai", "Borhani shesh"],
    discount_new: ["Weekend e 15% discount dite chai", "Notun discount lagabo, 20% Friday te", "Ei shoptaho 10% off korte parben?"],
    discount_change: ["Discount ta 10 theke 15 kore den", "Discount er end date barai den", "Percent komay den please"],
    discount_stop: ["Discount ta bondho kore den ajke", "Offer shesh, off kore den"],
    menu_change: ["Price change: Chicken biryani 280 hobe", "Ekta notun item add korben", "Combo er nam change korte hobe"],
    payout_query: ["Amar payout ashe nai ei shoptaho", "Payout e koto kaata gese bujhlam na", "Statement er total mile na"],
    commission_query: ["Commission koto percent katen apnara?", "Amader 15% bola hoyechilo"],
    onboarding: ["Menu pathalam, kobe live hobe?", "Document gulo diyechi, ar ki lagbe?"]
  };
  function normReq(r) {
    var type = r.request_type || r.type || "menu_change";
    var id = String(r.request_id != null ? r.request_id : r.id);
    return {
      id: id, created_at: r.created_at || "", restaurant_id: String(r.restaurant_id != null ? r.restaurant_id : ""),
      kam_id: r.kam_id || "", type: type, channel: r.channel || "whatsapp",
      done_at: r.done_at || "", minutes: num(r.minutes_to_done),
      message: r.message || pick(MSG[type] || MSG.menu_change, id)
    };
  }
  function requests() {
    return Promise.all([once("req", function () { return tryLoad(["kam_requests"]).then(function (l) { return l.map(normReq); }); }), now()]).then(function (res) {
      var base = res[0];
      var made = saved("req_new", []);
      var done = saved("req_done", {});
      var all = made.concat(base).map(function (r) {
        if (done[r.id]) { return Object.assign({}, r, { done_at: done[r.id], minutes: null, doneHere: true }); }
        return r;
      });
      all.sort(function (a, b) { return a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0; });
      return all.slice(0, 400);
    });
  }
  function payoutIndex() {
    return once("pay", function () {
      return tryLoad(["payouts"]).then(function (list) {
        var idx = {};
        list.forEach(function (p) {
          var id = String(p.restaurant_id);
          (idx[id] = idx[id] || []).push({
            week_start: p.week_start || p.period_start || "", week_end: p.week_end || p.period_end || "",
            orders: num(p.orders_count), gross: num(p.gross_sales_tk != null ? p.gross_sales_tk : p.gross_amount),
            pct: num(p.commission_pct_applied), commission: num(p.commission_tk != null ? p.commission_tk : p.commission),
            deductions: num(p.deductions_tk != null ? p.deductions_tk : p.deductions),
            payout: num(p.payout_tk != null ? p.payout_tk : p.net_amount),
            paid_on: p.paid_on || "", days: num(p.working_days_to_pay != null ? p.working_days_to_pay : p.settlement_days),
            method: p.payout_method || ""
          });
        });
        Object.keys(idx).forEach(function (k) { idx[k].sort(function (a, b) { return a.week_start < b.week_start ? 1 : -1; }); });
        return idx;
      });
    });
  }
  function ticketsFor(id) {
    return once("tix", function () { return tryLoad(["tickets"]); }).then(function (list) {
      return list.filter(function (t) { return t.restaurant_id != null && String(t.restaurant_id) === String(id); })
        .sort(function (a, b) { return String(a.created_at) < String(b.created_at) ? 1 : -1; });
    });
  }
  function menuStatusFor(id) {
    return once("mis", function () { return tryLoad(["menu_item_status"]); }).then(function (list) {
      return list.filter(function (m) { return String(m.restaurant_id) === String(id); })
        .sort(function (a, b) { return String(a.requested_at) < String(b.requested_at) ? 1 : -1; });
    });
  }
  function menuCount(id) {
    return once("mitems", function () { return tryLoad(["menu_items"]); }).then(function (list) {
      var n = list.filter(function (m) { return String(m.restaurant_id) === String(id); }).length;
      return n || (hash("m" + id) % 40 + 24);
    });
  }

  var FIRST = ["Rahim", "Karim", "Salma", "Nasrin", "Jamal", "Farhana", "Imran", "Shahidul", "Mitu", "Rubel", "Tania", "Habib", "Sumon", "Rima"];
  var LAST = ["Uddin", "Hossain", "Akter", "Chowdhury", "Islam", "Khan", "Begum", "Ahmed", "Rahman", "Sarker"];
  function person(seed) { return pick(FIRST, seed + "f") + " " + pick(LAST, seed + "l"); }
  function phone(seed) {
    var pre = ["017", "018", "019", "016", "015"][hash(seed + "p") % 5];
    var n = String(10000000 + (hash(seed + "n") % 89999999));
    return pre + n;
  }
  function contactsFor(r) {
    return [
      { role: "Owner", name: person(r.id + "o"), phone: phone(r.id + "o"), email: "owner" + hash(r.id) % 900 + "@mail.example" },
      { role: "Manager", name: person(r.id + "m"), phone: phone(r.id + "m"), email: "" },
      { role: "Kitchen (orders phone)", name: "Counter", phone: phone(r.id + "k"), email: "" }
    ];
  }
  function defaultNotes(r) {
    if (r.c_contract != null && r.c_system != null && r.c_contract !== r.c_system) {
      return "Home kitchen drive, Nov. Promised " + r.c_contract + "% commission for first 6 months, said on call with owner. Rate is in the Google Sheet 'Home kitchens Nov'. Check before month end.";
    }
    var opts = [
      "",
      "Owner prefers calls after 4 pm.",
      "Standard terms. Signed at the shop, paper copy with the menu team.",
      "Two outlets, only this one is on the app. Asked about the second outlet.",
      "Contract: standard. Payout to bKash merchant number on the form."
    ];
    return pick(opts, "n" + r.id);
  }

  var flashMsg = null;
  function flash(msg, isErr) { flashMsg = { msg: msg, err: !!isErr }; }
  function flashEl() {
    if (!flashMsg) { return null; }
    var f = el("div", { "class": "kam-flash" + (flashMsg.err ? " is-err" : ""), "data-testid": "kam-flash" }, [ic(flashMsg.err ? "alert" : "check"), flashMsg.msg]);
    flashMsg = null;
    return f;
  }
  function btn(label, onclick, opts) {
    opts = opts || {};
    var kids = [];
    if (opts.icon) { kids.push(ic(opts.icon)); }
    kids.push(label);
    return el("button", {
      type: "button", "class": "kam-b" + (opts.primary ? " is-primary" : "") + (opts.sm ? " is-sm" : ""),
      onclick: onclick, disabled: opts.disabled ? "disabled" : null, "data-testid": opts.tid || null
    }, kids);
  }
  function link(label, onclick) { return el("button", { type: "button", "class": "kam-link", onclick: onclick }, label); }
  function note(msg, warn) { return el("div", { "class": "kam-note" + (warn ? " is-warn" : "") }, [ic(warn ? "alert" : "info"), el("div", { text: msg })]); }
  function pill(status) {
    return el("span", { "class": "fd-pill", dataset: { status: STATUS_PILL[status] || "placed" }, text: STATUS_LABEL[status] || cap(status) });
  }
  function table(heads, body, opts) {
    var t = el("table", { "class": "fd-table fd-table-dense" }, [
      el("thead", null, el("tr", null, heads.map(function (h) { return el("th", { text: h }); }))),
      el("tbody", null, body)
    ]);
    return el("div", { "class": "kam-tw", "data-testid": (opts && opts.tid) || null }, t);
  }
  function td(content, cls) { return el("td", { "class": cls || null }, content); }
  function pager(total, page, onPage) {
    var pages = Math.max(1, Math.ceil(total / PAGE));
    return el("div", { "class": "kam-pager" }, [
      btn("Prev", function () { onPage(page - 1); }, { icon: "chevL", sm: true, disabled: page <= 1 }),
      el("span", { text: "Page " + page + " of " + pages + " (" + D.groupBd(total) + " rows)" }),
      btn("Next", function () { onPage(page + 1); }, { icon: "chevR", sm: true, disabled: page >= pages })
    ]);
  }
  function field(label, input, hint, top) {
    var out = [el("label", { "class": top ? "is-top" : null, text: label }), input];
    if (hint) { out.push(el("div", { "class": "kam-hint", text: hint })); }
    return out;
  }
  function go(h) { if (location.hash === h) { render(); } else { location.hash = h; } }

  var NAV = [
    { key: "restaurants", label: "Restaurants", icon: "store", hash: "#/restaurants" },
    { key: "onboarding", label: "Onboarding", icon: "list", hash: "#/onboarding" },
    { key: "requests", label: "Requests inbox", icon: "inbox", hash: "#/requests" },
    { key: "discounts", label: "Discount form", icon: "percent", hash: "#/discounts" },
    { key: "payouts", label: "Payouts", icon: "wallet", hash: "#/payouts" }
  ];
  var main, navEl, topMeta;

  function shell() {
    root.innerHTML = "";
    navEl = el("nav", { "class": "kam-nav", "data-testid": "kam-nav" }, NAV.map(function (n) {
      return el("a", { dataset: { nav: n.key }, "data-testid": "kam-nav-" + n.key, onclick: function () { go(n.hash); } }, [ic(n.icon), n.label]);
    }));
    topMeta = el("span", { "class": "kam-top-meta" });
    main = el("main", { "class": "kam-main", "data-testid": "kam-main" });
    root.appendChild(el("header", { "class": "kam-top" }, [
      el("span", { "class": "kam-brand" }, [ic("store"), "KAM CRM"]),
      el("span", { "class": "kam-top-meta", text: "Restaurant side" }),
      el("span", { "class": "kam-top-sp" }),
      topMeta,
      el("span", { "class": "kam-top-meta", text: "Signed in: Ayesha (KAM executive)" })
    ]));
    root.appendChild(el("div", { "class": "kam-body" }, [navEl, main]));
    now().then(function (n) { topMeta.textContent = D.fmtDateTime(n); });
  }

  function setActive(key) {
    Array.prototype.forEach.call(navEl.querySelectorAll("a"), function (a) {
      a.classList.toggle("is-active", a.dataset.nav === key);
    });
  }

  function render() {
    var parts = location.hash.replace(/^#\/?/, "").split("?")[0].split("/");
    var screen = parts[0] || "restaurants";
    var arg = parts[1] ? decodeURIComponent(parts[1]) : null;
    main.innerHTML = "";
    main.scrollTop = 0;
    var navKey = { restaurant: "restaurants", onboard: "onboarding" }[screen] || screen;
    setActive(navKey);
    var fn = { restaurants: screenList, restaurant: screenDetail, onboarding: screenOnboarding, onboard: screenOnboard,
      "self-signup": screenSelf, requests: screenRequests, discounts: screenDiscounts, payouts: screenPayouts }[screen] || screenList;
    var f = flashEl();
    if (f) { main.appendChild(f); }
    fn(arg);
  }

  var listState = { q: "", status: "all", area: "all", kam: "all", page: 1, applied: "" };

  function screenList() {
    main.appendChild(el("h1", { "class": "kam-h1", text: "Restaurants" }));
    var stats = el("div", { "class": "kam-stats" });
    var holder = el("div");
    main.appendChild(stats);
    var bar = el("div", { "class": "kam-bar" });
    main.appendChild(bar);
    main.appendChild(holder);

    restaurants().then(function (all) {
      var count = { live: 0, in_queue: 0, left: 0, withdrawn: 0 };
      all.forEach(function (r) { count[r.status] = (count[r.status] || 0) + 1; });
      stats.appendChild(el("span", null, [el("b", { text: D.groupBd(count.live) }), " live"]));
      stats.appendChild(el("span", null, [el("b", { text: D.groupBd(count.in_queue) }), " in queue"]));
      stats.appendChild(el("span", null, [el("b", { text: D.groupBd(count.left) }), " left"]));
      stats.appendChild(el("span", null, [el("b", { text: D.groupBd(count.withdrawn) }), " withdrawn"]));

      var areas = {}, kams = {};
      all.forEach(function (r) { if (r.area) { areas[r.area] = 1; } if (r.kam_id) { kams[r.kam_id] = 1; } });
      var q = el("input", { "class": "kam-in", style: { width: "240px" }, placeholder: "Restaurant name", value: listState.q, "data-testid": "kam-search" });
      function sel(key, label, opts) {
        var s = el("select", { "class": "kam-in", "data-testid": "kam-filter-" + key, onchange: function () { listState[key] = s.value; listState.page = 1; draw(); } },
          [el("option", { value: "all", text: label })].concat(opts.map(function (o) { return el("option", { value: o[0], text: o[1] }); })));
        s.value = listState[key];
        return s;
      }
      function doSearch() {
        if (!q.value.trim()) { flash("Type a restaurant name first.", true); render(); return; }
        listState.q = q.value; listState.applied = q.value.trim().toLowerCase(); listState.page = 1; draw(); }
      q.addEventListener("keydown", function (e) { if (e.key === "Enter") { doSearch(); } });
      bar.appendChild(q);
      bar.appendChild(btn("Search", doSearch, { icon: "search", tid: "kam-search-btn" }));
      bar.appendChild(btn("Clear", function () { listState = { q: "", status: "all", area: "all", kam: "all", page: 1, applied: "" }; render(); }, { tid: "kam-search-clear" }));
      bar.appendChild(el("span", { "class": "kam-bar-sp" }));
      bar.appendChild(sel("status", "All statuses", [["live", "Live"], ["in_queue", "In queue"], ["left", "Left"], ["withdrawn", "Withdrawn"]]));
      bar.appendChild(sel("area", "All areas", Object.keys(areas).sort().map(function (a) { return [a, a]; })));
      bar.appendChild(sel("kam", "All KAMs", Object.keys(kams).sort().map(function (a) { return [a, a]; })));

      function draw() {
        holder.innerHTML = "";
        var list = all.filter(function (r) {
          if (listState.applied && r.name.toLowerCase() !== listState.applied) { return false; }
          if (listState.status !== "all" && r.status !== listState.status) { return false; }
          if (listState.area !== "all" && r.area !== listState.area) { return false; }
          if (listState.kam !== "all" && r.kam_id !== listState.kam) { return false; }
          return true;
        });
        list.sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
        if (!list.length) {
          holder.appendChild(el("div", { "class": "kam-tw" }, el("div", { "class": "kam-empty", "data-testid": "kam-list-empty", text: listState.applied ? "No restaurant found." : "No restaurants." })));
          return;
        }
        var slice = list.slice((listState.page - 1) * PAGE, listState.page * PAGE);
        holder.appendChild(table(["Name", "Area", "Cuisine", "Type", "Status", "KAM", "Commission", "Signed on"], slice.map(function (r) {
          return el("tr", { "class": "is-click", "data-testid": "kam-row", onclick: function () { go("#/restaurant/" + encodeURIComponent(r.id)); } }, [
            td(el("b", { text: r.name })), td(r.area), td(cap(r.cuisine)), td(cap(r.type)), td(pill(r.status)), td(r.kam_id),
            td((saved("commission", {})[r.id] != null ? saved("commission", {})[r.id] : (r.c_system != null ? r.c_system : 20)) + "%", "kam-mono"),
            td(D.fmtDate(r.signed_on))
          ]);
        }), { tid: "kam-list" }));
        holder.appendChild(pager(list.length, listState.page, function (p) { listState.page = p; draw(); }));
      }
      draw();
    });
  }

  function screenDetail(id) {
    restaurants().then(function (all) {
      var r = restMap(all)[id];
      if (!r) {
        main.appendChild(el("div", { "class": "kam-crumb" }, link("Back to restaurants", function () { go("#/restaurants"); })));
        main.appendChild(note("Restaurant not found."));
        return;
      }
      var commissions = saved("commission", {});
      var notes = saved("notes", {});
      var commissionVal = commissions[r.id] != null ? commissions[r.id] : (r.c_system != null ? r.c_system : 20);
      var notesVal = notes[r.id] != null ? notes[r.id] : defaultNotes(r);

      main.appendChild(el("div", { "class": "kam-crumb" }, [link("Restaurants", function () { go("#/restaurants"); }), " / " + r.name]));
      main.appendChild(el("div", { "class": "kam-bar" }, [
        el("h1", { "class": "kam-h1", style: { margin: 0 }, text: r.name, "data-testid": "kam-detail-name" }),
        pill(r.status),
        el("span", { "class": "kam-bar-sp" }),
        btn("New discount", function () { save("prefill", r.id); go("#/discounts"); }, { icon: "percent", tid: "kam-detail-discount" }),
        btn("View payouts", function () { go("#/payouts/" + encodeURIComponent(r.id)); }, { icon: "wallet", tid: "kam-detail-payouts" })
      ]));

      var left = el("div");
      var right = el("div");

      left.appendChild(el("div", { "class": "kam-box" }, [
        el("div", { "class": "kam-h2", text: "Profile" }),
        el("dl", { "class": "kam-kv" }, [
          el("dt", { text: "Restaurant id" }), el("dd", { text: r.id }),
          el("dt", { text: "Type" }), el("dd", { text: cap(r.type) }),
          el("dt", { text: "Cuisine" }), el("dd", { text: cap(r.cuisine) }),
          el("dt", { text: "Area" }), el("dd", { text: r.area }),
          el("dt", { text: "KAM" }), el("dd", { text: r.kam_id || "Not assigned" }),
          el("dt", { text: "Signed on" }), el("dd", { text: D.fmtDate(r.signed_on) }),
          el("dt", { text: "Live on" }), el("dd", { text: r.live_on ? D.fmtDate(r.live_on) : "Not live yet" }),
          el("dt", { text: "Onboarded by" }), el("dd", { text: r.onboarded_by === "self_signup_beta" ? "Self sign-up (beta)" : r.onboarded_by ? "KAM menu team" : "" }),
          el("dt", { text: "Packaging" }), el("dd", { text: r.packaging ? cap(r.packaging) : "" }),
          r.exit_reason ? el("dt", { text: "Left because" }) : null, r.exit_reason ? el("dd", { text: r.exit_reason }) : null
        ])
      ]));

      left.appendChild(el("div", { "class": "kam-box" }, [
        el("div", { "class": "kam-h2", text: "Contacts" }),
        el("div", { "class": "kam-tw", style: { border: "none" } }, el("table", { "class": "fd-table fd-table-dense", "data-testid": "kam-contacts" }, [
          el("thead", null, el("tr", null, ["Role", "Name", "Phone", "Email"].map(function (h) { return el("th", { text: h }); }))),
          el("tbody", null, contactsFor(r).map(function (c) { return el("tr", null, [td(c.role), td(c.name), td(c.phone, "kam-mono"), td(c.email)]); }))
        ]))
      ]));

      var comm = el("input", { "class": "kam-in", type: "number", value: commissionVal, style: { width: "70px" }, "data-testid": "kam-commission" });
      var nt = el("textarea", { "class": "kam-in", rows: 5, "data-testid": "kam-notes" });
      nt.value = notesVal;
      right.appendChild(el("div", { "class": "kam-box" }, [
        el("div", { "class": "kam-h2", text: "Contract and commission" }),
        el("div", { "class": "kam-bar", style: { marginBottom: "10px" } }, [
          el("label", { style: { fontWeight: 600 }, text: "Commission %" }), comm,
          btn("Save", function () {
            var v = num(comm.value);
            if (v === null || v < 0 || v > 100) { comm.classList.add("is-err"); return; }
            var c = saved("commission", {}); c[r.id] = v; save("commission", c);
            flash("Commission saved: " + v + "%"); render();
          }, { primary: true, tid: "kam-commission-save" })
        ]),
        el("div", { "class": "kam-hint", style: { marginBottom: "10px" }, text: "Default for new restaurants is 22." }),
        el("label", { style: { fontWeight: 600, display: "block", marginBottom: "4px" }, text: "Notes" }),
        nt,
        el("div", { style: { marginTop: "8px" } }, btn("Save notes", function () {
          var n = saved("notes", {}); n[r.id] = nt.value; save("notes", n);
          flash("Notes saved"); render();
        }, { tid: "kam-notes-save" }))
      ]));

      var menuBox = el("div", { "class": "kam-box" }, [el("div", { "class": "kam-h2", text: "Menu status" })]);
      right.appendChild(menuBox);
      var items = saved("menu", {})[r.id] || [];
      var soldLocal = saved("soldout", []).filter(function (s) { return s.restaurant_id === r.id; });
      if (r.status === "live") {
        Promise.all([menuCount(r.id), menuStatusFor(r.id)]).then(function (res) {
          var changes = res[1];
          var latest = {};
          changes.slice().reverse().forEach(function (c) { latest[c.item_name] = c.change; });
          soldLocal.forEach(function (s) { latest[s.item] = "mark_unavailable"; });
          var sold = Object.keys(latest).filter(function (k) { return latest[k] === "mark_unavailable"; }).length;
          menuBox.appendChild(el("dl", { "class": "kam-kv" }, [
            el("dt", { text: "Menu" }), el("dd", { text: "Live, " + res[0] + " items" }),
            el("dt", { text: "Sold out now" }), el("dd", { text: sold + (sold === 1 ? " item" : " items") }),
            el("dt", { text: "Last change" }), el("dd", { text: changes.length ? D.fmtDateTime(changes[0].requested_at) : "No change in the log" })
          ]));
          if (changes.length) {
            menuBox.appendChild(el("div", { style: { height: "8px" } }));
            menuBox.appendChild(el("div", { "class": "kam-tw", style: { border: "none" } }, el("table", { "class": "fd-table fd-table-dense", "data-testid": "kam-menu-changes" }, [
              el("thead", null, el("tr", null, ["Item", "Change", "Asked", "Applied after"].map(function (h) { return el("th", { text: h }); }))),
              el("tbody", null, changes.slice(0, 5).map(function (c) {
                return el("tr", null, [td(c.item_name), td(cap(c.change)), td(D.fmtDateTime(c.requested_at)), td(fmtMin(c.minutes_to_apply))]);
              }))
            ])));
          }
        });
      } else if (r.status === "in_queue") {
        menuBox.appendChild(el("dl", { "class": "kam-kv" }, [
          el("dt", { text: "Menu" }), el("dd", { text: "Waiting for the menu team. " + items.length + " items entered so far." })
        ]));
        menuBox.appendChild(el("div", { style: { marginTop: "8px" } }, btn("Open onboarding", function () { go("#/onboard/" + encodeURIComponent(r.id)); }, { tid: "kam-open-onboarding" })));
      } else {
        menuBox.appendChild(el("dl", { "class": "kam-kv" }, [el("dt", { text: "Menu" }), el("dd", { text: "Switched off" })]));
      }

      main.appendChild(el("div", { "class": "kam-grid2" }, [left, right]));

      var below = el("div", { style: { marginTop: "12px" } });
      main.appendChild(below);
      ticketsFor(r.id).then(function (t) {
        var box = el("div", { "class": "kam-box" }, [el("div", { "class": "kam-h2", text: "Support tickets" })]);
        if (!t.length) {
          box.appendChild(el("div", { "class": "kam-hint", text: "No tickets linked to this restaurant.", "data-testid": "kam-no-tickets" }));
        } else {
          box.appendChild(el("div", { "class": "kam-tw", style: { border: "none" } }, el("table", { "class": "fd-table fd-table-dense", "data-testid": "kam-tickets" }, [
            el("thead", null, el("tr", null, ["Ticket", "Date", "Category", "Refund", "Paid by"].map(function (h) { return el("th", { text: h }); }))),
            el("tbody", null, t.slice(0, 8).map(function (x) {
              return el("tr", null, [td(String(x.ticket_id || x.id || "")), td(D.fmtDate(x.created_at)), td(cap(x.category)), td(x.refund_tk != null && x.refund_tk !== "" ? D.formatTk(x.refund_tk) : ""), td(cap(x.refund_paid_by))]);
            }))
          ])));
        }
        below.appendChild(box);
      });
      requests().then(function (reqs) {
        var mine = reqs.filter(function (q) { return q.restaurant_id === r.id; }).slice(0, 6);
        var box = el("div", { "class": "kam-box" }, [el("div", { "class": "kam-h2", text: "Recent requests" })]);
        if (!mine.length) {
          box.appendChild(el("div", { "class": "kam-hint", text: "No requests from this restaurant." }));
        } else {
          box.appendChild(el("div", { "class": "kam-tw", style: { border: "none" } }, el("table", { "class": "fd-table fd-table-dense" }, [
            el("thead", null, el("tr", null, ["Received", "Type", "Message", "Status"].map(function (h) { return el("th", { text: h }); }))),
            el("tbody", null, mine.map(function (q) {
              return el("tr", null, [td(D.fmtDateTime(q.created_at)), td(cap(q.type)), td(q.message, "is-wrap"), td(q.done_at ? "Done" : "Open")]);
            }))
          ])));
        }
        below.appendChild(box);
      });
    });
  }

  function screenOnboarding() {
    main.appendChild(el("h1", { "class": "kam-h1", text: "Onboarding" }));
    main.appendChild(el("p", { "class": "kam-sub", text: "Restaurants that signed and are not live yet. Check documents, then add the menu, then send live." }));
    restaurants().then(function (all) {
      var queue = all.filter(function (r) { return r.status === "in_queue"; });
      queue.sort(function (a, b) { return (b.days || 0) - (a.days || 0); });
      var docs = saved("docs", {});
      var menus = saved("menu", {});
      main.appendChild(el("div", { "class": "kam-stats" }, [el("span", null, [el("b", { text: String(queue.length) }), " restaurants waiting"])]));
      if (!queue.length) { main.appendChild(el("div", { "class": "kam-tw" }, el("div", { "class": "kam-empty", text: "Nobody is waiting." }))); return; }
      var page = 1;
      var holder = el("div");
      main.appendChild(holder);
      (function draw() {
        holder.innerHTML = "";
        var slice = queue.slice((page - 1) * PAGE, page * PAGE);
        holder.appendChild(table(["Name", "Area", "Signed on", "Days waiting", "Documents", "Menu items entered", "KAM", ""], slice.map(function (r) {
          var d = docs[r.id] || {};
          var days = r.days != null ? r.days : (r.signed_on && r.signed_on.length ? Math.max(0, Math.round((D.diffSeconds(r.signed_on, "2027-03-29") || 0) / 86400)) : "");
          return el("tr", { "data-testid": "kam-queue-row" }, [
            td(el("b", { text: r.name })), td(r.area), td(D.fmtDate(r.signed_on)), td(String(days), "kam-mono"),
            td(d.ok ? el("span", { "class": "kam-badge-ok", text: "Checked" }) : "Not checked"),
            td(String((menus[r.id] || []).length), "kam-mono"), td(r.kam_id),
            td(btn("Open", function () { go("#/onboard/" + encodeURIComponent(r.id)); }, { sm: true, tid: "kam-queue-open" }))
          ]);
        }), { tid: "kam-queue" }));
        holder.appendChild(pager(queue.length, page, function (p) { page = p; draw(); }));
      })();
    });
  }

  function screenOnboard(id) {
    restaurants().then(function (all) {
      var r = restMap(all)[id];
      if (!r) { main.appendChild(note("Restaurant not found.")); return; }
      var docs = saved("docs", {});
      var d = docs[r.id] || { licence: false, nid: false, bank: false, photo: false, ok: false };
      var items = (saved("menu", {})[r.id] || []).slice();
      main.appendChild(el("div", { "class": "kam-crumb" }, [link("Onboarding", function () { go("#/onboarding"); }), " / " + r.name]));
      main.appendChild(el("div", { "class": "kam-bar" }, [
        el("h1", { "class": "kam-h1", style: { margin: 0 }, text: r.name, "data-testid": "kam-onboard-name" }), pill(r.status),
        el("span", { "class": "kam-top-meta", text: r.area })
      ]));
      var live = r.status === "live";
      main.appendChild(el("div", { "class": "kam-steps" }, [
        el("div", { "class": "kam-step " + (d.ok ? "is-done" : "is-on"), text: "1. Document check" + (d.ok ? " (done)" : "") }),
        el("div", { "class": "kam-step " + (items.length ? "is-done" : (d.ok ? "is-on" : "")), text: "2. Menu items (" + items.length + ")" }),
        el("div", { "class": "kam-step " + (live ? "is-done" : ""), text: "3. Go live" + (live ? " (done)" : "") })
      ]));

      (function stepDates() {
        function days(a, b) { return Math.round((D.diffSeconds(a, b) || 0) / 86400); }
        var rows = [["Signed", r.signed_on ? D.fmtDate(r.signed_on) : "", ""]];
        rows.push(["Documents checked", r.docs_done_on ? D.fmtDate(r.docs_done_on) : "Waiting",
                   r.docs_done_on ? days(r.signed_on, r.docs_done_on) + " days" : ""]);
        rows.push(["Menu entered by the menu team", r.menu_done_on ? D.fmtDate(r.menu_done_on) : "Waiting",
                   r.menu_done_on ? days(r.docs_done_on, r.menu_done_on) + " days" : ""]);
        rows.push(["Test order and live", r.live_on ? D.fmtDate(r.live_on) : "Waiting",
                   r.live_on && r.menu_done_on ? days(r.menu_done_on, r.live_on) + " days" : ""]);
        var box = el("div", { "class": "kam-box", "data-testid": "kam-step-dates" }, [el("div", { "class": "kam-h2", text: "Steps with dates" })]);
        box.appendChild(table(["Step", "Date", "Days"], rows.map(function (x) {
          return el("tr", null, [td(x[0]), td(x[1]), td(x[2], "kam-mono")]);
        })));
        main.appendChild(box);
      })();

      var checks = {};
      var boxDocs = el("div", { "class": "kam-box" }, [el("div", { "class": "kam-h2", text: "Document check" })]);
      [["licence", "Trade licence copy"], ["nid", "Owner NID copy"], ["bank", "Bank or bKash merchant details"], ["photo", "Photo of the printed menu"]].forEach(function (k) {
        var c = el("input", { type: "checkbox", id: "doc-" + k[0], "data-testid": "kam-doc-" + k[0] });
        c.checked = !!d[k[0]];
        checks[k[0]] = c;
        boxDocs.appendChild(el("label", { "class": "kam-check", "for": "doc-" + k[0] }, [c, k[1]]));
      });
      boxDocs.appendChild(el("div", { style: { marginTop: "8px" } }, btn(d.ok ? "Documents marked OK" : "Mark documents OK", function () {
        var next = { ok: true };
        var all4 = true;
        Object.keys(checks).forEach(function (k) { next[k] = checks[k].checked; if (!checks[k].checked) { all4 = false; } });
        if (!all4) { flash("Tick all four documents first.", true); render(); return; }
        var m = saved("docs", {}); m[r.id] = next; save("docs", m);
        flash("Documents marked OK"); render();
      }, { primary: !d.ok, tid: "kam-docs-ok" })));
      main.appendChild(boxDocs);

      var boxMenu = el("div", { "class": "kam-box" }, [el("div", { "class": "kam-h2", text: "Menu items" })]);
      var nm = el("input", { "class": "kam-in", style: { width: "240px" }, placeholder: "Item name (English)", "data-testid": "kam-item-name" });
      var pr = el("input", { "class": "kam-in", type: "number", style: { width: "90px" }, placeholder: "Price Tk", "data-testid": "kam-item-price" });
      var ct = el("select", { "class": "kam-in", "data-testid": "kam-item-cat" }, CATS.map(function (c) { return el("option", { value: c, text: c }); }));
      var err = el("span", { "class": "kam-badge-err" });
      function addItem() {
        var name = nm.value.trim(); var price = num(pr.value);
        if (!name || price === null || price <= 0) { err.textContent = "Enter a name and a price."; return; }
        var m = saved("menu", {}); m[r.id] = (m[r.id] || []).concat([{ name: name, price: price, category: ct.value }]); save("menu", m);
        render();
      }
      nm.addEventListener("keydown", function (e) { if (e.key === "Enter") { addItem(); } });
      boxMenu.appendChild(el("div", { "class": "kam-bar" }, [nm, pr, ct, btn("Add item", addItem, { icon: "plus", primary: true, tid: "kam-item-add" }), err]));
      boxMenu.appendChild(el("div", { "class": "kam-hint", style: { marginBottom: "8px" }, text: "Add items one at a time. Each item takes a name, a price and a category." }));
      if (CSV_IMPORT_ENABLED) {
        boxMenu.appendChild(el("div", { style: { marginBottom: "10px" } }, btn("Import from CSV", function () { openWizard(r); }, { icon: "upload", tid: "kam-import-csv" })));
      }
      if (items.length) {
        boxMenu.appendChild(el("div", { "class": "kam-tw" }, el("table", { "class": "fd-table fd-table-dense", "data-testid": "kam-items" }, [
          el("thead", null, el("tr", null, ["#", "Item", "Price", "Category", ""].map(function (h) { return el("th", { text: h }); }))),
          el("tbody", null, items.map(function (it, i) {
            return el("tr", null, [td(String(i + 1)), td(it.name), td(D.formatTk(it.price), "kam-mono"), td(it.category), td(btn("Remove", function () {
              var m = saved("menu", {}); m[r.id] = (m[r.id] || []).filter(function (x, j) { return j !== i; }); save("menu", m); render();
            }, { sm: true, icon: "trash" }))]);
          }))
        ])));
      } else {
        boxMenu.appendChild(el("div", { "class": "kam-hint", text: "No items yet." }));
      }
      main.appendChild(boxMenu);

      var boxLive = el("div", { "class": "kam-box" }, [el("div", { "class": "kam-h2", text: "Go live" })]);
      if (live) {
        boxLive.appendChild(el("div", { "class": "kam-badge-ok", text: "This restaurant is live." }));
      } else {
        boxLive.appendChild(btn("Send live", function () {
          if (!d.ok) { flash("Check the documents first.", true); render(); return; }
          if (!items.length) { flash("Add at least one menu item first.", true); render(); return; }
          var n = D.loadData("meta").then(function (m) { return m.now; }, function () { return "2027-03-29 13:10:00"; });
          n.then(function (t) {
            var l = saved("live", {}); l[r.id] = t; save("live", l);
            flash(r.name + " is live"); go("#/restaurant/" + encodeURIComponent(r.id));
          });
        }, { primary: true, tid: "kam-send-live" }));
      }
      main.appendChild(boxLive);
    });
  }

  var SAMPLE_CSV = [
    "Item,Price (BDT),Section,Notes",
    "Chicken Tehari,220,Biryani,Boneless",
    "Beef Tehari,260,Biryani,",
    "Kacchi Biryani (Mutton),380,Kacchi,Half plate available",
    "Chicken Roast,Tk 150,Sides,",
    "Borhani,40,Drinks,250 ml",
    "Chicken Burger,190,Burger,",
    ",120,Burger,name missing",
    "Beef Burger,240,Burger,",
    "Fuchka (6 pcs),60,Street food,",
    "Chicken Chowmein,210,Chinese,",
    "Chicken Tehari,220,Biryani,duplicate row",
    "Firni,70,Dessert,"
  ].join("\n");
  var TARGETS = [["name", "Item name", true], ["price", "Price (Tk)", true], ["category", "Category", false], ["description", "Description", false]];

  function parseCsv(text) {
    text = String(text).replace(/^﻿/, "");
    var out = [], row = [], cur = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text.charAt(i);
      if (q) {
        if (c === '"') { if (text.charAt(i + 1) === '"') { cur += '"'; i++; } else { q = false; } } else { cur += c; }
      } else if (c === '"') { q = true; }
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text.charAt(i + 1) === "\n") { i++; }
        row.push(cur); cur = "";
        if (row.length > 1 || row[0] !== "") { out.push(row); }
        row = [];
      } else { cur += c; }
    }
    if (cur !== "" || row.length) { row.push(cur); out.push(row); }
    return out;
  }
  function guessMap(headers) {
    var rx = { name: /item|name|dish|product/i, price: /price|tk|bdt|amount|cost/i, category: /categ|section|group|type/i, description: /desc|note|detail|ingredient/i };
    var map = headers.map(function () { return ""; });
    ["name", "price", "category", "description"].forEach(function (f) {
      for (var i = 0; i < headers.length; i++) { if (!map[i] && rx[f].test(headers[i]) && map.indexOf(f) === -1) { map[i] = f; break; } }
    });
    return map;
  }
  function reviewRows(w) {
    var idx = {};
    w.map.forEach(function (f, i) { if (f) { idx[f] = i; } });
    var seen = {};
    return w.data.map(function (row, n) {
      var name = String(row[idx.name] == null ? "" : row[idx.name]).trim();
      var raw = String(row[idx.price] == null ? "" : row[idx.price]).trim();
      var cat = idx.category != null ? String(row[idx.category] || "").trim() : "";
      var out = { n: n + 2, name: name, price: null, priceRaw: raw, category: cat, status: "ok", msg: "OK" };
      if (!name) { out.status = "error"; out.msg = "Item name is empty"; }
      else if (!/^\d+(\.\d+)?$/.test(raw.replace(/,/g, ""))) { out.status = "error"; out.msg = "Price is not a number"; }
      else if (seen[name.toLowerCase()]) { out.status = "error"; out.msg = "Duplicate of row " + seen[name.toLowerCase()]; }
      else {
        out.price = parseFloat(raw.replace(/,/g, ""));
        seen[name.toLowerCase()] = n + 2;
        var hit = CATS.filter(function (c) { return c.toLowerCase() === cat.toLowerCase(); })[0];
        if (hit) { out.category = hit; } else { out.status = "warn"; out.msg = "Category set to Other"; out.category = "Other"; }
      }
      return out;
    });
  }

  function openWizard(r) {
    var w = { step: 1, fileName: "", headers: [], data: [], map: [], err: "", result: null };
    var ov = el("div", { "class": "kam-ov", "data-testid": "kam-wizard" });
    document.body.appendChild(ov);
    function close() { if (ov.parentNode) { ov.parentNode.removeChild(ov); } }
    function stepList() {
      return el("div", { "class": "kam-wz-side" }, [el("h3", { text: "Import menu" })].concat(["Choose file", "Map columns", "Review", "Done"].map(function (s, i) {
        var cls = "kam-wz-st" + (w.step === i + 1 ? " is-on" : w.step > i + 1 ? " is-done" : "");
        return el("div", { "class": cls }, [el("i", null, w.step > i + 1 ? ic("check") : String(i + 1)), s]);
      })));
    }
    function loadText(name, text) {
      var all = parseCsv(text);
      if (all.length < 2) { w.err = "The file has no data rows."; draw(); return; }
      w.fileName = name; w.headers = all[0].map(function (h) { return String(h).trim(); }); w.data = all.slice(1);
      w.map = guessMap(w.headers); w.err = ""; w.step = 2; draw();
    }
    function draw() {
      ov.innerHTML = "";
      var body = el("div", { "class": "kam-wz-body" });
      var foot = el("div", { "class": "kam-wz-foot" });
      var title = ["Choose file", "Map columns", "Review", "Done"][w.step - 1];
      if (w.step === 1) {
        var fi = el("input", { type: "file", accept: ".csv,text/csv", "data-testid": "kam-csv-file", onchange: function () {
          var f = fi.files && fi.files[0];
          if (!f) { return; }
          var rd = new FileReader();
          rd.onload = function () { loadText(f.name, String(rd.result)); };
          rd.readAsText(f);
        } });
        body.appendChild(el("p", { text: "Upload a CSV file with one menu item on each row. The first row must be the column names." }));
        body.appendChild(el("div", { "class": "kam-drop" }, [el("div", { style: { marginBottom: "10px" } }, fi), el("div", { "class": "kam-hint", text: "Only .csv files. Photos cannot be imported." })]));
        body.appendChild(el("div", { "class": "kam-bar", style: { marginTop: "14px" } }, [
          btn("Use sample file", function () { loadText("sample_menu.csv", SAMPLE_CSV); }, { tid: "kam-csv-sample" }),
          btn("Download template", function () {
            var blob = new Blob(["Item,Price,Category,Description\n"], { type: "text/csv" });
            var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "menu_template.csv";
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
          }, { icon: "download", tid: "kam-csv-template" })
        ]));
        if (w.err) { body.appendChild(el("div", { "class": "kam-badge-err", style: { marginTop: "10px" }, text: w.err })); }
        foot.appendChild(el("span", { "class": "kam-bar-sp" }));
        foot.appendChild(btn("Cancel", close, { tid: "kam-wz-cancel" }));
      } else if (w.step === 2) {
        var matched = w.map.filter(Boolean).length;
        body.appendChild(note("File " + w.fileName + ": " + w.data.length + " rows, " + w.headers.length + " columns. Matched " + matched + " of " + w.headers.length + " columns. Check each one."));
        var sels = [];
        var tb = el("tbody");
        w.headers.forEach(function (h, i) {
          var s = el("select", { "class": "kam-in", "data-testid": "kam-map-" + i }, [el("option", { value: "", text: "Do not import" })].concat(TARGETS.map(function (t) { return el("option", { value: t[0], text: t[1] }); })));
          s.value = w.map[i] || "";
          s.addEventListener("change", function () {
            if (s.value) { w.map = w.map.map(function (f, j) { return j !== i && f === s.value ? "" : f; }); }
            w.map[i] = s.value; w.err = ""; draw();
          });
          sels.push(s);
          tb.appendChild(el("tr", null, [td(el("b", { text: h })), td(String((w.data[0] || [])[i] || ""), "is-wrap"), td(ic("arrowR")), td(s)]));
        });
        body.appendChild(el("div", { "class": "kam-tw" }, el("table", { "class": "fd-table fd-table-dense" }, [
          el("thead", null, el("tr", null, ["CSV column", "Example value", "", "Goes into"].map(function (x) { return el("th", { text: x }); }))), tb
        ])));
        if (w.err) { body.appendChild(el("div", { "class": "kam-badge-err", style: { marginTop: "10px" }, text: w.err, "data-testid": "kam-map-err" })); }
        foot.appendChild(btn("Back", function () { w.step = 1; w.err = ""; draw(); }, { icon: "chevL", tid: "kam-wz-back" }));
        foot.appendChild(btn("Clear mappings", function () { w.map = w.headers.map(function () { return ""; }); draw(); }, { tid: "kam-wz-clear" }));
        foot.appendChild(el("span", { "class": "kam-bar-sp" }));
        foot.appendChild(btn("Next", function () {
          if (w.map.indexOf("name") === -1 || w.map.indexOf("price") === -1) { w.err = "Map one column to Item name and one to Price."; draw(); return; }
          w.step = 3; w.err = ""; draw();
        }, { primary: true, tid: "kam-wz-next" }));
      } else if (w.step === 3) {
        var rv = reviewRows(w);
        var errs = rv.filter(function (x) { return x.status === "error"; }).length;
        var good = rv.length - errs;
        body.appendChild(el("div", { "class": "kam-stats" }, [
          el("span", null, [el("b", { text: String(rv.length) }), " rows"]),
          el("span", null, [el("b", { text: String(good) }), " can be imported"]),
          el("span", { "class": errs ? "kam-badge-err" : null }, [el("b", { text: String(errs) }), " with errors"])
        ]));
        body.appendChild(el("div", { "class": "kam-tw" }, el("table", { "class": "fd-table fd-table-dense", "data-testid": "kam-review" }, [
          el("thead", null, el("tr", null, ["Row", "Item name", "Price", "Category", "Check"].map(function (x) { return el("th", { text: x }); }))),
          el("tbody", null, rv.slice(0, 200).map(function (x) {
            return el("tr", null, [td(String(x.n)), td(x.name), td(x.priceRaw, "kam-mono"), td(x.category), td(el("span", { "class": x.status === "ok" ? "kam-badge-ok" : x.status === "warn" ? "kam-badge-warn" : "kam-badge-err", text: x.msg }))]);
          }))
        ])));
        foot.appendChild(btn("Back", function () { w.step = 2; draw(); }, { icon: "chevL", tid: "kam-wz-back" }));
        foot.appendChild(el("span", { "class": "kam-hint", text: errs ? "Rows with errors are skipped." : "" }));
        foot.appendChild(el("span", { "class": "kam-bar-sp" }));
        foot.appendChild(btn("Import " + good + " items", function () {
          var add = rv.filter(function (x) { return x.status !== "error"; }).map(function (x) { return { name: x.name, price: x.price, category: x.category || "Other" }; });
          var m = saved("menu", {}); m[r.id] = (m[r.id] || []).concat(add); save("menu", m);
          w.result = { added: add.length, skipped: errs }; w.step = 4; draw();
        }, { primary: true, disabled: good === 0, tid: "kam-wz-import" }));
      } else {
        body.appendChild(el("p", { "data-testid": "kam-wz-done" }, [el("b", { text: w.result.added + " items imported" }), ". " + w.result.skipped + " rows skipped because of errors."]));
        body.appendChild(el("p", { "class": "kam-hint", text: "Items have no photos and no Bangla names. Add those later in the menu editor." }));
        foot.appendChild(el("span", { "class": "kam-bar-sp" }));
        foot.appendChild(btn("Close", function () { close(); render(); }, { primary: true, tid: "kam-wz-close" }));
      }
      ov.appendChild(el("div", { "class": "kam-modal" }, [
        stepList(),
        el("div", { "class": "kam-wz-main" }, [
          el("div", { "class": "kam-wz-head" }, [title, el("button", { type: "button", "class": "kam-b is-sm", "aria-label": "Close", onclick: function () { close(); if (w.step === 4) { render(); } }, "data-testid": "kam-wz-x" }, ic("x"))]),
          body, foot
        ])
      ]));
    }
    draw();
  }

  var SELF_ROWS = [
    { id: "T1", name: "Test Kitchen One", contact: "QA team", phone: "01700000001", submitted: "2027-03-18", docs: { licence: true, bank: true } },
    { id: "T2", name: "Demo Biryani House (test)", contact: "QA team", phone: "01700000002", submitted: "2027-03-21", docs: { licence: true, bank: false } },
    { id: "T3", name: "QA Restaurant 3", contact: "QA team", phone: "01700000003", submitted: "2027-03-24", docs: { licence: false, bank: false } }
  ];
  function screenSelf() {
    main.appendChild(el("h1", { "class": "kam-h1", text: "Self sign-up queue (beta)" }));
    main.appendChild(el("p", { "class": "kam-sub", text: "Restaurants upload their licence and bank documents themselves. Menu entry stays with the KAM menu team." }));
    main.appendChild(note("Beta. Only test rows for now. Real restaurants are not sent here yet."));
    var st = saved("self", {});
    main.appendChild(table(["Name", "Contact", "Phone", "Submitted", "Trade licence", "Bank details", "Status", ""], SELF_ROWS.map(function (s) {
      var status = st[s.id] || "Test";
      return el("tr", { "data-testid": "kam-self-row" }, [
        td(el("b", { text: s.name })), td(s.contact), td(s.phone, "kam-mono"), td(D.fmtDate(s.submitted)),
        td(s.docs.licence ? "Uploaded" : "Missing"), td(s.docs.bank ? "Uploaded" : "Missing"),
        td(el("span", { "class": "kam-chip", text: status })),
        td(btn("Review", function () { openSelf(s); }, { sm: true, tid: "kam-self-review" }))
      ]);
    }), { tid: "kam-self" }));
  }
  function openSelf(s) {
    var st = saved("self", {});
    var ov = el("div", { "class": "kam-ov" });
    document.body.appendChild(ov);
    var shown = {};
    function close() { if (ov.parentNode) { ov.parentNode.removeChild(ov); } }
    function setStatus(v, msg, then) { st = saved("self", {}); st[s.id] = v; save("self", st); close(); flash(msg); if (then) { then(); } else { render(); } }
    function draw() {
      ov.innerHTML = "";
      var box = el("div", { "class": "kam-modal is-small", "data-testid": "kam-self-modal" }, [
        el("h3", { style: { margin: "0 0 4px" }, text: s.name }),
        el("p", { "class": "kam-sub", text: "Submitted " + D.fmtDate(s.submitted) + ". Status: " + (saved("self", {})[s.id] || "Test") })
      ]);
      [["licence", "Trade licence", "trade_licence.pdf, 2 pages"], ["bank", "Bank details", "bank_statement_page1.jpg"]].forEach(function (d) {
        var ok = s.docs[d[0]];
        box.appendChild(el("div", { "class": "kam-bar" }, [
          el("b", { text: d[1] }), el("span", { text: ok ? "Uploaded" : "Missing" }), el("span", { "class": "kam-bar-sp" }),
          ok ? btn(shown[d[0]] ? "Hide file" : "View file", function () { shown[d[0]] = !shown[d[0]]; draw(); }, { sm: true }) : null
        ]));
        if (ok && shown[d[0]]) { box.appendChild(el("div", { "class": "kam-hint", style: { marginBottom: "8px" }, text: "File: " + d[2] + ". Preview is not built in the beta." })); }
      });
      box.appendChild(el("div", { "class": "kam-bar", style: { marginTop: "14px" } }, [
        btn("Approve documents", function () { setStatus("Docs approved", "Documents approved for " + s.name); }, { primary: true, disabled: !(s.docs.licence && s.docs.bank), tid: "kam-self-approve" }),
        btn("Move to onboarding queue", function () {
          var extra = saved("extra_rest", []);
          if (!extra.some(function (x) { return x.id === s.id; })) {
            extra.push({ id: s.id, name: s.name, area: "Test", cuisine: "other", type: "restaurant", signed_on: s.submitted, live_on: "", status: "in_queue", left_on: "", withdrawn_on: "", exit_reason: "", c_contract: null, c_system: null, packaging: "", kam_id: "", onboarded_by: "self_signup_beta", days: 0, extra: true });
            save("extra_rest", extra);
          }
          setStatus("In onboarding queue", s.name + " moved to the onboarding queue", function () { go("#/onboarding"); });
        }, { tid: "kam-self-move" }),
        btn("Reject", function () { setStatus("Rejected", s.name + " rejected"); }, { tid: "kam-self-reject" }),
        el("span", { "class": "kam-bar-sp" }),
        btn("Close", close, { tid: "kam-self-close" })
      ]));
      ov.appendChild(box);
    }
    draw();
  }

  var reqState = { filter: "all", type: "all", kam: "all", page: 1 };
  var REQ_TYPES = ["discount_new", "discount_change", "discount_stop", "menu_change", "item_unavailable", "payout_query", "commission_query", "onboarding"];

  function screenRequests() {
    main.appendChild(el("h1", { "class": "kam-h1", text: "Requests inbox" }));
    main.appendChild(el("p", { "class": "kam-sub", text: "Requests from restaurants. Handle each one and mark it done." }));
    Promise.all([requests(), restaurants()]).then(function (res) {
      var reqs = res[0], rmap = restMap(res[1]);
      var kams = {}; reqs.forEach(function (q) { if (q.kam_id) { kams[q.kam_id] = 1; } });
      var openCount = reqs.filter(function (q) { return !q.done_at; }).length;
      main.appendChild(el("div", { "class": "kam-stats" }, [el("span", null, [el("b", { text: String(openCount) }), " open"]), el("span", null, ["showing the latest " + reqs.length])]));

      var rs = el("select", { "class": "kam-in", style: { width: "220px" }, "data-testid": "kam-req-rest" }, [el("option", { value: "", text: "Restaurant" })].concat(res[1].filter(function (r) { return r.status === "live"; }).sort(function (a, b) { return a.name < b.name ? -1 : 1; }).slice(0, 1200).map(function (r) { return el("option", { value: r.id, text: r.name }); })));
      var ts = el("select", { "class": "kam-in", "data-testid": "kam-req-type" }, REQ_TYPES.map(function (t) { return el("option", { value: t, text: cap(t) }); }));
      var ch = el("select", { "class": "kam-in", "data-testid": "kam-req-channel" }, ["whatsapp", "phone", "email"].map(function (t) { return el("option", { value: t, text: cap(t) }); }));
      var msg = el("input", { "class": "kam-in", style: { width: "300px" }, placeholder: "Paste the message here", "data-testid": "kam-req-msg" });
      var err = el("span", { "class": "kam-badge-err" });
      main.appendChild(el("div", { "class": "kam-box" }, [
        el("div", { "class": "kam-h2", text: "Add a message" }),
        el("div", { "class": "kam-bar", style: { margin: 0 } }, [rs, ts, ch, msg, btn("Add to inbox", function () {
          if (!rs.value || !msg.value.trim()) { err.textContent = "Pick a restaurant and paste the message."; return; }
          now().then(function (t) {
            var made = saved("req_new", []);
            made.unshift({ id: "N" + (made.length + 1), created_at: t, restaurant_id: rs.value, kam_id: "KAM-ME", type: ts.value, channel: ch.value, done_at: "", minutes: null, message: msg.value.trim() });
            save("req_new", made); reqState = { filter: "all", type: "all", kam: "all", page: 1 }; flash("Message added to the inbox"); render();
          });
        }, { primary: true, icon: "plus", tid: "kam-req-add" }), err])
      ]));

      var bar = el("div", { "class": "kam-bar" });
      var holder = el("div");
      main.appendChild(bar); main.appendChild(holder);
      function sel(key, label, opts) {
        var s = el("select", { "class": "kam-in", "data-testid": "kam-req-filter-" + key, onchange: function () { reqState[key] = s.value; reqState.page = 1; draw(); } },
          opts.map(function (o) { return el("option", { value: o[0], text: o[1] }); }));
        s.value = reqState[key];
        return s;
      }
      bar.appendChild(sel("filter", "", [["all", "All requests"], ["open", "Open only"], ["done", "Done only"]]));
      bar.appendChild(sel("type", "", [["all", "All types"]].concat(REQ_TYPES.map(function (t) { return [t, cap(t)]; }))));
      bar.appendChild(sel("kam", "", [["all", "All KAMs"]].concat(Object.keys(kams).sort().map(function (k) { return [k, k]; }))));
      function draw() {
        holder.innerHTML = "";
        var list = reqs.filter(function (q) {
          if (reqState.filter === "open" && q.done_at) { return false; }
          if (reqState.filter === "done" && !q.done_at) { return false; }
          if (reqState.type !== "all" && q.type !== reqState.type) { return false; }
          if (reqState.kam !== "all" && q.kam_id !== reqState.kam) { return false; }
          return true;
        });
        if (!list.length) { holder.appendChild(el("div", { "class": "kam-tw" }, el("div", { "class": "kam-empty", text: "No requests match." }))); return; }
        var slice = list.slice((reqState.page - 1) * PAGE, reqState.page * PAGE);
        holder.appendChild(table(["Received", "Restaurant", "Type", "Channel", "Message", "KAM", "Status", ""], slice.map(function (q) {
          var r = rmap[q.restaurant_id];
          return el("tr", { "data-testid": "kam-req-row" }, [
            td(D.fmtDateTime(q.created_at)), td(r ? link(r.name, function () { go("#/restaurant/" + encodeURIComponent(r.id)); }) : q.restaurant_id),
            td(cap(q.type)), td(cap(q.channel)), td(q.message, "is-wrap"), td(q.kam_id),
            td(q.done_at ? el("span", { "class": "kam-badge-ok", text: "Done" + (q.minutes != null ? " in " + fmtMin(q.minutes) : "") }) : el("span", { "class": "kam-badge-warn", text: "Open" })),
            td(q.done_at ? "" : btn("Handle", function () { openRequest(q, r); }, { sm: true, tid: "kam-req-handle" }))
          ]);
        }), { tid: "kam-reqs" }));
        holder.appendChild(pager(list.length, reqState.page, function (p) { reqState.page = p; draw(); }));
      }
      draw();
    });
  }
  function markDone(q, text) {
    now().then(function (t) {
      var d = saved("req_done", {}); d[q.id] = t; save("req_done", d);
      if (q.id.charAt(0) === "N") {
        var made = saved("req_new", []).map(function (m) { return m.id === q.id ? Object.assign({}, m, { done_at: t }) : m; });
        save("req_new", made);
      }
      flash(text || "Marked done"); render();
    });
  }
  function openRequest(q, r) {
    var ov = el("div", { "class": "kam-ov" });
    document.body.appendChild(ov);
    function close() { if (ov.parentNode) { ov.parentNode.removeChild(ov); } }
    var box = el("div", { "class": "kam-modal is-small", "data-testid": "kam-req-modal" }, [
      el("h3", { style: { margin: "0 0 4px" }, text: cap(q.type) }),
      el("p", { "class": "kam-sub", text: (r ? r.name : q.restaurant_id) + ", " + cap(q.channel) + ", " + D.fmtDateTime(q.created_at) }),
      el("div", { "class": "kam-box", style: { marginBottom: "10px" }, text: "“" + q.message + "”" })
    ]);
    var actions = el("div", { "class": "kam-bar" });
    if (q.type === "item_unavailable") {
      var guess = q.message.split(/[ ,]/).slice(0, 2).join(" ");
      var item = el("input", { "class": "kam-in", style: { width: "220px" }, value: guess, "data-testid": "kam-soldout-item" });
      box.appendChild(el("div", { "class": "kam-bar" }, [el("label", { style: { fontWeight: 600 }, text: "Item to mark sold out" }), item]));
      actions.appendChild(btn("Mark sold out and done", function () {
        if (!item.value.trim()) { item.classList.add("is-err"); return; }
        var s = saved("soldout", []); s.push({ restaurant_id: q.restaurant_id, item: item.value.trim() }); save("soldout", s);
        close(); markDone(q, "Marked sold out: " + item.value.trim());
      }, { primary: true, tid: "kam-soldout-apply" }));
    } else if (q.type.indexOf("discount") === 0) {
      actions.appendChild(btn("Open discount form", function () { save("prefill", q.restaurant_id); save("prefill_req", q.id); close(); go("#/discounts"); }, { primary: true, tid: "kam-req-discount" }));
    }
    actions.appendChild(btn("Mark done", function () { close(); markDone(q); }, { tid: "kam-req-done" }));
    actions.appendChild(el("span", { "class": "kam-bar-sp" }));
    actions.appendChild(btn("Close", close, { tid: "kam-req-close" }));
    box.appendChild(actions);
    ov.appendChild(box);
  }

  function screenDiscounts() {
    main.appendChild(el("h1", { "class": "kam-h1", text: "Discount form" }));
    main.appendChild(el("p", { "class": "kam-sub", text: "Type the discount details here." }));
    restaurants().then(function (all) {
      var live = all.filter(function (r) { return r.status === "live"; }).sort(function (a, b) { return a.name < b.name ? -1 : 1; });
      var pre = saved("prefill", "");
      var rs = el("select", { "class": "kam-in is-w100", "data-testid": "kam-disc-rest" }, [el("option", { value: "", text: "Select restaurant" })].concat(live.map(function (r) { return el("option", { value: r.id, text: r.name + " (" + r.area + ")" }); })));
      if (pre) { rs.value = pre; save("prefill", ""); }
      var pc = el("input", { "class": "kam-in", style: { width: "90px" }, placeholder: "e.g. 15", "data-testid": "kam-disc-pct" });
      var st = el("input", { "class": "kam-in is-w100", placeholder: "e.g. 2 April or Friday", "data-testid": "kam-disc-start" });
      var en = el("input", { "class": "kam-in is-w100", placeholder: "e.g. 9 April or till Eid", "data-testid": "kam-disc-end" });
      var fb = el("select", { "class": "kam-in", "data-testid": "kam-disc-fund" }, [["shared", "Shared 50/50 with the app"], ["restaurant", "Restaurant"], ["app", "App"]].map(function (o) { return el("option", { value: o[0], text: o[1] }); }));
      var nt = el("textarea", { "class": "kam-in", rows: 3, placeholder: "Anything the restaurant said", "data-testid": "kam-disc-notes" });
      var err = el("div", { "class": "kam-badge-err", "data-testid": "kam-disc-err" });
      main.appendChild(el("div", { "class": "kam-box" }, [
        el("div", { "class": "kam-form" }, [].concat(
          field("Restaurant", rs),
          field("Percent off", pc),
          field("Start", st, "Type it any way you like."),
          field("End", en, "Leave empty for no end."),
          field("Funded by", fb),
          field("Notes", nt, null, true)
        )),
        el("div", { style: { margin: "12px 0 0 162px", display: "flex", gap: "10px", alignItems: "center" } }, [btn("Save discount", function () {
          var p = parseFloat(pc.value);
          if (!rs.value) { err.textContent = "Select a restaurant."; return; }
          if (isNaN(p) || p < 1 || p > 100) { err.textContent = "Percent must be a number from 1 to 100."; return; }
          now().then(function (t) {
            var list = saved("discounts", []);
            list.unshift({ at: t, restaurant_id: rs.value, restaurant: restMap(all)[rs.value].name, pct: p, start: st.value.trim(), end: en.value.trim(), fund: fb.value, notes: nt.value.trim() });
            save("discounts", list);
            var reqId = saved("prefill_req", "");
            if (reqId) { save("prefill_req", ""); markDone({ id: reqId }, "Discount saved and request marked done"); return; }
            flash("Discount saved for " + restMap(all)[rs.value].name); render();
          });
        }, { primary: true, tid: "kam-disc-save" }), err])
      ]));

      var names = live.slice(0, 5).map(function (r) { return r.name; });
      var seed = [
        { at: "2027-03-27 11:20:00", restaurant: names[0] || "", pct: 15, start: "28 mar", end: "3 april", fund: "shared", seed: true },
        { at: "2027-03-26 16:02:00", restaurant: names[1] || "", pct: 20, start: "friday", end: "", fund: "shared", seed: true },
        { at: "2027-03-25 12:45:00", restaurant: names[2] || "", pct: 10, start: "from tomorrow", end: "till eid", fund: "restaurant", seed: true },
        { at: "2027-03-24 10:10:00", restaurant: names[3] || "", pct: 25, start: "24/3", end: "30/3", fund: "app", seed: true },
        { at: "2027-03-22 15:31:00", restaurant: names[4] || "", pct: 15, start: "next week", end: "10 days", fund: "shared", seed: true }
      ].filter(function (x) { return x.restaurant; });
      var entries = saved("discounts", []).concat(seed);
      main.appendChild(el("div", { "class": "kam-h2", style: { marginTop: "6px" }, text: "Entered discounts" }));
      main.appendChild(table(["Entered", "Restaurant", "Percent", "Start", "End", "Funded by"], entries.map(function (x) {
        return el("tr", { "data-testid": "kam-disc-row" }, [td(D.fmtDateTime(x.at)), td(x.restaurant), td(x.pct + "%", "kam-mono"), td(x.start || ""), td(x.end || ""), td(x.fund === "shared" ? "Shared 50/50" : cap(x.fund))]);
      }), { tid: "kam-disc-list" }));
    });
  }

  function screenPayouts(arg) {
    main.appendChild(el("h1", { "class": "kam-h1", text: "Payouts" }));
    main.appendChild(el("p", { "class": "kam-sub", text: "Weekly statements. Read only." }));
    Promise.all([restaurants(), payoutIndex()]).then(function (res) {
      var all = res[0].filter(function (r) { return r.status !== "in_queue"; }).sort(function (a, b) { return a.name < b.name ? -1 : 1; });
      var idx = res[1];
      var withRows = all.filter(function (r) { return idx[r.id]; });
      var pool = withRows.length ? withRows : all;
      var cur = arg && pool.filter(function (r) { return r.id === arg; })[0] ? arg : (pool[0] ? pool[0].id : "");
      var holder = el("div");
      var rs = el("select", { "class": "kam-in", style: { width: "300px" }, "data-testid": "kam-pay-rest", onchange: function () { cur = rs.value; draw(); } },
        pool.slice(0, 1500).map(function (r) { return el("option", { value: r.id, text: r.name + " (" + r.area + ")" }); }));
      rs.value = cur;
      main.appendChild(el("div", { "class": "kam-bar" }, [el("label", { style: { fontWeight: 600 }, text: "Restaurant" }), rs]));
      main.appendChild(holder);
      function draw() {
        holder.innerHTML = "";
        var list = (idx[cur] || []).slice(0, 26);
        if (!list.length) { holder.appendChild(el("div", { "class": "kam-tw" }, el("div", { "class": "kam-empty", "data-testid": "kam-pay-empty", text: "No statements for this restaurant." }))); return; }
        holder.appendChild(table(["Week", "Orders", "Sales", "Commission", "Commission Tk", "Deductions", "Payout", "Paid on", "Method"], list.map(function (p) {
          return el("tr", { "data-testid": "kam-pay-row" }, [
            td(D.fmtDate(p.week_start) + " to " + D.fmtDate(p.week_end)), td(p.orders != null ? String(p.orders) : "", "kam-mono"),
            td(p.gross != null ? D.formatTk(p.gross) : "", "kam-mono"), td(p.pct != null ? p.pct + "%" : "", "kam-mono"),
            td(p.commission != null ? D.formatTk(p.commission) : "", "kam-mono"), td(p.deductions != null ? D.formatTk(p.deductions) : "", "kam-mono"),
            td(p.payout != null ? D.formatTk(p.payout) : "", "kam-mono"), td(p.paid_on ? D.fmtDate(p.paid_on) : ""), td(cap(p.method))
          ]);
        }), { tid: "kam-pay" }));
      }
      draw();
    });
  }

  shell();
  window.addEventListener("hashchange", render);
  if (!location.hash) { location.hash = "#/restaurants"; } else { render(); }
})();

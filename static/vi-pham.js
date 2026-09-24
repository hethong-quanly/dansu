(function (root) {
  var FB = {
    apiKey: "AIzaSyDunRDIeyBTVXTODoO22ywk1Q35cCx2sV8",
    authDomain: "dansu-vksndtpct.firebaseapp.com",
    databaseURL: "https://dansu-vksndtpct-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "dansu-vksndtpct",
    storageBucket: "dansu-vksndtpct.firebasestorage.app",
    appId: "1:843158256686:web:eb128d64c8b9bfd7aef3bf"
  };
  var MEASURES = [
    { id: "kien_nghi", label: "Kiến nghị" },
    { id: "khang_nghi", label: "Kháng nghị" },
    { id: "rut_kinh_nghiem", label: "Thông báo rút kinh nghiệm" },
    { id: "khac", label: "Biện pháp khác" }
  ];
  var refreshers = {};
  var listeners = [];
  var bag = null;
  var ready = false;

  function db() {
    if (!root.firebase) return null;
    if (!firebase.apps.length) firebase.initializeApp(FB);
    return firebase.database();
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({
        "&": "&" + "amp;",
        "<": "&" + "lt;",
        ">": "&" + "gt;",
        '"': "&" + "quot;",
        "'": "&" + "#39;"
      })[c];
    });
  }

  function today() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function fmt(iso) {
    if (!iso || String(iso).length < 10) return "—";
    var p = String(iso).slice(0, 10).split("-");
    return p[2] + "/" + p[1] + "/" + p[0];
  }

  function profile() {
    return root.VksRbac ? VksRbac.parseProfile() : {};
  }

  function canSee(item) {
    if (!item) return false;
    var u = profile();
    var mod = item.source === "khieuto" ? "khieuto" : item.source === "thads" ? "thads" : "dansu";
    if (root.VksRbac && !VksRbac.canAccessModule(u, mod)) return false;
    if (root.VksRbac) return VksRbac.canSeeRecord(u, item);
    return true;
  }

  function canDelete(item) {
    var u = profile();
    if (!root.VksRbac) return true;
    if (VksRbac.isLeader(u) || VksRbac.isAdmin(u)) return true;
    return String(item.createdBy || "").toLowerCase() === String(u.username || "").toLowerCase();
  }

  function measureLabel(id) {
    for (var i = 0; i < MEASURES.length; i++) if (MEASURES[i].id === id) return MEASURES[i].label;
    return id || "—";
  }

  function measureText(n) {
    var label = measureLabel(n.measure);
    return n.measureDetail ? label + ": " + n.measureDetail : label;
  }

  function isExperience(n) {
    return n.measure === "rut_kinh_nghiem" || !!(n.experienceText && String(n.experienceText).trim());
  }

  function ensureListen() {
    var database = db();
    if (!database || bag) return;
    bag = {};
    database.ref("phat_hien_vi_pham").on("value", function (snap) {
      bag = snap.val() || {};
      ready = true;
      Object.keys(refreshers).forEach(function (k) {
        try { refreshers[k](); } catch (e) {}
      });
      listeners.forEach(function (fn) {
        try { fn(bag); } catch (e) {}
      });
    });
  }

  function rowsOf(source) {
    ensureListen();
    var out = [];
    Object.keys(bag || {}).forEach(function (key) {
      var n = bag[key];
      if (!n) return;
      if (source && n.source !== source) return;
      n._key = key;
      if (!canSee(n)) return;
      out.push(n);
    });
    out.sort(function (a, b) {
      return String(b.date || "").localeCompare(String(a.date || "")) || String(b.timestamp || 0) - String(a.timestamp || 0);
    });
    return out;
  }

  function mount(el, opts) {
    if (!el || el.getAttribute("data-ready") === "1") {
      if (opts && opts.source) refresh(opts.source);
      return;
    }
    opts = opts || {};
    var source = opts.source || "dansu";
    el.setAttribute("data-ready", "1");
    el.innerHTML =
      '<div class="vp-card">' +
      '<h3>Phát hiện vi phạm</h3>' +
      '<p class="vp-hint">Ghi cơ quan vi phạm, nội dung vi phạm và biện pháp tác động của Viện kiểm sát. Thông báo rút kinh nghiệm nhập cùng phát hiện để đưa vào ô tổng hợp trên menu chính.</p>' +
      '<div class="vp-grid">' +
      '<label class="vp-full">Hồ sơ<select data-host></select></label>' +
      '<label>Cơ quan vi phạm<input data-agency placeholder="Tòa án, cơ quan thi hành án, đơn vị khác"></label>' +
      '<label>Ngày phát hiện<input data-date type="date"></label>' +
      '<label class="vp-full">Nội dung vi phạm<textarea data-content rows="3"></textarea></label>' +
      '<label>Biện pháp tác động của VKS<select data-measure>' +
      MEASURES.map(function (m) { return '<option value="' + m.id + '">' + m.label + "</option>"; }).join("") +
      "</select></label>" +
      '<label>Nội dung biện pháp<input data-detail placeholder="Số, ngày, yêu cầu kiến nghị hoặc kháng nghị"></label>' +
      '<label class="vp-full">Thông báo rút kinh nghiệm<textarea data-exp rows="2" placeholder="Nội dung thông báo rút kinh nghiệm, nếu có"></textarea></label>' +
      "</div>" +
      '<button type="button" class="vp-save" data-add>Lưu phát hiện vi phạm</button>' +
      '<p class="vp-msg" data-msg></p>' +
      '<div class="vp-table-wrap"><table><thead><tr>' +
      "<th>Hồ sơ</th><th>Cơ quan vi phạm</th><th>Nội dung vi phạm</th><th>Biện pháp tác động</th><th>Thông báo rút kinh nghiệm</th><th></th>" +
      "</tr></thead><tbody data-body></tbody></table></div></div>";
    var dateEl = el.querySelector("[data-date]");
    if (dateEl) dateEl.value = today();

    function hosts() {
      try { return (opts.hosts && opts.hosts()) || []; } catch (e) { return []; }
    }

    function paint() {
      var sel = el.querySelector("[data-host]");
      var cur = sel.value;
      var list = hosts();
      sel.innerHTML = list.length
        ? list.map(function (h) { return '<option value="' + esc(h.id) + '">' + esc(h.title) + "</option>"; }).join("")
        : '<option value="">Chưa có hồ sơ</option>';
      if (cur && list.some(function (h) { return String(h.id) === cur; })) sel.value = cur;
      var notes = rowsOf(source);
      var body = el.querySelector("[data-body]");
      if (!notes.length) {
        body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#667">Chưa có phát hiện vi phạm.</td></tr>';
        return;
      }
      body.innerHTML = notes.map(function (n) {
        var del = canDelete(n) ? '<button type="button" class="vp-del" data-del="' + esc(n._key) + '">Xóa</button>' : "";
        return "<tr><td><b>" + esc(n.hostTitle || "—") + "</b><br><small>" + esc(n.hostSub || "") + " · " + fmt(n.date) + "</small></td>" +
          "<td>" + esc(n.agency || "—") + "</td><td>" + esc(n.content || "—") + "</td><td>" + esc(measureText(n)) + "</td>" +
          "<td>" + esc(n.experienceText || "—") + "</td><td>" + del + "</td></tr>";
      }).join("");
    }

    refreshers[source] = paint;
    ensureListen();
    paint();

    el.querySelector("[data-add]").onclick = function () {
      var msg = el.querySelector("[data-msg]");
      var list = hosts();
      var hostId = el.querySelector("[data-host]").value;
      var host = null;
      for (var i = 0; i < list.length; i++) if (String(list[i].id) === String(hostId)) host = list[i];
      var agency = el.querySelector("[data-agency]").value.trim();
      var content = el.querySelector("[data-content]").value.trim();
      if (!host) { msg.textContent = "Chọn hồ sơ để ghi vi phạm."; return; }
      if (!agency || !content) { msg.textContent = "Nhập cơ quan vi phạm và nội dung vi phạm."; return; }
      var note = {
        source: source,
        sourceLabel: opts.sourceLabel || source,
        hostId: String(host.id),
        hostTitle: host.title || "",
        hostSub: host.sub || "",
        agency: agency,
        content: content,
        measure: el.querySelector("[data-measure]").value,
        measureDetail: el.querySelector("[data-detail]").value.trim(),
        experienceText: el.querySelector("[data-exp]").value.trim(),
        date: el.querySelector("[data-date]").value || today(),
        timestamp: Date.now()
      };
      if (root.VksRbac) VksRbac.stampMeta(note, profile());
      var database = db();
      if (!database) { msg.textContent = "Chưa kết nối được máy chủ dữ liệu."; return; }
      database.ref("phat_hien_vi_pham").push(note).then(function () {
        el.querySelector("[data-agency]").value = "";
        el.querySelector("[data-content]").value = "";
        el.querySelector("[data-detail]").value = "";
        el.querySelector("[data-exp]").value = "";
        msg.textContent = "Đã ghi phát hiện vi phạm.";
      }).catch(function (err) {
        msg.textContent = "Không lưu được: " + (err && err.message ? err.message : err);
      });
    };

    el.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest("[data-del]");
      if (!btn) return;
      if (!confirm("Xóa phát hiện vi phạm này?")) return;
      db().ref("phat_hien_vi_pham/" + btn.getAttribute("data-del")).remove();
    });
  }

  function refresh(source) {
    if (refreshers[source]) refreshers[source]();
  }

  function onAll(cb) {
    listeners.push(cb);
    ensureListen();
    if (ready) cb(bag);
  }

  if (!document.getElementById("vp-style")) {
    var style = document.createElement("style");
    style.id = "vp-style";
    style.textContent =
      ".vp-card{background:#fff;border:1px solid #d5deee;border-radius:12px;padding:18px;color:#122033}" +
      ".vp-card h3{margin:0 0 6px;color:#0c3b8c;font-size:18px}" +
      ".vp-hint{margin:0 0 12px;font-size:13px;color:#5c6b80;line-height:1.45}" +
      ".vp-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}" +
      ".vp-grid label{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:700;color:#3a332c}" +
      ".vp-full{grid-column:1/-1}" +
      ".vp-grid input,.vp-grid select,.vp-grid textarea{font:inherit;font-weight:500;padding:8px;border:1px solid #7eb3e6;border-radius:6px;width:100%;box-sizing:border-box}" +
      ".vp-save{margin-top:12px;background:#0c3b8c;color:#fff;border:0;border-radius:8px;padding:12px 16px;font-weight:800;cursor:pointer}" +
      ".vp-msg{min-height:18px;font-size:13px;color:#0c3b8c;margin:8px 0}" +
      ".vp-table-wrap{overflow:auto;margin-top:8px}" +
      ".vp-card table{width:100%;border-collapse:collapse;font-size:13px}" +
      ".vp-card th,.vp-card td{border:1px solid #d5deee;padding:8px;text-align:left;vertical-align:top}" +
      ".vp-card th{background:#071a4a;color:#ffe566}" +
      ".vp-del{background:#8a1c2b;color:#fff;border:0;border-radius:6px;padding:4px 8px;cursor:pointer}" +
      "@media(max-width:720px){.vp-grid{grid-template-columns:1fr}}";
    document.head.appendChild(style);
  }

  root.VksViPham = {
    mount: mount,
    refresh: refresh,
    rowsOf: rowsOf,
    onAll: onAll,
    measureText: measureText,
    measureLabel: measureLabel,
    isExperience: isExperience,
    fmt: fmt,
    esc: esc,
    canSee: canSee
  };
})(window);

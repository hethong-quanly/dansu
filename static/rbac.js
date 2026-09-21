(function (root) {
  function parseProfile() {
    var user = {};
    var raw = null;
    try { raw = localStorage.getItem("vks_user"); } catch (e) {}
    if (!raw) return user;
    try {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") user = parsed;
      else user = { username: String(parsed) };
    } catch (e) {
      user = { username: raw };
    }
    if (!user.username) user.username = typeof raw === "string" ? raw : user.username;
    try {
      var profile = JSON.parse(localStorage.getItem("vks_user_profile") || "null");
      if (profile && typeof profile === "object") user = Object.assign({}, profile, user);
    } catch (e) {}
    try {
      var db = JSON.parse(localStorage.getItem("vks_users_db") || "{}");
      if (user.username && db[user.username]) user = Object.assign({ username: user.username }, db[user.username], user);
    } catch (e) {}
    return user;
  }

  function norm(s) {
    return String(s || "").toLowerCase().normalize("NFC");
  }

  function isAdmin(u) {
    return !!(u && u.username === "admin");
  }

  function isNational(u) {
    return isAdmin(u) || !!(u && u.level === "toi_cao");
  }

  function pos(u) {
    return norm(u && (u.position || u.rank));
  }

  function isKsv(u) {
    var p = pos(u);
    return p.indexOf("kiểm sát viên") >= 0 || p.indexOf("kiem sat vien") >= 0 || p === "kiem_sat_vien";
  }

  function isTruongPhong(u) {
    var p = pos(u);
    return p.indexOf("trưởng phòng") >= 0 || p.indexOf("truong phong") >= 0;
  }

  function isLeader(u) {
    var p = pos(u);
    if (!p) return false;
    return p.indexOf("viện trưởng") >= 0 || p.indexOf("vien truong") >= 0 ||
      p.indexOf("cục trưởng") >= 0 || p.indexOf("cuc truong") >= 0 ||
      p.indexOf("chánh văn phòng") >= 0 || p.indexOf("chanh van phong") >= 0 ||
      p.indexOf("chánh thanh") >= 0 || p.indexOf("chanh thanh") >= 0 ||
      p.indexOf("trưởng phòng") >= 0 || p.indexOf("truong phong") >= 0;
  }

  function isUnitWide(u) {
    if (isNational(u)) return true;
    if (isTruongPhong(u)) return false;
    var p = pos(u);
    return isLeader(u) || p.indexOf("cán bộ phụ trách") >= 0 || p.indexOf("can bo phu trach") >= 0;
  }

  function canManageAccounts(u) {
    return isAdmin(u) || isLeader(u);
  }

  function deptOf(u) {
    return (u && (u.department || u.phong || u.departmentId)) || "";
  }

  function isVtOrPvt(u) {
    var p = pos(u);
    if (!p) return false;
    if (p.indexOf("phó viện") >= 0 || p.indexOf("pho vien") >= 0 || p === "pho_vien_truong") return true;
    if (p.indexOf("viện trưởng") >= 0 || p.indexOf("vien truong") >= 0 || p === "vien_truong") return true;
    return false;
  }

  function isFullModuleAccess(u) {
    return isAdmin(u) || isVtOrPvt(u);
  }

  function moduleOfDept(dept) {
    var d = norm(dept);
    if (!d) return "all";
    if (/(vụ|vu)[\s_]*10\b/.test(d) || /(phòng|phong)[\s_]*10\b/.test(d)) return "dansu";
    if (/(vụ|vu)[\s_]*11\b/.test(d) || /(phòng|phong)[\s_]*11\b/.test(d)) return "thads";
    if (/(vụ|vu)[\s_]*12\b/.test(d) || d.indexOf("thanh tra") >= 0 || d.indexOf("khiếu tố") >= 0 || d.indexOf("khieu to") >= 0) return "khieuto";
    if (/(vụ|vu)[\s_]*9\b/.test(d) || /(phòng|phong)[\s_]*9\b/.test(d)) return "dansu";
    return "all";
  }

  function canAccessModule(u, mod) {
    if (!u || !u.username) return false;
    if (isFullModuleAccess(u)) return true;
    var mapped = moduleOfDept(deptOf(u));
    return mapped === "all" || mapped === mod;
  }

  function provinceKey(u) {
    if (u && u.provinceId) return String(u.provinceId).toLowerCase();
    var unit = String((u && (u.unit || u.unit_label)) || "");
    if (/cần thơ|can tho/i.test(unit)) return "can-tho";
    if (/khu\s*vực/i.test(unit)) return "can-tho";
    return "";
  }

  function sameProvince(item, u) {
    if (isAdmin(u) || isNational(u)) return true;
    var a = provinceKey(u);
    var b = provinceKey(item);
    if (a && b) return a === b;
    if (u && u.level === "tinh") {
      var iu = String((item && item.unit) || "");
      var uu = String(u.unit || "");
      if (/khu\s*vực/i.test(iu)) return !uu || /cần thơ/i.test(uu);
      if (iu && uu && iu !== uu) return false;
    }
    return true;
  }

  function sameUnit(item, u) {
    if (!item) return true;
    if (isNational(u)) return true;
    if (!sameProvince(item, u)) return false;
    if (u.level === "tinh") {
      if (item.unit && u.unit && item.unit !== u.unit && String(item.unit).indexOf("Khu vực") !== 0) return false;
      return true;
    }
    if (item.unit && u.unit && item.unit !== u.unit) return false;
    return true;
  }

  function sameDept(item, u) {
    var d = deptOf(u);
    if (!d) return true;
    var id = item.department || item.phong || item.departmentId || "";
    if (!id) return true;
    if (norm(id) === norm(d)) return true;
    var a = moduleOfDept(d);
    var b = moduleOfDept(id);
    return a !== "all" && a === b;
  }

  function isMine(item, u) {
    var name = norm(u.fullname || "");
    var uname = norm(u.username || "");
    var created = norm(item.createdBy || item.nguoi_tao || item.created_by || "");
    var ksv = norm(
      item.ksv || item.can_bo_ksv || item.prosecutors || item.assignedTo || item.nguoi_xu_ly || ""
    );
    if (created && (created === uname || created === name)) return true;
    if (name && ksv && ksv.indexOf(name) >= 0) return true;
    if (uname && ksv && ksv.indexOf(uname) >= 0) return true;
    return false;
  }

  function canSeeRecord(u, item) {
    if (!u || !item) return false;
    if (isAdmin(u) || isNational(u)) return true;
    if (!sameUnit(item, u)) return false;
    if (isKsv(u)) return isMine(item, u);
    if (u.level === "tinh" && !isUnitWide(u)) return sameDept(item, u);
    return true;
  }

  function canCreateAccount(actor, target) {
    if (!canManageAccounts(actor)) return false;
    if (isAdmin(actor) || actor.level === "toi_cao") return true;
    if (actor.level === "tinh") {
      if (target.level === "toi_cao") return false;
      if (target.provinceId && actor.provinceId && target.provinceId !== actor.provinceId) return false;
      if (target.unit && actor.unit && target.level === "tinh" && actor.unit !== target.unit) return false;
      if (isTruongPhong(actor)) {
        var staff = target.position === "Kiểm sát viên" || target.position === "Kiểm tra viên" || target.position === "Chuyên viên";
        return target.level === "tinh" && staff && norm(target.department || "") === norm(deptOf(actor));
      }
      if (target.level === "tinh") return !actor.unit || !target.unit || actor.unit === target.unit;
      return true;
    }
    return target.level === "khuvuc" && (!actor.unit || !target.unit || actor.unit === target.unit);
  }

  function canSeeAccount(actor, username, rec) {
    rec = rec || {};
    if (isAdmin(actor) || actor.level === "toi_cao") return true;
    if (!sameProvince(rec, actor)) return false;
    if (actor.level === "tinh") {
      if (rec.level === "toi_cao") return false;
      if (isTruongPhong(actor)) {
        return rec.level === "tinh" && norm(rec.department || "") === norm(deptOf(actor));
      }
      if (rec.level === "tinh") return !actor.unit || !rec.unit || actor.unit === rec.unit;
      return true;
    }
    return rec.level === "khuvuc" && (!actor.unit || !rec.unit || actor.unit === rec.unit);
  }

  function rightsFor(level, position, department) {
    var all = { p_dansu: true, p_khieuto: true, p_thihanh: true };
    var fake = { position: position, level: level, department: department, username: "x" };
    if (isVtOrPvt(fake)) return all;
    var mapped = moduleOfDept(department);
    if (mapped === "all") return all;
    return {
      p_dansu: mapped === "dansu",
      p_khieuto: mapped === "khieuto",
      p_thihanh: mapped === "thads"
    };
  }

  function stampMeta(data, u) {
    u = u || parseProfile();
    data = data || {};
    if (!data.createdBy) data.createdBy = u.username || "";
    if (!data.nguoi_tao) data.nguoi_tao = u.username || "";
    if (!data.unit) data.unit = u.unit || "";
    if (!data.department) data.department = deptOf(u);
    if (isKsv(u)) {
      var name = u.fullname || u.username || "";
      data.ksv = name;
      data.can_bo_ksv = name;
      data.assignedTo = name;
    }
    return data;
  }

  function visibleList(arr) {
    var u = parseProfile();
    return (arr || []).filter(function (item) { return canSeeRecord(u, item); });
  }

  root.VksRbac = {
    parseProfile: parseProfile,
    isAdmin: isAdmin,
    isNational: isNational,
    isKsv: isKsv,
    isLeader: isLeader,
    isTruongPhong: isTruongPhong,
    isUnitWide: isUnitWide,
    isVtOrPvt: isVtOrPvt,
    isFullModuleAccess: isFullModuleAccess,
    canManageAccounts: canManageAccounts,
    canAccessModule: canAccessModule,
    canSeeRecord: canSeeRecord,
    canCreateAccount: canCreateAccount,
    canSeeAccount: canSeeAccount,
    rightsFor: rightsFor,
    stampMeta: stampMeta,
    visibleList: visibleList,
    deptOf: deptOf,
    moduleOfDept: moduleOfDept
  };
})(window);

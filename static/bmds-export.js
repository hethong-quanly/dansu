/* Xuất Excel theo mẫu thống kê QĐ 358/2025/QĐ-VKSTC (BMDS Biểu 18–25, Chỉ tiêu 358). */
(function (root) {
  function dmy(iso) {
    if (!iso) return "";
    var p = String(iso).slice(0, 10).split("-");
    return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : String(iso);
  }
  function dateOf(r) {
    return r.ngay_ban_hanh || r.ngay_thu_ly || r.receiptDate || r.ngay_nhan_qd || r.ngay_nhan || r.ngay_ghi || r.completedDate || "";
  }
  function ts(r) {
    if (r.timestamp) return Number(r.timestamp);
    var t = Date.parse(dateOf(r));
    return isNaN(t) ? 0 : t;
  }
  function inP(r, from, to) {
    var t = ts(r);
    if (!t) return true;
    return t >= from && t <= to;
  }
  function beforeP(r, from) {
    var t = ts(r);
    return !!t && t < from;
  }
  function txt(r) {
    return ((r.tinh_trang_gq || r.status || r.tinh_trang_tha || r.ket_qua || r.sau_xx_ket_qua || "") + "").toLowerCase();
  }
  function isResolved(r) {
    var s = txt(r);
    return /đã xét xử|dinh chi|đình chỉ|xong|da_xet_xu|da_xong|dinh_chi|đã giải quyết/.test(s) || !!(r.sau_xx_ket_qua);
  }
  function leftover(r, from) {
    return beforeP(r, from) && !isResolved(r);
  }
  function newly(r, from, to) {
    return inP(r, from, to) && !beforeP(r, from);
  }
  function thuLy(r, from, to) {
    return leftover(r, from) || newly(r, from, to);
  }
  function linh(r) {
    var v = (r.linh_vuc || r.caseType || "").toUpperCase();
    if (v === "HNGD" || v === "HN" || v === "HNGĐ") return "HNGD";
    if (v === "KDTM" || v === "KD,TM" || v === "KD") return "KDTM";
    if (v === "LD" || v === "LĐ") return "LD";
    if (v === "HC") return "HC";
    if (v === "PS") return "PS";
    if (v === "DS") return "DS";
    var t = (r.ten_vu_an || r.noi_dung || "").toLowerCase();
    if (/ly hôn|hôn nhân|nuôi con|cấp dưỡng|gia đình/.test(t)) return "HNGD";
    if (/kinh doanh|thương mại|hợp đồng mua bán/.test(t)) return "KDTM";
    if (/lao động/.test(t)) return "LD";
    if (/hành chính/.test(t)) return "HC";
    if (/phá sản/.test(t)) return "PS";
    return "DS";
  }
  function cap(r) {
    var c = (r.cap_xet_xu || r.cap_thu_ly || r.trialLevel || "") + "";
    if (/phúc|phuc/i.test(c)) return "PT";
    if (/giám đốc|gdt|tái thẩm|giam doc/i.test(c)) return "GDT";
    return "ST";
  }
  function isViec(r) {
    return r.recordKind === "viec" || /việc|viec/i.test(r.loai_vu_viec || "");
  }
  function vv(list) {
    var viec = list.filter(isViec).length;
    var vu = list.length - viec;
    return [vu, viec, vu + viec];
  }
  function cells(list, types, pred) {
    return types.reduce(function (acc, t) {
      return acc.concat(vv(list.filter(function (r) { return linh(r) === t && pred(r); })));
    }, []);
  }
  function grand(vals) {
    var g = 0;
    for (var i = 2; i < vals.length; i += 3) g += vals[i] || 0;
    return vals.concat([g]);
  }
  function yearRange() {
    var y = new Date().getFullYear();
    return { from: new Date(y, 0, 1).getTime(), to: new Date(y, 11, 31, 23, 59, 59).getTime(), label: "Năm " + y, fromIso: y + "-01-01", toIso: y + "-12-31" };
  }
  function periodLabel(from, to) {
    return "Từ ngày " + dmy(new Date(from).toISOString()) + " đến ngày " + dmy(new Date(to).toISOString());
  }

  function header(code, title, from, to, cols) {
    return [
      ["VIỆN KIỂM SÁT NHÂN DÂN", code],
      [title],
      [periodLabel(from, to)],
      ["(Áp dụng cho các kỳ thống kê tháng, 6 tháng và 12 tháng — QĐ 358/2025/QĐ-VKSTC, BMDS)"],
      [],
      ["Tiêu chí", "Mã dòng"].concat(cols)
    ];
  }

  function soThamSheet(code, title, list, types, colHeads, from, to, extra) {
    extra = extra || [];
    var pool = list;
    var addG = types.length > 1;
    function row(label, ma, pred, section) {
      var vals;
      if (section || !pred) vals = types.reduce(function (a) { return a.concat([ "", "", "" ]); }, []);
      else vals = cells(pool, types, pred);
      if (addG) vals = section || !pred ? vals.concat([""]) : grand(vals);
      return [label, ma].concat(vals);
    }
    var rows = header(code, title, from, to, colHeads).concat([
      row("SỐ LIỆU", "1", null, true),
      row("Số Thông báo trả lại đơn khởi kiện VKS nhận được", "2", function (r) { return /trả lại đơn|tra_lai/.test(txt(r)) && inP(r, from, to); }),
      row("Số Thông báo trả lại đơn khởi kiện VKS đã kiểm sát", "3", function (r) { return r.returnedInspected && inP(r, from, to); }),
      row("Số vụ, việc còn lại của kỳ trước", "4", function (r) { return leftover(r, from); }),
      row("Số vụ việc tạm đình chỉ còn lại của kỳ trước", "5", function (r) { return leftover(r, from) && /tạm đình chỉ|tam_dinh_chi/.test(txt(r)); }),
      row("Số vụ việc VKS mới nhận được thông báo thụ lý", "6", function (r) { return newly(r, from, to); }),
      row("Tổng số vụ, việc VKS thụ lý", "7", function (r) { return thuLy(r, from, to); }),
      row("Tr.đó: Số vụ việc tạm đình chỉ phục hồi trong kỳ thống kê", "8", function (r) { return thuLy(r, from, to) && r.restoredFromTdc; }),
      row("Số vụ, việc Tòa án đã giải quyết xong, trong đó", "9", function (r) { return isResolved(r) && inP(r, from, to); }),
      row("Số vụ, việc Tòa án ra quyết định đình chỉ trước phiên tòa, phiên họp", "10", function (r) { return /đình chỉ trước|dinh_chi_truoc/.test(txt(r)); }),
      row("Số vụ, việc Tòa án ra quyết định công nhận sự thoả thuận của các đương sự", "11", function (r) { return /thỏa thuận|thoa_thuan|công nhận/.test(txt(r) + (r.sau_xx_ket_qua || "")); }),
      row("Số vụ, việc Toà án đã xét xử hoặc đã mở phiên họp", "12", function (r) { return isResolved(r) && inP(r, from, to); }),
      row("Trong đó: Số vụ, việc Tòa án ra quyết định đình chỉ tại phiên tòa, phiên họp", "13", function (r) { return /đình chỉ tại|dinh_chi_tai/.test(txt(r)); }),
      row("Số vụ, việc còn lại cuối kỳ chưa giải quyết", "14", function (r) { return thuLy(r, from, to) && !isResolved(r); }),
      row("Số vụ việc tạm đình chỉ trong kỳ thống kê", "15", function (r) { return /tạm đình chỉ|tam_dinh_chi/.test(txt(r)) && inP(r, from, to); }),
      row("Số vụ, việc Toà án ra quyết định tạm đình chỉ tính đến cuối kỳ thống kê", "16", function (r) { return /tạm đình chỉ|tam_dinh_chi/.test(txt(r)) && thuLy(r, from, to) && !isResolved(r); }),
      row("HOẠT ĐỘNG KIỂM SÁT", "17", null, true),
      row("Số văn bản tố tụng VKS đã kiểm sát", "18", function (r) { return thuLy(r, from, to); }),
      row("Trong đó: Số bản án, quyết định VKS đã kiểm sát", "19", function (r) { return thuLy(r, from, to) && !!(r.so_ban_an || r.judgmentNo); }),
      row("Trong đó: Số bản án, quyết định VKS phát hiện có vi phạm", "20", function (r) { return !!(r.violationFound || r.kienNghi); }),
      row("Số phiên tòa, phiên họp thuộc phạm vi tham gia của VKS", "21", function (r) { return thuLy(r, from, to); }),
      row("Số phiên tòa, phiên họp có VKS tham gia", "22", function (r) { return thuLy(r, from, to) && !!(r.ksv || r.prosecutorName); }),
      row("Số phiên tòa theo thủ tục rút gọn", "23", function (r) { return !!(r.simplifiedProc); }),
      row("Số phiên tòa trực tuyến mà VKS tham gia theo NQ 33/2021/QH15", "24", function (r) { return !!(r.onlineHearing); }),
      row("Số phiên tòa rút kinh nghiệm VKS tổ chức", "25", function (r) { return !!(r.experienceHearing); }),
      row("Số bản kiến nghị của VKS với Tòa án", "30", function (r) { return !!(r.kienNghi); }),
      row("Số bản kiến nghị được Tòa án chấp nhận", "40", function (r) { return !!(r.kienNghiAccepted); }),
      row("Số Quyết định kháng nghị phúc thẩm đối với Bản án (Quyết định) của TA", "56", function (r) { return !!(r.khangNghiPT || r.khang_cao_qua_han); }),
      row("Số kháng nghị liên quan đến lợi ích nhà nước, lợi ích công cộng", "57", function (r) { return !!(r.publicInterest && (r.khangNghiPT || r.khang_cao_qua_han)); })
    ]);
    extra.forEach(function (e) { rows.push(row(e.label, e.code, e.pred)); });
    return rows;
  }

  function oneColSheet(code, title, rows, from, to) {
    return header(code, title, from, to, ["Số liệu"]).concat(rows);
  }

  function bieu18(list, from, to) {
    var ds = ["DS", "HNGD"];
    var cols = ["DS vụ", "DS việc", "DS tổng", "HNGĐ vụ", "HNGĐ việc", "HNGĐ tổng", "Tổng số vụ, việc"];
    return [
      { name: "Bieu 18.1", rows: soThamSheet("Biểu 18.1", "THỐNG KÊ KIỂM SÁT VIỆC GIẢI QUYẾT CÁC VỤ, VIỆC DÂN SỰ, HÔN NHÂN GIA ĐÌNH THEO THỦ TỤC SƠ THẨM", list.filter(function (r) { return cap(r) === "ST"; }), ds, cols, from, to) },
      { name: "Bieu 18.2", rows: soThamSheet("Biểu 18.2", "THỐNG KÊ KIỂM SÁT VIỆC GIẢI QUYẾT CÁC VỤ, VIỆC DÂN SỰ, HÔN NHÂN GIA ĐÌNH THEO THỦ TỤC PHÚC THẨM", list.filter(function (r) { return cap(r) === "PT"; }), ds, cols, from, to, [{ code: "3", label: "Số vụ, việc VKS kháng nghị", pred: function (r) { return !!(r.khangNghiPT || r.khang_cao_qua_han); } }]) },
      { name: "Bieu 18.3", rows: soThamSheet("Biểu 18.3", "THỐNG KÊ KIỂM SÁT VIỆC GIẢI QUYẾT CÁC VỤ, VIỆC DÂN SỰ, HÔN NHÂN GIA ĐÌNH THEO THỦ TỤC GIÁM ĐỐC THẨM, TÁI THẨM", list.filter(function (r) { return cap(r) === "GDT"; }), ds, cols, from, to) }
    ];
  }
  function bieu19(list, from, to) {
    var types = ["KDTM", "LD"];
    var cols = ["KDTM vụ", "KDTM việc", "KDTM tổng", "LĐ vụ", "LĐ việc", "LĐ tổng", "Tổng số vụ, việc"];
    return [
      { name: "Bieu 19.1", rows: soThamSheet("Biểu 19.1", "THỐNG KÊ KIỂM SÁT GIẢI QUYẾT CÁC VỤ, VIỆC KINH DOANH THƯƠNG MẠI, LAO ĐỘNG THEO THỦ TỤC SƠ THẨM", list.filter(function (r) { return cap(r) === "ST"; }), types, cols, from, to) },
      { name: "Bieu 19.2", rows: soThamSheet("Biểu 19.2", "THỐNG KÊ KIỂM SÁT GIẢI QUYẾT CÁC VỤ, VIỆC KINH DOANH THƯƠNG MẠI, LAO ĐỘNG THEO THỦ TỤC PHÚC THẨM", list.filter(function (r) { return cap(r) === "PT"; }), types, cols, from, to) },
      { name: "Bieu 19.3", rows: soThamSheet("Biểu 19.3", "THỐNG KÊ KIỂM SÁT GIẢI QUYẾT CÁC VỤ ÁN KINH DOANH THƯƠNG MẠI, LAO ĐỘNG THEO THỦ TỤC GIÁM ĐỐC THẨM, TÁI THẨM", list.filter(function (r) { return cap(r) === "GDT"; }), types, cols, from, to) }
    ];
  }
  function bieu20(list, from, to) {
    var cols = ["Vụ án", "Việc", "Tổng số"];
    return [
      { name: "Bieu 20.1", rows: soThamSheet("Biểu 20.1", "THỐNG KÊ KIỂM SÁT GIẢI QUYẾT CÁC VỤ ÁN HÀNH CHÍNH THEO THỦ TỤC SƠ THẨM", list.filter(function (r) { return cap(r) === "ST"; }), ["HC"], cols, from, to) },
      { name: "Bieu 20.2", rows: soThamSheet("Biểu 20.2", "THỐNG KÊ KIỂM SÁT GIẢI QUYẾT CÁC VỤ ÁN HÀNH CHÍNH THEO THỦ TỤC PHÚC THẨM", list.filter(function (r) { return cap(r) === "PT"; }), ["HC"], cols, from, to) },
      { name: "Bieu 20.3", rows: soThamSheet("Biểu 20.3", "THỐNG KÊ KIỂM SÁT GIẢI QUYẾT CÁC VỤ ÁN HÀNH CHÍNH THEO THỦ TỤC GIÁM ĐỐC THẨM, TÁI THẨM", list.filter(function (r) { return cap(r) === "GDT"; }), ["HC"], cols, from, to) }
    ];
  }
  function bieu21(list, from, to) {
    var cols = ["Vụ", "Việc", "Tổng số"];
    return [
      { name: "Bieu 21.1", rows: soThamSheet("Biểu 21.1", "THỐNG KÊ KIỂM SÁT GIẢI QUYẾT YÊU CẦU TUYÊN BỐ PHÁ SẢN DOANH NGHIỆP, HỢP TÁC XÃ", list, ["PS"], cols, from, to) },
      { name: "Bieu 21.2", rows: soThamSheet("Biểu 21.2", "THỐNG KÊ KIỂM SÁT GIẢI QUYẾT TUYÊN BỐ PHÁ SẢN THEO THỦ TỤC PHÚC THẨM, GIÁM ĐỐC THẨM", list.filter(function (r) { return cap(r) !== "ST"; }), ["PS"], cols, from, to) }
    ];
  }

  function moneyN(r) {
    var n = Number(r.so_tien || r.amount || r.gia_tri || 0);
    return isNaN(n) ? 0 : n;
  }
  function thaStatus(r) {
    return (r.tinh_trang_tha || r.status || r.ket_qua || "").toLowerCase();
  }
  function bieu24(list, from, to) {
    var oldL = list.filter(function (r) { return leftover(r, from); });
    var news = list.filter(function (r) { return newly(r, from, to); });
    var all = list.filter(function (r) { return leftover(r, from) || newly(r, from, to); });
    function n(pred) { return all.filter(pred).length; }
    function m(pred) { return Math.round(all.filter(pred).reduce(function (s, r) { return s + moneyN(r); }, 0) / 1000); }
    var xong = function (r) { return /xong|da_xong/.test(thaStatus(r)); };
    var dc = function (r) { return /đình chỉ|dinh_chi/.test(thaStatus(r)); };
    var dang = function (r) { return /đang|dang_thi_hanh/.test(thaStatus(r)); };
    var noCond = function (r) { return /chưa có điều kiện|chua_co_dieu_kien/.test(thaStatus(r)); };
    var cond = function (r) { return /có điều kiện|dang_thi_hanh|xong|co_dieu_kien/.test(thaStatus(r)); };
    var rows = oneColSheet("Biểu 24.1", "THỐNG KÊ KẾT QUẢ KIỂM SÁT THI HÀNH ÁN DÂN SỰ", [
      ["I. SỐ VIỆC", "1", ""],
      ["Số cũ", "2", oldL.length],
      ["Số mới", "3", news.length],
      ["Trong đó: Số nhận ủy thác", "4", n(function (r) { return /ủy thác|uy_thac/.test((r.loai_qd || "") + thaStatus(r)); })],
      ["Ủy thác đi, thu hồi, hủy Quyết định thi hành án", "5", 0],
      ["Tổng số phải thi hành", "6", all.length],
      ["Trong đó: Tổng số có điều kiện thi hành", "7", n(cond)],
      ["Trong đó: Tổng số thi hành xong", "8", n(function (r) { return xong(r) || dc(r); })],
      ["++ Thi hành xong", "9", n(xong)],
      ["++ Đình chỉ", "10", n(dc)],
      ["+ Đang thi hành", "11", n(dang)],
      ["Chưa có điều kiện thi hành", "14", n(noCond)],
      ["Số tồn", "17", n(function (r) { return !xong(r) && !dc(r); })],
      ["II. SỐ TIỀN (1.000 VNĐ)", "18", ""],
      ["Số cũ", "19", Math.round(oldL.reduce(function (s, r) { return s + moneyN(r); }, 0) / 1000)],
      ["Số mới", "20", Math.round(news.reduce(function (s, r) { return s + moneyN(r); }, 0) / 1000)],
      ["Tổng số phải thi hành", "23", m(function () { return true; })],
      ["Thi hành xong", "26", m(xong)],
      ["Đang thi hành", "29", m(dang)],
      ["Chưa có điều kiện", "32", m(noCond)]
    ], from, to);
    var kn = list.filter(function (r) { return r.khang_nghi || r.khangNghi; });
    var kien = list.filter(function (r) { return r.kien_nghi || r.kienNghi; });
    var rows2 = oneColSheet("Biểu 24.2", "THỐNG KÊ KIỂM SÁT THI HÀNH ÁN DÂN SỰ, HÀNH CHÍNH", [
      ["I. HOẠT ĐỘNG KIỂM SÁT THI HÀNH ÁN DÂN SỰ", "1", ""],
      ["Số quyết định về thi hành án dân sự đã kiểm sát", "2", all.length],
      ["Số cuộc trực tiếp kiểm sát đã hoàn thành", "7", n(function (r) { return !!(r.directInspect || r.kiem_sat_truc_tiep); })],
      ["Số việc thi hành án VKS đã kiểm sát", "9", all.length],
      ["Án tham nhũng, chức vụ", "11", n(function (r) { return !!(r.corruption); })],
      ["Án xâm phạm trật tự quản lý kinh tế", "12", n(function (r) { return !!(r.economic); })],
      ["Số việc chậm xác minh điều kiện thi hành án", "21", n(function (r) { return !!(r.overdue || r.cham_xac_minh); })],
      ["Số bản kiến nghị cơ quan Thi hành án dân sự", "46", kien.length],
      ["Số bản kiến nghị được chấp nhận", "49", n(function (r) { return !!(r.kienNghiAccepted); })],
      ["Số bản kháng nghị", "51", kn.length],
      ["Số bản kháng nghị được chấp nhận", "52", n(function (r) { return !!(r.khangNghiAccepted); })]
    ], from, to);
    return [{ name: "Bieu 24.1", rows: rows }, { name: "Bieu 24.2", rows: rows2 }];
  }

  function kindOf(r) {
    return (r.phan_loai || r.kind || r.loai_don || "").toLowerCase();
  }
  function authOf(r) {
    return (r.tham_quyen || r.authority || "").toLowerCase();
  }
  function bieu25(list, from, to) {
    var oldL = list.filter(function (r) { return leftover(r, from); });
    var news = list.filter(function (r) { return newly(r, from, to); });
    var pool = list.filter(function (r) { return leftover(r, from) || newly(r, from, to); });
    function n(pred) { return pool.filter(pred).length; }
    var rows = oneColSheet("Biểu 25.1", "THỐNG KÊ KẾT QUẢ TIẾP NHẬN, PHÂN LOẠI VÀ XỬ LÝ ĐƠN TRONG HOẠT ĐỘNG TƯ PHÁP", [
      ["Số đơn còn lại của kỳ trước", "1", oldL.length],
      ["Số đơn mới tiếp nhận", "2", news.length],
      ["Tr.đó: Đơn khiếu nại", "3", n(function (r) { return /khiếu nại|khieu_nai/.test(kindOf(r)); })],
      ["Đơn tố cáo", "4", n(function (r) { return /tố cáo|to_cao/.test(kindOf(r)); })],
      ["Đơn yêu cầu bồi thường thiệt hại", "5", n(function (r) { return /bồi thường|boi_thuong/.test(kindOf(r)); })],
      ["Đơn đề nghị kháng nghị giám đốc thẩm, tái thẩm", "6", n(function (r) { return /giám đốc|gdt|de_nghi_gdt/.test(kindOf(r)); })],
      ["Đơn tố giác trong hoạt động tư pháp", "7", n(function (r) { return /tố giác|to_cao/.test(kindOf(r)); })],
      ["Đơn tin báo, tố giác về tội phạm", "8", n(function (r) { return /tin báo|tin_bao/.test(kindOf(r)); })],
      ["Đơn kiến nghị phản ánh và các loại đơn khác", "9", n(function (r) { return /kiến nghị|kien_nghi/.test(kindOf(r)); })],
      ["Tổng số đơn đã tiếp nhận", "11", pool.length],
      ["Tổng số đơn đã xử lý", "12", n(function (r) { return /giải quyết|chuyen_di|da_giai_quyet|đã xử lý/.test(txt(r)); })],
      ["Số đơn thuộc thẩm quyền giải quyết của VKS", "13", n(function (r) { return /giải quyết|giai_quyet/.test(authOf(r)); })],
      ["Số đơn thuộc thẩm quyền kiểm sát việc giải quyết", "20", n(function (r) { return /kiểm sát|kiem_sat/.test(authOf(r)); })],
      ["Số đơn không thuộc thẩm quyền giải quyết và kiểm sát", "25", n(function (r) { return /không thuộc|khong_thuoc/.test(authOf(r)); })],
      ["Số đơn còn lại cuối kỳ chưa xử lý", "28", n(function (r) { return !isResolved(r); })],
      ["Số lượt tiếp công dân", "29", n(function (r) { return /tiếp công dân|tiep_cong_dan/.test((r.nguon_don || r.source || "") + ""); })],
      ["Trong đó: Lãnh đạo Viện kiểm sát tiếp công dân", "30", n(function (r) { return !!(r.leaderReception); })]
    ], from, to);
    var gq = pool.filter(function (r) { return /giải quyết|giai_quyet/.test(authOf(r)); });
    var rows2 = oneColSheet("Biểu 25.2", "THỐNG KÊ GIẢI QUYẾT KHIẾU NẠI, TỐ CÁO TRONG HOẠT ĐỘNG TƯ PHÁP THUỘC THẨM QUYỀN CỦA VIỆN KIỂM SÁT", [
      ["Số còn lại của kỳ trước (đơn)", "1", oldL.filter(function (r) { return /giải quyết|giai_quyet/.test(authOf(r)); }).length],
      ["Số mới thụ lý (đơn)", "3", news.filter(function (r) { return /giải quyết|giai_quyet/.test(authOf(r)); }).length],
      ["Tổng số thụ lý (đơn)", "7", gq.length],
      ["Tổng số đã giải quyết (đơn)", "9", gq.filter(isResolved).length],
      ["Số việc khiếu nại, tố cáo đúng", "15", gq.filter(function (r) { return /đúng|dung/.test((r.ket_luan || r.merit || "") + "") && !/một phần/.test((r.ket_luan || "") + ""); }).length],
      ["Số việc khiếu nại, tố cáo đúng một phần", "16", gq.filter(function (r) { return /một phần|dung_mot_phan/.test((r.ket_luan || r.merit || "") + ""); }).length],
      ["Số việc khiếu nại, tố cáo sai", "17", gq.filter(function (r) { return /sai/.test((r.ket_luan || r.merit || "") + ""); }).length],
      ["Số còn lại cuối kỳ chưa giải quyết (đơn)", "18", gq.filter(function (r) { return !isResolved(r); }).length]
    ], from, to);
    var gdt = pool.filter(function (r) { return /giám đốc|gdt|de_nghi_gdt/.test(kindOf(r)); });
    var rows4 = oneColSheet("Bieu 25.4", "THỐNG KÊ GIẢI QUYẾT ĐƠN ĐỀ NGHỊ KHÁNG NGHỊ GIÁM ĐỐC THẨM, TÁI THẨM THUỘC THẨM QUYỀN CỦA VIỆN KIỂM SÁT", [
      ["Số còn lại của kỳ trước", "1", gdt.filter(function (r) { return leftover(r, from); }).length],
      ["Số mới thụ lý", "2", gdt.filter(function (r) { return newly(r, from, to); }).length],
      ["Tổng số đã thụ lý", "6", gdt.length],
      ["Tổng số đã giải quyết", "11", gdt.filter(isResolved).length],
      ["Số còn lại cuối kỳ chưa giải quyết", "24", gdt.filter(function (r) { return !isResolved(r); }).length]
    ], from, to);
    return [{ name: "Bieu 25.1", rows: rows }, { name: "Bieu 25.2", rows: rows2 }, { name: "Bieu 25.4", rows: rows4 }];
  }

  function write(filename, sheets) {
    if (typeof XLSX === "undefined") { alert("Chưa tải thư viện Excel."); return; }
    var wb = XLSX.utils.book_new();
    sheets.forEach(function (s) {
      if (!s || !s.rows || !s.rows.length) return;
      var ws = XLSX.utils.aoa_to_sheet(s.rows);
      ws["!cols"] = [{ wch: 78 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws, (s.name || "Sheet").slice(0, 31));
    });
    XLSX.writeFile(wb, filename);
  }

  function detailDansu(list) {
    return [["STT", "Lĩnh vực", "Cấp XX", "Mã vụ việc", "Tên vụ việc", "Số thụ lý", "Số BA/QĐ", "Ngày", "Nguyên đơn", "Bị đơn", "Thẩm phán", "KSV", "Tình trạng"]].concat(
      list.map(function (r, i) {
        return [i + 1, linh(r), r.cap_xet_xu || r.cap_thu_ly || "", r.ma_vu_viec || r.id || "", r.ten_vu_an || "", r.so_thu_ly || "", r.so_ban_an || "", dateOf(r), r.nguyen_don || "", r.bi_don || "", r.tham_phan || "", r.ksv || "", r.tinh_trang_gq || r.sau_xx_ket_qua || ""];
      })
    );
  }

  function exportDansu(list, from, to) {
    from = from || yearRange().from;
    to = to || yearRange().to;
    if (!list || !list.length) { alert("Không có dữ liệu để xuất."); return; }
    write("BMDS_Bieu18-21_AnDanSu_" + new Date().toISOString().slice(0, 10) + ".xlsx",
      bieu18(list, from, to)
        .concat(bieu19(list, from, to))
        .concat(bieu20(list, from, to))
        .concat(bieu21(list, from, to))
        .concat([{ name: "Danh sach", rows: detailDansu(list) }])
    );
  }
  function exportThads(list, from, to) {
    from = from || yearRange().from;
    to = to || yearRange().to;
    if (!list || !list.length) { alert("Không có dữ liệu để xuất."); return; }
    var detail = [["STT", "Số QĐTHA", "Loại QĐ", "Cơ quan THA", "Ngày nhận VKS", "Người phải THA", "Người được THA", "Tình trạng", "Kháng nghị"]].concat(
      list.map(function (r, i) {
        return [i + 1, r.so_qd_tha || r.decisionNo || "", r.loai_qd || "", r.ten_co_quan_tha || r.loai_co_quan || "", r.ngay_nhan_qd || "", r.nguoi_phai_tha || r.debtor || "", r.nguoi_duoc_tha || r.creditor || "", r.tinh_trang_tha || "", (r.khang_nghi || r.khangNghi) ? "Có" : ""];
      })
    );
    write("BMDS_Bieu24_THADS_" + new Date().toISOString().slice(0, 10) + ".xlsx",
      bieu24(list, from, to).concat([{ name: "Danh sach", rows: detail }])
    );
  }
  function exportKhieuto(list, from, to) {
    from = from || yearRange().from;
    to = to || yearRange().to;
    if (!list || !list.length) { alert("Không có dữ liệu để xuất."); return; }
    var detail = [["STT", "Ngày nhận", "Nguồn đơn", "Người nộp", "Phân loại", "Thẩm quyền", "Nội dung", "Cán bộ"]].concat(
      list.map(function (r, i) {
        return [i + 1, r.ngay_nhan || "", r.nguon_don || "", r.ho_ten || r.petitioner || "", r.phan_loai || "", r.tham_quyen || "", r.noi_dung || "", r.can_bo_ksv || ""];
      })
    );
    write("BMDS_Bieu25_KhieuTo_" + new Date().toISOString().slice(0, 10) + ".xlsx",
      bieu25(list, from, to).concat([{ name: "Danh sach", rows: detail }])
    );
  }
  function exportReport(kind, ads, tha, dkt, from, to) {
    from = from || yearRange().from;
    to = to || yearRange().to;
    var sheets = [];
    if (kind === "all" || kind === "an_dan_su") {
      sheets = sheets.concat(bieu18(ads, from, to), bieu19(ads, from, to), bieu20(ads, from, to), bieu21(ads, from, to));
      if (ads.length) sheets.push({ name: "DS danh sach", rows: detailDansu(ads) });
    }
    if (kind === "all" || kind === "thi_hanh_an") sheets = sheets.concat(bieu24(tha, from, to));
    if (kind === "all" || kind === "don_khieu_to") sheets = sheets.concat(bieu25(dkt, from, to));
    if (!sheets.length) { alert("Không có dữ liệu để xuất theo mẫu thống kê."); return; }
    write("BMDS_QD358_" + kind + "_" + new Date().toISOString().slice(0, 10) + ".xlsx", sheets);
  }

  root.VksBmds = {
    yearRange: yearRange,
    exportDansu: exportDansu,
    exportThads: exportThads,
    exportKhieuto: exportKhieuto,
    exportReport: exportReport
  };
})(window);

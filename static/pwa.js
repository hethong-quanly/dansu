(function () {
  var head = document.head;
  if (head && !document.querySelector('link[rel="manifest"]')) {
    var m = document.createElement("link");
    m.rel = "manifest";
    m.href = "manifest.webmanifest";
    head.appendChild(m);
  }
  if (head && !document.querySelector('link[rel="apple-touch-icon"]')) {
    var a = document.createElement("link");
    a.rel = "apple-touch-icon";
    a.href = "static/icon-192.png";
    head.appendChild(a);
  }
  if (head && !document.querySelector('meta[name="theme-color"]')) {
    var t = document.createElement("meta");
    t.name = "theme-color";
    t.content = "#0a2468";
    head.appendChild(t);
  }
  if (head && !document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
    var cap = document.createElement("meta");
    cap.name = "apple-mobile-web-app-capable";
    cap.content = "yes";
    head.appendChild(cap);
    var title = document.createElement("meta");
    title.name = "apple-mobile-web-app-title";
    title.content = "VKS Dân sự";
    head.appendChild(title);
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js?v=20260924c").catch(function () {});
  }

  var deferred = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    document.querySelectorAll("[data-install-app]").forEach(function (btn) {
      btn.style.display = "flex";
    });
  });

  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("[data-install-app]");
    if (!btn) return;
    e.preventDefault();
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.finally(function () { deferred = null; });
      return;
    }
    window.location.href = "cai_dat.html";
  });

  document.addEventListener("DOMContentLoaded", function () {
    var path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    if (path === "login.html" || path === "tro_ly_ao.html" || path === "cai_dat.html") return;
    var logged = sessionStorage.getItem("vks_logged_in") === "true" && localStorage.getItem("vks_user");
    if (!logged) return;
    if (document.getElementById("vks-assistant-fab")) return;
    var a = document.createElement("a");
    a.id = "vks-assistant-fab";
    a.href = "tro_ly_ao.html";
    a.title = "Trợ lý ảo hướng dẫn sử dụng phần mềm";
    a.setAttribute("aria-label", "Trợ lý ảo hướng dẫn");
    a.style.cssText = "position:fixed;z-index:90;right:16px;bottom:18px;width:56px;height:56px;border-radius:50%;background:#0c3b8c;color:#ffe566;display:flex;align-items:center;justify-content:center;text-decoration:none;box-shadow:0 10px 24px rgba(7,26,74,.35);font-family:'Be Vietnam Pro',sans-serif;font-size:11px;font-weight:800;line-height:1.15;text-align:center;";
    a.innerHTML = "Trợ<br/>lý";
    document.body.appendChild(a);
  });
})();

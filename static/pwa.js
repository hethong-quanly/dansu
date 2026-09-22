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
    navigator.serviceWorker.register("sw.js?v=20260922a").catch(function () {});
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
})();

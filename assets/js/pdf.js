/* ============================================================
   ScoreCoach — Export PDF professionnel, 100% côté client.
   Générateur PDF minimal écrit à la main (aucune librairie).
   Produit un vrai fichier .pdf (A4) téléchargeable : header
   coloré, grille critères/notes/commentaires, total, pied de
   page. Encodage WinAnsi avec gestion des accents français.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- encodage WinAnsi (Latin-1) ---------- */
  var WIN = {
    "\u20AC": 128, "\u201A": 130, "\u0192": 131, "\u201E": 132, "\u2026": 133,
    "\u2020": 134, "\u2021": 135, "\u02C6": 136, "\u2030": 137, "\u0160": 138,
    "\u2039": 139, "\u0152": 140, "\u017D": 142, "\u2018": 145, "\u2019": 146,
    "\u201C": 147, "\u201D": 148, "\u2022": 149, "\u2013": 150, "\u2014": 151,
    "\u02DC": 152, "\u2122": 153, "\u0161": 154, "\u203A": 155, "\u0153": 156,
    "\u017E": 158, "\u0178": 159
  };
  function toWin(str) {
    var out = "";
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      var ch = str.charAt(i);
      if (c >= 32 && c <= 126) { out += ch; continue; }
      if (c >= 160 && c <= 255) { out += ch; continue; }
      if (WIN[ch] !== undefined) { out += String.fromCharCode(WIN[ch]); continue; }
      out += "?";
    }
    return out;
  }
  function esc(t) {
    return toWin(t).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }

  /* ---------- assembleur PDF ---------- */
  function build(objects) {
    var HEADER = "%PDF-1.4\n";
    var body = "";
    var offsets = [0];
    var i;
    for (i = 0; i < objects.length; i++) {
      offsets.push(body.length);
      body += (i + 1) + " 0 obj\n" + objects[i] + "\nendobj\n";
    }
    var xrefPos = HEADER.length + body.length; /* offset absolu dans le fichier */
    var xref = "xref\n0 " + (objects.length + 1) + "\n";
    xref += "0000000000 65535 f \n";
    for (i = 1; i < offsets.length; i++) {
      xref += ("0000000000" + offsets[i]).slice(-10) + " 00000 n \n";
    }
    var trailer = "trailer\n<< /Size " + (objects.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xrefPos + "\n%%EOF";
    return HEADER + body + xref + trailer;
  }

  /* ---------- mise en page ---------- */
  var W = 595, H = 842, ML = 50, MR = 545, TOP = 700, LH = 20;
  var TEAL = "0.05 0.58 0.53 rg";
  var DARK = "0.07 0.13 0.11 rg";
  var GRAY = "0.36 0.4 0.38 rg";
  var LINE = "0.88 0.9 0.87 RG";

  function textOp(x, y, size, str, font, color) {
    return "BT " + color + " /" + font + " " + size + " Tf 1 0 0 1 " + x + " " + y + " Tm (" + esc(str) + ") Tj ET\n";
  }
  function lineOp(x1, y1, x2, y2) {
    return x1 + " " + y1 + " m " + x2 + " " + y2 + " l S\n";
  }
  function rectOp(x, y, w, h, color) {
    return x + " " + y + " " + w + " " + h + " re " + color + " f\n";
  }
  function widthOf(str, size) {
    /* approximation Helvetica : 0.5 * size par caractère */
    return esc(str).length * size * 0.5;
  }

  /* ---------- génération du rapport ---------- */
  function generateReport(session, tpl) {
    var U = globalThis.SC_UTILS;
    var totals = U.computeTotals(session);
    var date = session.date || new Date().toISOString().slice(0, 10);
    var dateFr = date.split("-").reverse().join("/");
    var headerH = 64;

    /* lignes de contenu : header + infos + rangées */
    var rows = [];
    rows.push({ t: "header", h: headerH });
    rows.push({ t: "info", h: 60 });

    var perCriterion = session.criteria.map(function (c) {
      var crit = null;
      tpl.criteria.forEach(function (tc) { if (tc.id === c.id) crit = tc; });
      return {
        label: crit ? crit.label : c.id,
        hint: crit ? crit.hint : "",
        score: Number(c.score) || 0,
        comment: (c.comment || "").trim()
      };
    });

    var rowH = 34;
    var nPages = Math.max(1, Math.ceil(perCriterion.length / 12));
    var perPage = Math.ceil(perCriterion.length / nPages);
    var pages = [];
    var p, i;
    for (p = 0; p < nPages; p++) {
      var slice = perCriterion.slice(p * perPage, (p + 1) * perPage);
      var stream = "";
      var y = TOP;

      /* bandeau header */
      stream += rectOp(0, H - headerH, W, headerH, TEAL);
      stream += textOp(50, H - 34, 17, "SCORECOACH", "F2", "1 1 1 rg");
      stream += textOp(50, H - 52, 9.5, "Compte-rendu d'evaluation professionnel", "F1", "0.85 0.98 0.96 rg");

      /* infos client */
      stream += textOp(ML, y, 13, "Client : " + (session.client || "—"), "F2", DARK);
      var dateStr = "Date : " + dateFr;
      stream += textOp(MR - widthOf(dateStr, 11), y, 11, dateStr, "F1", GRAY);
      y -= 20;
      stream += textOp(ML, y, 10.5, "Grille : " + tpl.name + "  \u00B7  Score : " + totals.total + "/" + totals.max + "  \u00B7  " + totals.pct + " %", "F1", GRAY);
      y -= 24;

      /* rangées */
      for (i = 0; i < slice.length; i++) {
        var r = slice[i];
        var label = r.label;
        var hint = r.hint ? "  —  " + r.hint : "";
        var scoreTxt = r.score > 0 ? r.score + "/5" : "—";
        var color = r.score >= 4 ? "0.09 0.5 0.24 rg" : (r.score >= 3 ? "0.05 0.58 0.53 rg" : (r.score > 0 ? "0.98 0.45 0.09 rg" : GRAY));
        stream += lineOp(ML, y + 2, MR, y + 2, LINE);
        y -= 8;
        stream += textOp(ML, y, 10.5, label + hint, "F1", DARK);
        stream += textOp(MR - 26, y, 11, scoreTxt, "F2", color);
        y -= 15;
        if (r.comment) {
          stream += textOp(ML + 12, y, 9, "\u201C" + r.comment + "\u201D", "F1", GRAY);
          y -= 15;
        }
        y -= 4;
      }
      stream += lineOp(ML, y + 2, MR, y + 2, LINE);

      /* bloc total */
      y -= 30;
      stream += rectOp(ML, y - 4, MR - ML, 30, "0.93 0.96 0.94 rg");
      stream += textOp(ML + 12, y + 14, 11, "TOTAL  " + totals.total + "/" + totals.max + "  (" + totals.pct + " %)", "F2", TEAL);
      var avgTxt = "Moyenne : " + totals.average + "/5";
      stream += textOp(MR - widthOf(avgTxt, 10) - 12, y + 14, 10, avgTxt, "F1", DARK);
      y -= 50;

      /* commentaire global */
      if (session.globalComment && session.globalComment.trim()) {
        stream += textOp(ML, y, 10, "Commentaire global :", "F2", DARK);
        y -= 15;
        stream += textOp(ML, y, 10, "\u201C" + session.globalComment.trim() + "\u201D", "F1", GRAY);
      }

      /* pied de page */
      var foot = "Genere par ScoreCoach — grille digitalisee, page " + (p + 1) + "/" + nPages;
      stream += textOp(ML, 40, 8.5, foot, "F1", GRAY);

      pages.push(stream);
    }

    /* objets PDF */
    var objects = [];
    objects.push("<< /Type /Catalog /Pages 2 0 R >>");
    var kids = pages.map(function (_, idx) { return (3 + idx) + " 0 R"; }).join(" ");
    objects.push("<< /Type /Pages /Kids [" + kids + "] /Count " + pages.length + " >>");
    pages.forEach(function (stream) {
      objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + W + " " + H + "] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents " + (objects.length + 3) + " 0 R >>");
      objects.push("<< /Length " + stream.length + " >>\nstream\n" + stream + "endstream");
    });
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

    return build(objects);
  }

  /* ---------- téléchargement ---------- */
  function downloadPdf(session, tpl) {
    var pdf = generateReport(session, tpl);
    var bytes = new Uint8Array(pdf.length);
    for (var i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
    var blob = new Blob([bytes], { type: "application/pdf" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    var safe = (session.client || "client").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    a.href = url;
    a.download = "scorecoach-evaluation-" + safe + "-" + (session.date || "sans-date") + ".pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    return a.download;
  }

  globalThis.SC_PDF = {
    generateReport: generateReport,
    downloadPdf: downloadPdf,
    _internal: { toWin: toWin, esc: esc, build: build }
  };
})();

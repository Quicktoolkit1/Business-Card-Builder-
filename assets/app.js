/* ============================================================
   CardCraft — Business Card Builder logic
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Mobile nav toggle ---------- */
  var navToggle = document.getElementById('nav-toggle');
  var navLinks = document.getElementById('nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      navLinks.classList.toggle('open');
    });
    navLinks.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') navLinks.classList.remove('open');
    });
  }

  /* The builder only exists on the home page; bail out otherwise. */
  var card = document.getElementById('card');
  if (!card) return;

  // ---------- Live preview bindings ----------
  var map = {
    'f-name':    { out: 'o-name',    prefix: '' },
    'f-title':   { out: 'o-title',   prefix: '' },
    'f-company': { out: 'o-company', prefix: '' },
    'f-phone':   { out: 'o-phone',   prefix: '\uD83D\uDCDE ' },
    'f-email':   { out: 'o-email',   prefix: '\u2709\uFE0F ' },
    'f-website': { out: 'o-website', prefix: '\uD83C\uDF10 ' },
    'f-address': { out: 'o-address', prefix: '\uD83D\uDCCD ' },
    'f-tagline': { out: 'o-tagline', prefix: '' }
  };
  Object.keys(map).forEach(function (id) {
    var input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('input', function () {
      var o = map[id];
      var el = document.getElementById(o.out);
      if (el) el.textContent = input.value ? o.prefix + input.value : '';
    });
  });

  // ---------- Templates ----------
  document.getElementById('template-row').addEventListener('click', function (e) {
    var btn = e.target.closest('.tpl-btn');
    if (!btn) return;
    document.querySelectorAll('.tpl-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    card.className = 'card tpl-' + btn.dataset.tpl;
    // re-apply chosen colours after template class reset
    card.style.setProperty('--primary', document.getElementById('c-primary').value);
    card.style.setProperty('--text', document.getElementById('c-text').value);
  });

  // ---------- Colors ----------
  document.getElementById('c-primary').addEventListener('input', function () {
    card.style.setProperty('--primary', this.value);
  });
  document.getElementById('c-text').addEventListener('input', function () {
    card.style.setProperty('--text', this.value);
  });

  // ---------- Image upload + Cropper ----------
  var photoInput = document.getElementById('f-photo');
  var cropModal  = document.getElementById('crop-modal');
  var cropImage  = document.getElementById('crop-image');
  var cardPhoto  = document.getElementById('card-photo');
  var cropper = null;
  var photoDataUrl = null; // cropped photo kept for sharp PDF export

  photoInput.addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      cropImage.src = ev.target.result;
      openCrop();
    };
    reader.readAsDataURL(file);
    photoInput.value = '';
  });

  function openCrop() {
    cropModal.classList.add('open');
    if (cropper) cropper.destroy();
    cropper = new Cropper(cropImage, { aspectRatio: 1, viewMode: 1, autoCropArea: 1 });
  }
  function closeCrop() {
    cropModal.classList.remove('open');
    if (cropper) { cropper.destroy(); cropper = null; }
  }

  document.querySelector('.crop-tools').addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn || !cropper) return;
    switch (btn.dataset.act) {
      case 'rot-left':  cropper.rotate(-90); break;
      case 'rot-right': cropper.rotate(90); break;
      case 'zoom-in':   cropper.zoom(0.1); break;
      case 'zoom-out':  cropper.zoom(-0.1); break;
      case 'reset':     cropper.reset(); break;
    }
  });

  document.getElementById('crop-cancel').addEventListener('click', closeCrop);
  document.getElementById('crop-apply').addEventListener('click', function () {
    if (!cropper) return;
    var canvas = cropper.getCroppedCanvas({
      width: 512, height: 512,
      imageSmoothingEnabled: true, imageSmoothingQuality: 'high'
    });
    photoDataUrl = canvas.toDataURL('image/png');
    cardPhoto.src = photoDataUrl;
    cardPhoto.hidden = false;
    var ph = document.getElementById('card-photo-placeholder');
    if (ph) ph.style.display = 'none';
    closeCrop();
  });

  cropModal.addEventListener('click', function (e) {
    if (e.target === cropModal) closeCrop();
  });

  // ---------- Helpers ----------
  function hexToRgb(hex) {
    hex = String(hex || '').replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(function (c) { return c + c; }).join('');
    }
    return {
      r: parseInt(hex.substr(0, 2), 16) || 0,
      g: parseInt(hex.substr(2, 2), 16) || 0,
      b: parseInt(hex.substr(4, 2), 16) || 0
    };
  }

  function fieldValue(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  // Turn the (square) cropped photo into a transparent circular PNG so it can
  // be dropped into the PDF as a real round image, just like the preview.
  function makeCircular(dataUrl, cb) {
    var img = new Image();
    img.onload = function () {
      var s = 512;
      var c = document.createElement('canvas');
      c.width = s; c.height = s;
      var ctx = c.getContext('2d');
      ctx.clearRect(0, 0, s, s);
      ctx.save();
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, 0, 0, s, s);
      ctx.restore();
      cb(c.toDataURL('image/png'));
    };
    img.onerror = function () { cb(null); };
    img.src = dataUrl;
  }

  // Smooth horizontal gradient drawn as thin strips (used by the Gradient template).
  function drawGradient(pdf, x, y, w, h, hex1, hex2) {
    var c1 = hexToRgb(hex1), c2 = hexToRgb(hex2);
    var steps = 140, sw = w / steps;
    for (var i = 0; i < steps; i++) {
      var t = i / (steps - 1);
      pdf.setFillColor(
        Math.round(c1.r + (c2.r - c1.r) * t),
        Math.round(c1.g + (c2.g - c1.g) * t),
        Math.round(c1.b + (c2.b - c1.b) * t)
      );
      pdf.rect(x + i * sw, y, sw + 0.4, h, 'F');
    }
  }

  // ---------- PDF download (true vector text — fully selectable & copyable) ----------
  // Instead of flattening the card to an image, every line is written with
  // pdf.text() so the exported PDF stays razor-sharp at any zoom and the text
  // can be selected, copied and searched. The photo is embedded as a crisp
  // circular image to match the live preview.
  document.getElementById('btn-pdf').addEventListener('click', function () {
    if (photoDataUrl) {
      makeCircular(photoDataUrl, function (circ) { buildPdf(circ); });
    } else {
      buildPdf(null);
    }
  });

  function buildPdf(photoImg) {
    try {
      var jsPDF = window.jspdf.jsPDF;
      var W = 89, H = 51; // standard business-card size in mm (89 x 51)
      var pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [W, H] });

      var tplMatch = card.className.match(/tpl-(\w+)/);
      var tpl = tplMatch ? tplMatch[1] : 'classic';
      var primaryHex = document.getElementById('c-primary').value;
      var textHex = document.getElementById('c-text').value;

      // Theme colours per template (mirrors the on-screen styles).
      var bg, nameColor, bodyColor, mutedColor, dividerColor, isGradient = false;
      switch (tpl) {
        case 'dark':
          bg = '#0f172a'; nameColor = primaryHex; bodyColor = '#e2e8f0';
          mutedColor = '#cbd5e1'; dividerColor = primaryHex; break;
        case 'modern':
          bg = '#f8fafc'; nameColor = primaryHex; bodyColor = textHex;
          mutedColor = textHex; dividerColor = primaryHex; break;
        case 'minimal':
          bg = '#ffffff'; nameColor = primaryHex; bodyColor = textHex;
          mutedColor = textHex; dividerColor = '#cbd5e1'; break;
        case 'gradient':
          isGradient = true; nameColor = '#ffffff'; bodyColor = '#ffffff';
          mutedColor = '#ffffff'; dividerColor = '#ffffff'; break;
        default: // classic
          bg = '#ffffff'; nameColor = primaryHex; bodyColor = textHex;
          mutedColor = textHex; dividerColor = primaryHex;
      }

      // Background.
      if (isGradient) {
        drawGradient(pdf, 0, 0, W, H, primaryHex, '#9333ea');
      } else {
        var b = hexToRgb(bg);
        pdf.setFillColor(b.r, b.g, b.b);
        pdf.rect(0, 0, W, H, 'F');
      }
      if (tpl === 'minimal') {
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.3);
        pdf.rect(1, 1, W - 2, H - 2, 'S');
      }

      var setText = function (hex) {
        var c = hexToRgb(hex);
        pdf.setTextColor(c.r, c.g, c.b);
      };

      // ----- Photo (circular, right side) -----
      var d = 24, pLeft = W - 6 - d, pTop = 6, pcx = pLeft + d / 2, pcy = pTop + d / 2;
      var hasPhoto = !!photoImg;
      if (hasPhoto) {
        pdf.addImage(photoImg, 'PNG', pLeft, pTop, d, d, undefined, 'FAST');
        var pr = hexToRgb(primaryHex);
        pdf.setDrawColor(pr.r, pr.g, pr.b);
        pdf.setLineWidth(0.9);
        pdf.circle(pcx, pcy, d / 2, 'S');
      }

      // ----- Text body (left) -----
      var x = 6;
      var bodyRight = hasPhoto ? (pLeft - 4) : (W - 6);
      var bodyW = bodyRight - x;
      var y = 13;

      var name = fieldValue('f-name');
      if (name) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(15);
        setText(nameColor);
        var nl = pdf.splitTextToSize(name, bodyW);
        pdf.text(nl, x, y);
        y += nl.length * 5.6;
      }

      var title = fieldValue('f-title');
      if (title) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        setText(bodyColor);
        pdf.text(pdf.splitTextToSize(title, bodyW), x, y);
        y += 4;
      }

      var company = fieldValue('f-company');
      if (company) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        setText(mutedColor);
        pdf.text(pdf.splitTextToSize(company, bodyW), x, y);
        y += 3.6;
      }

      // Divider.
      y += 1.6;
      var dc = hexToRgb(dividerColor);
      pdf.setFillColor(dc.r, dc.g, dc.b);
      pdf.rect(x, y, 12, 0.9, 'F');
      y += 4.8;

      // Contacts with small bullet markers.
      var contacts = ['f-phone', 'f-email', 'f-website', 'f-address']
        .map(fieldValue).filter(Boolean);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      contacts.forEach(function (line) {
        pdf.setFillColor(dc.r, dc.g, dc.b);
        pdf.circle(x + 0.7, y - 0.8, 0.6, 'F');
        setText(bodyColor);
        var cl = pdf.splitTextToSize(line, bodyW - 3);
        pdf.text(cl, x + 3, y);
        y += cl.length * 3.5;
      });

      // Tagline anchored near the bottom.
      var tagline = fieldValue('f-tagline');
      if (tagline) {
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(7);
        setText(mutedColor);
        var tl = pdf.splitTextToSize(tagline, W - 12);
        pdf.text(tl, x, H - 4 - (tl.length - 1) * 3);
      }

      pdf.save('business-card.pdf');
    } catch (e) {
      alert('Could not generate the PDF. Please try again.');
    }
  }
})();

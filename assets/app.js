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

  // ---------- helpers ----------
  function val(id) { return (document.getElementById(id).value || '').trim(); }
  function hexToRgb(hex) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [17, 24, 39];
  }
  function activeTpl() {
    var b = document.querySelector('.tpl-btn.active');
    return b ? b.dataset.tpl : 'classic';
  }

  // Render an emoji to a small transparent PNG so it can sit next to the
  // (selectable, copyable) vector text as an icon in the PDF.
  function emojiDataUrl(emoji) {
    var c = document.createElement('canvas');
    c.width = c.height = 72;
    var ctx = c.getContext('2d');
    ctx.font = '56px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 36, 40);
    return c.toDataURL('image/png');
  }

  // Clip the uploaded square photo into a circle with a coloured ring,
  // matching the on-screen preview.
  function makeCircularPhoto(dataUrl, ringHex) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var s = 512, c = document.createElement('canvas');
        c.width = c.height = s;
        var ctx = c.getContext('2d');
        ctx.save();
        ctx.beginPath();
        ctx.arc(s / 2, s / 2, s / 2 - 16, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 0, 0, s, s);
        ctx.restore();
        ctx.lineWidth = 24;
        ctx.strokeStyle = ringHex || '#4f46e5';
        ctx.beginPath();
        ctx.arc(s / 2, s / 2, s / 2 - 13, 0, Math.PI * 2);
        ctx.stroke();
        resolve(c.toDataURL('image/png'));
      };
      img.onerror = function () { resolve(null); };
      img.src = dataUrl;
    });
  }

  // ---------- PDF download (HD, with SELECTABLE/COPYABLE vector text) ----------
  // Text (name, details, tagline) is drawn natively by jsPDF so it can be
  // selected and copied. The photo is a circular image and the contact icons
  // are tiny emoji images, so the result still looks like the live preview.
  document.getElementById('btn-pdf').addEventListener('click', function () {
    var jsPDF = window.jspdf.jsPDF;
    var W = 89, H = 51, margin = 7;
    var tpl = activeTpl();
    var primary = hexToRgb(val('c-primary'));
    var textRgb = hexToRgb(val('c-text'));
    var accent2 = [147, 51, 234];
    var bg = [255, 255, 255];
    var gradient = (tpl === 'gradient');
    var ringHex = val('c-primary') || '#4f46e5';

    if (tpl === 'dark')   { bg = [15, 23, 42];  textRgb = [226, 232, 240]; }
    if (tpl === 'modern') { bg = [248, 250, 252]; }

    function build(circPhoto) {
      var pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [W, H] });

      // Background
      if (gradient) {
        var steps = 64;
        for (var i = 0; i < steps; i++) {
          var t = i / (steps - 1);
          pdf.setFillColor(
            Math.round(primary[0] + (accent2[0] - primary[0]) * t),
            Math.round(primary[1] + (accent2[1] - primary[1]) * t),
            Math.round(primary[2] + (accent2[2] - primary[2]) * t)
          );
          pdf.rect(i * W / steps, 0, W / steps + 0.6, H, 'F');
        }
        textRgb = [255, 255, 255];
      } else {
        pdf.setFillColor(bg[0], bg[1], bg[2]);
        pdf.rect(0, 0, W, H, 'F');
      }

      // Circular photo on the right, slightly above centre
      var photoSize = 24;
      if (circPhoto) {
        var px = W - margin - photoSize;
        var py = (H - photoSize) / 2 - 2.5;
        pdf.addImage(circPhoto, 'PNG', px, py, photoSize, photoSize, undefined, 'SLOW');
      }

      var x = margin, y = 14;

      // Name
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.setTextColor(gradient ? 255 : primary[0], gradient ? 255 : primary[1], gradient ? 255 : primary[2]);
      if (val('f-name')) pdf.text(val('f-name'), x, y);

      // Designation
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(textRgb[0], textRgb[1], textRgb[2]);
      pdf.setFontSize(9);
      if (val('f-title')) { y += 5; pdf.text(val('f-title'), x, y); }

      // Company
      pdf.setFontSize(8);
      if (val('f-company')) { y += 4.4; pdf.text(val('f-company'), x, y); }

      // Divider
      y += 2.4;
      pdf.setDrawColor(gradient ? 255 : primary[0], gradient ? 255 : primary[1], gradient ? 255 : primary[2]);
      pdf.setLineWidth(0.7);
      pdf.line(x, y, x + 13, y);

      // Contact rows: emoji icon image + selectable text
      pdf.setFontSize(8);
      pdf.setTextColor(textRgb[0], textRgb[1], textRgb[2]);
      var rows = [
        { icon: '\uD83D\uDCDE', text: val('f-phone') },
        { icon: '\u2709\uFE0F', text: val('f-email') },
        { icon: '\uD83C\uDF10', text: val('f-website') },
        { icon: '\uD83D\uDCCD', text: val('f-address') }
      ].filter(function (r) { return r.text; });

      y += 4.2;
      rows.forEach(function (r) {
        try { pdf.addImage(emojiDataUrl(r.icon), 'PNG', x, y - 3.1, 3.4, 3.4); } catch (e) {}
        pdf.text(r.text, x + 4.7, y);
        y += 4.3;
      });

      // Tagline
      if (val('f-tagline')) {
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(7);
        pdf.text(val('f-tagline'), x, H - 3.5);
      }

      pdf.save('business-card.pdf');
    }

    try {
      if (photoDataUrl) { makeCircularPhoto(photoDataUrl, ringHex).then(build); }
      else { build(null); }
    } catch (e) {
      alert('Could not generate the PDF. Please try again.');
    }
  });
})();

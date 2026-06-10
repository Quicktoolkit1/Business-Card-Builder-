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

  // ---------- High quality render ----------
  function renderCanvas() {
    return html2canvas(card, { scale: 4, useCORS: true, backgroundColor: null, logging: false });
  }

  // ---------- PDF download (pixel-perfect, identical to the PNG) ----------
  // The live card is rendered to a high-resolution canvas (the same way the
  // PNG export works) and embedded into the PDF. This makes the PDF look
  // exactly like the preview: the circular photo with its border and the
  // contact icons (phone, email, website, location) are all preserved.
  document.getElementById('btn-pdf').addEventListener('click', function () {
    var jsPDF = window.jspdf.jsPDF;
    renderCanvas().then(function (canvas) {
      var imgData = canvas.toDataURL('image/png', 1.0);
      var pdfW = 89; // standard business-card width in mm
      var pdfH = pdfW * canvas.height / canvas.width; // keep the true aspect ratio
      var pdf = new jsPDF({
        orientation: pdfH > pdfW ? 'portrait' : 'landscape',
        unit: 'mm',
        format: [pdfW, pdfH]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH, undefined, 'FAST');
      pdf.save('business-card.pdf');
    });
  });

  // ---------- PNG download (high resolution) ----------
  document.getElementById('btn-png').addEventListener('click', function () {
    renderCanvas().then(function (canvas) {
      var link = document.createElement('a');
      link.download = 'business-card.png';
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    });
  });
})();

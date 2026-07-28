/* ═══════════════════════════════════════════════════════════════════════════
   CASEFILE BUILDER v2.0 — Upload Module (uploadimgur.com)
   ═══════════════════════════════════════════════════════════════════════════ */

const Upload = (() => {
  /**
   * Get the upload URL — uses local proxy server to avoid CORS issues.
   * If running from localhost (via server.py), uses relative /api/upload.
   * If running from file://, tries localhost:5000 proxy.
   */
  function getUploadUrl() {
    const loc = window.location;
    if (loc.protocol === 'http:' || loc.protocol === 'https:') {
      return '/api/upload';
    }
    // Running from file:// — try the local proxy server
    return 'http://localhost:5000/api/upload';
  }

  /**
   * Upload a blob to uploadimgur.com
   * @param {Blob} blob - The image blob to upload
   * @param {string} filename - Filename for the upload
   * @returns {Promise<string>} The uploaded image URL
   */
  async function uploadBlob(blob, filename = 'image.png') {
    const formData = new FormData();
    formData.append('image', blob, filename);

    const uploadUrl = getUploadUrl();
    let response;
    try {
      response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });
    } catch (networkErr) {
      throw new Error(
        'Network error — make sure server.py is running (python server.py)'
      );
    }

    if (!response.ok) {
      throw new Error(`Upload failed: HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.link) {
      return data.link;
    } else {
      throw new Error(data.error || 'Upload failed — no link returned');
    }
  }

  /**
   * Upload an image blob for a specific paste zone with UI feedback.
   * Opens the image editor first, then uploads the result.
   * @param {Blob} blob - The image blob
   * @param {string} zoneId - The zone identifier (e.g. 'suspectphoto', 'equipment')
   * @returns {Promise<string|null>} The uploaded URL or null
   */
  async function uploadForZone(blob, zoneId) {
    // Open image editor first
    let editedBlob;
    try {
      editedBlob = await ImageEditor.open(blob);
    } catch (e) {
      console.warn('Image editor error:', e);
      editedBlob = null;
    }

    // If user cancelled the editor, abort
    if (!editedBlob) return null;

    const zone   = document.getElementById('zone-' + zoneId);
    const status = document.getElementById('status-' + zoneId);
    const thumb  = document.getElementById('thumb-' + zoneId);
    const urlInp = document.getElementById('url-' + zoneId);

    if (!zone) return null;

    // Set uploading state
    zone.className = 'paste-zone uploading';
    status.innerHTML = '<span class="spinner"></span> UPLOADING…';

    // Show local preview
    const localURL = URL.createObjectURL(editedBlob);
    if (thumb) thumb.src = localURL;

    try {
      const url = await uploadBlob(editedBlob);
      if (urlInp) urlInp.value = url;
      zone.className = 'paste-zone done';
      status.textContent = '✓ UPLOADED';
      return url;
    } catch (err) {
      zone.className = 'paste-zone error';
      status.textContent = '✗ ' + err.message.toUpperCase().slice(0, 50);
      if (thumb) thumb.src = '';
      return null;
    }
  }

  /**
   * Extract an image file from a DataTransfer object
   * @param {DataTransfer} dt
   * @returns {File|null}
   */
  function getImageFromDataTransfer(dt) {
    if (!dt || !dt.items) return null;
    for (const item of dt.items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        return item.getAsFile();
      }
    }
    return null;
  }

  /**
   * Wire up a paste zone with paste, drag-drop, and click-to-browse handlers.
   * @param {string} zoneId - The zone identifier
   */
  function wireZone(zoneId) {
    const zone = document.getElementById('zone-' + zoneId);
    if (!zone) return;

    // Click anywhere on the zone opens file browser + focuses for paste
    zone.addEventListener('click', (e) => {
      zone.focus();
      const fileInput = zone.querySelector('input[type="file"]');
      if (fileInput) {
        fileInput.click();
      }
    });

    // Add a file input inside the zone if not present
    let fileInput = zone.querySelector('input[type="file"]');
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';
      zone.appendChild(fileInput);
    }

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file && file.type.startsWith('image/')) {
        await uploadForZone(file, zoneId);
      }
      fileInput.value = ''; // Reset for re-selection
    });

    // Paste handler
    zone.addEventListener('paste', async (e) => {
      e.preventDefault();
      const file = getImageFromDataTransfer(e.clipboardData);
      if (file) await uploadForZone(file, zoneId);
    });

    // Drag & drop
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', async (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = getImageFromDataTransfer(e.dataTransfer);
      if (file) await uploadForZone(file, zoneId);
    });
  }

  // Public API
  return {
    uploadBlob,
    uploadForZone,
    wireZone,
    getImageFromDataTransfer,
  };
})();

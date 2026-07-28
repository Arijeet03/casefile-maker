/* ═══════════════════════════════════════════════════════════════════════════
   CASEFILE BUILDER v2.0 — Image Editor (Crop / Blur / Undo / Redo)
   ═══════════════════════════════════════════════════════════════════════════ */

const ImageEditor = (() => {
  // ── State ──────────────────────────────────────────────────────────────
  let modal       = null;
  let canvas      = null;
  let ctx         = null;
  let selectionEl = null;
  let statusEl    = null;

  // Full-resolution working canvas (off-screen)
  let workCanvas  = null;
  let workCtx     = null;

  // History
  let history      = [];  // Array of ImageData
  let historyIndex = -1;
  const MAX_HISTORY = 30;

  // Tools
  let activeTool = null; // null | 'crop' | 'blur'

  // Selection drawing
  let isDrawing  = false;
  let selStart   = { x: 0, y: 0 };
  let selEnd     = { x: 0, y: 0 };
  let hasSelection = false;

  // Scale factor: display canvas vs work canvas
  let scale = 1;

  // Promise resolve callback
  let resolveCallback = null;

  // ── DOM refs (buttons) ─────────────────────────────────────────────────
  let btnCrop, btnBlur, btnApplyAction, btnUndo, btnRedo, btnDone, btnCancel;

  // ── Initialization ─────────────────────────────────────────────────────
  function init() {
    if (modal) return; // Already initialised
    createModal();
  }

  function createModal() {
    modal = document.createElement('div');
    modal.className = 'editor-modal';
    modal.id = 'imageEditorModal';
    modal.innerHTML = `
      <div class="editor-overlay" id="editorOverlay"></div>
      <div class="editor-container">
        <div class="editor-toolbar">
          <div class="editor-toolbar-group">
            <button class="editor-btn" id="edBtnCrop" title="Crop to selection">✂ Crop</button>
            <button class="editor-btn" id="edBtnBlur" title="Blur selection">◫ Blur</button>
          </div>
          <div class="editor-toolbar-group">
            <button class="editor-btn editor-btn-apply-action" id="edBtnApplyAction" disabled>▸ Apply</button>
          </div>
          <div class="editor-toolbar-group">
            <button class="editor-btn" id="edBtnUndo" title="Undo" disabled>↩ Undo</button>
            <button class="editor-btn" id="edBtnRedo" title="Redo" disabled>↪ Redo</button>
          </div>
          <div class="editor-toolbar-spacer"></div>
          <div class="editor-toolbar-group">
            <button class="editor-btn editor-btn-done" id="edBtnDone">✓ Done</button>
            <button class="editor-btn editor-btn-cancel" id="edBtnCancel">✕ Cancel</button>
          </div>
        </div>
        <div class="editor-canvas-wrap" id="editorCanvasWrap">
          <canvas id="editorCanvas"></canvas>
          <div class="editor-selection" id="editorSelection"></div>
        </div>
        <div class="editor-status" id="editorStatus">Select a tool to begin editing</div>
      </div>
    `;

    document.body.appendChild(modal);

    // Cache DOM refs
    canvas      = document.getElementById('editorCanvas');
    ctx         = canvas.getContext('2d');
    selectionEl = document.getElementById('editorSelection');
    statusEl    = document.getElementById('editorStatus');
    btnCrop     = document.getElementById('edBtnCrop');
    btnBlur     = document.getElementById('edBtnBlur');
    btnApplyAction = document.getElementById('edBtnApplyAction');
    btnUndo     = document.getElementById('edBtnUndo');
    btnRedo     = document.getElementById('edBtnRedo');
    btnDone     = document.getElementById('edBtnDone');
    btnCancel   = document.getElementById('edBtnCancel');

    // Tool buttons
    btnCrop.addEventListener('click',  () => setTool('crop'));
    btnBlur.addEventListener('click',  () => setTool('blur'));
    btnApplyAction.addEventListener('click', applyAction);
    btnUndo.addEventListener('click',  undo);
    btnRedo.addEventListener('click',  redo);
    btnDone.addEventListener('click',  done);
    btnCancel.addEventListener('click', cancel);

    // Canvas mouse events for selection
    const wrap = document.getElementById('editorCanvasWrap');
    wrap.addEventListener('mousedown',  onMouseDown);
    wrap.addEventListener('mousemove',  onMouseMove);
    wrap.addEventListener('mouseup',    onMouseUp);

    // Prevent context menu on canvas
    wrap.addEventListener('contextmenu', e => e.preventDefault());

    // Close on overlay click
    document.getElementById('editorOverlay').addEventListener('click', cancel);

    // Keyboard shortcuts
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') cancel();
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
    });
  }

  // ── Open the editor ────────────────────────────────────────────────────
  function open(blob) {
    init();

    return new Promise((resolve) => {
      resolveCallback = resolve;

      // Reset state
      history = [];
      historyIndex = -1;
      activeTool = null;
      hasSelection = false;
      isDrawing = false;
      clearSelection();
      updateToolButtons();

      // Load image
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(url);

        // Create work canvas at full resolution
        workCanvas = document.createElement('canvas');
        workCanvas.width = img.naturalWidth;
        workCanvas.height = img.naturalHeight;
        workCtx = workCanvas.getContext('2d');
        workCtx.drawImage(img, 0, 0);

        // Push initial state
        pushHistory();

        // Render to display canvas
        renderDisplay();

        // Show modal
        modal.classList.add('open');
        modal.setAttribute('tabindex', '-1');
        modal.focus();

        setStatus('Select a tool to begin editing. Draw a rectangle on the image.');
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };

      img.src = url;
    });
  }

  // ── Render work canvas to display canvas ───────────────────────────────
  function renderDisplay() {
    if (!workCanvas) return;

    const wrap = document.getElementById('editorCanvasWrap');
    const maxW = wrap.clientWidth  || 800;
    const maxH = wrap.clientHeight || 600;

    const imgW = workCanvas.width;
    const imgH = workCanvas.height;

    // Fit image within wrap
    scale = Math.min(maxW / imgW, maxH / imgH, 1);

    const dispW = Math.round(imgW * scale);
    const dispH = Math.round(imgH * scale);

    canvas.width  = dispW;
    canvas.height = dispH;
    canvas.style.width  = dispW + 'px';
    canvas.style.height = dispH + 'px';

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(workCanvas, 0, 0, imgW, imgH, 0, 0, dispW, dispH);
  }

  // ── History ────────────────────────────────────────────────────────────
  function pushHistory() {
    // Discard redo history beyond current index
    history = history.slice(0, historyIndex + 1);

    const data = workCtx.getImageData(0, 0, workCanvas.width, workCanvas.height);
    history.push(data);

    // Limit history size
    if (history.length > MAX_HISTORY) {
      history.shift();
    }

    historyIndex = history.length - 1;
    updateHistoryButtons();
  }

  function restoreHistory(index) {
    if (index < 0 || index >= history.length) return;
    const data = history[index];

    // Resize work canvas if needed (for crop undo)
    workCanvas.width  = data.width;
    workCanvas.height = data.height;
    workCtx.putImageData(data, 0, 0);

    historyIndex = index;
    updateHistoryButtons();
    clearSelection();
    renderDisplay();
  }

  function undo() {
    if (historyIndex > 0) {
      restoreHistory(historyIndex - 1);
      setStatus('Undo');
    }
  }

  function redo() {
    if (historyIndex < history.length - 1) {
      restoreHistory(historyIndex + 1);
      setStatus('Redo');
    }
  }

  function updateHistoryButtons() {
    btnUndo.disabled = historyIndex <= 0;
    btnRedo.disabled = historyIndex >= history.length - 1;
  }

  // ── Tools ──────────────────────────────────────────────────────────────
  function setTool(tool) {
    if (activeTool === tool) {
      // Toggle off
      activeTool = null;
    } else {
      activeTool = tool;
    }
    clearSelection();
    updateToolButtons();

    if (activeTool === 'crop') {
      setStatus('CROP MODE — Draw a rectangle on the image to define crop area');
      canvas.style.cursor = 'crosshair';
    } else if (activeTool === 'blur') {
      setStatus('BLUR MODE — Draw a rectangle on the area you want to blur');
      canvas.style.cursor = 'crosshair';
    } else {
      setStatus('Select a tool to begin editing');
      canvas.style.cursor = 'default';
    }
  }

  function updateToolButtons() {
    btnCrop.classList.toggle('active', activeTool === 'crop');
    btnBlur.classList.toggle('active', activeTool === 'blur');
    btnApplyAction.disabled = !hasSelection || !activeTool;

    if (activeTool && hasSelection) {
      btnApplyAction.textContent = activeTool === 'crop' ? '▸ Crop' : '▸ Blur';
    } else {
      btnApplyAction.textContent = '▸ Apply';
    }
  }

  // ── Mouse events for selection ─────────────────────────────────────────
  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function onMouseDown(e) {
    if (!activeTool || e.button !== 0) return;
    const coords = getCanvasCoords(e);

    // Check if click is within canvas bounds
    if (coords.x < 0 || coords.y < 0 || coords.x > canvas.width || coords.y > canvas.height) return;

    isDrawing = true;
    selStart = { ...coords };
    selEnd = { ...coords };
    hasSelection = false;
    updateSelectionUI();
    updateToolButtons();
  }

  function onMouseMove(e) {
    if (!isDrawing) return;
    selEnd = getCanvasCoords(e);
    updateSelectionUI();
  }

  function onMouseUp(e) {
    if (!isDrawing) return;
    isDrawing = false;
    selEnd = getCanvasCoords(e);

    // Check minimum selection size
    const w = Math.abs(selEnd.x - selStart.x);
    const h = Math.abs(selEnd.y - selStart.y);

    if (w > 5 && h > 5) {
      hasSelection = true;
      setStatus(`Selection: ${Math.round(w)}×${Math.round(h)}px — Click "${activeTool === 'crop' ? 'Crop' : 'Blur'}" to apply`);
    } else {
      hasSelection = false;
      clearSelection();
      setStatus(`Selection too small. Draw a larger rectangle.`);
    }

    updateToolButtons();
  }

  function updateSelectionUI() {
    if (!activeTool) { clearSelection(); return; }

    const x = Math.min(selStart.x, selEnd.x);
    const y = Math.min(selStart.y, selEnd.y);
    const w = Math.abs(selEnd.x - selStart.x);
    const h = Math.abs(selEnd.y - selStart.y);

    // Position relative to canvas inside wrap
    const canvasRect = canvas.getBoundingClientRect();
    const wrapRect   = canvas.parentElement.getBoundingClientRect();

    const offsetX = canvasRect.left - wrapRect.left;
    const offsetY = canvasRect.top  - wrapRect.top;

    selectionEl.style.display = (w > 2 || h > 2) ? 'block' : 'none';
    selectionEl.style.left   = (offsetX + x) + 'px';
    selectionEl.style.top    = (offsetY + y) + 'px';
    selectionEl.style.width  = w + 'px';
    selectionEl.style.height = h + 'px';
  }

  function clearSelection() {
    hasSelection = false;
    selectionEl.style.display = 'none';
    updateToolButtons();
  }

  // ── Actions ────────────────────────────────────────────────────────────
  function applyAction() {
    if (!hasSelection || !activeTool) return;

    if (activeTool === 'crop') {
      applyCrop();
    } else if (activeTool === 'blur') {
      applyBlur();
    }
  }

  function applyCrop() {
    // Convert display coords to work canvas coords
    const x = Math.round(Math.min(selStart.x, selEnd.x) / scale);
    const y = Math.round(Math.min(selStart.y, selEnd.y) / scale);
    const w = Math.round(Math.abs(selEnd.x - selStart.x) / scale);
    const h = Math.round(Math.abs(selEnd.y - selStart.y) / scale);

    if (w < 2 || h < 2) return;

    // Clamp to bounds
    const cx = Math.max(0, x);
    const cy = Math.max(0, y);
    const cw = Math.min(w, workCanvas.width - cx);
    const ch = Math.min(h, workCanvas.height - cy);

    // Get cropped region
    const imageData = workCtx.getImageData(cx, cy, cw, ch);

    // Resize work canvas
    workCanvas.width  = cw;
    workCanvas.height = ch;
    workCtx.putImageData(imageData, 0, 0);

    pushHistory();
    clearSelection();
    renderDisplay();
    setStatus('Cropped! Draw another selection or click Done.');
  }

  function applyBlur() {
    // Convert display coords to work canvas coords
    const x = Math.round(Math.min(selStart.x, selEnd.x) / scale);
    const y = Math.round(Math.min(selStart.y, selEnd.y) / scale);
    const w = Math.round(Math.abs(selEnd.x - selStart.x) / scale);
    const h = Math.round(Math.abs(selEnd.y - selStart.y) / scale);

    if (w < 2 || h < 2) return;

    // Clamp
    const bx = Math.max(0, x);
    const by = Math.max(0, y);
    const bw = Math.min(w, workCanvas.width - bx);
    const bh = Math.min(h, workCanvas.height - by);

    // Blur the region using a temp canvas + CSS filter
    const blurRadius = Math.max(8, Math.round(Math.min(bw, bh) / 10));

    // Copy entire canvas to temp (source for blur)
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width  = workCanvas.width;
    tempCanvas.height = workCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(workCanvas, 0, 0);

    // Apply blur to the selection region on work canvas
    workCtx.save();
    workCtx.beginPath();
    workCtx.rect(bx, by, bw, bh);
    workCtx.clip();
    workCtx.filter = `blur(${blurRadius}px)`;
    workCtx.drawImage(tempCanvas, 0, 0);
    workCtx.restore();

    pushHistory();
    clearSelection();
    renderDisplay();
    setStatus('Region blurred! Draw another selection or click Done.');
  }

  // ── Done / Cancel ──────────────────────────────────────────────────────
  function done() {
    // Export work canvas as blob
    workCanvas.toBlob((blob) => {
      closeModal();
      if (resolveCallback) resolveCallback(blob);
      resolveCallback = null;
    }, 'image/png');
  }

  function cancel() {
    closeModal();
    if (resolveCallback) resolveCallback(null);
    resolveCallback = null;
  }

  function closeModal() {
    if (modal) modal.classList.remove('open');
    clearSelection();
    activeTool = null;
    canvas.style.cursor = 'default';
  }

  // ── Status bar ─────────────────────────────────────────────────────────
  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  // ── Public API ─────────────────────────────────────────────────────────
  return {
    open,
    init,
  };
})();

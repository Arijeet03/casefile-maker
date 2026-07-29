/* ═══════════════════════════════════════════════════════════════════════════
   CASEFILE BUILDER v2.0 — Core Application Logic
   ═══════════════════════════════════════════════════════════════════════════ */

// ── CHARGE PRESETS ──────────────────────────────────────────────────────────
const CHARGE_PRESETS = [
  'Aiding & Abetting',
  'Aiding a prison break',
  'Assault',
  'Attempted Murder',
  'Battery',
  'Brandishing a firearm in public',
  'Bribery',
  'Conspiracy',
  'Criminal Tresspassing',
  'Cultivation of a controlled substance',
  'Delivery of a controlled substance',
  'Destruction of Public Property',
  'Discharge of a Firearm in Public',
  'Domestic Terrorism',
  'Evading a law enforcement officer',
  'Extortion',
  'FCC Violation',
  'Failure to pay a ticket',
  'Failure to Identify',
  'Flight Protocol Violation',
  'Fraud',
  'Grand Theft Auto',
  'Impersonating a Government Employee',
  'Indecency',
  'Kidnapping',
  'Manufacture of a controlled substance',
  'Misuse of 911 Hotline',
  'Murder',
  'Mutual Combat',
  'Obstructing a Government Employee',
  'Operating a vehicle without a license',
  'Pandering/Pimping',
  'Possession of Illegal Firearms',
  'Possession of controlled substances',
  'Possession of controlled substances with ITS',
  'Prison Break',
  'Prostitution',
  'Reckless Driving',
  'Resisting a law enforcement officer',
  'Riot',
  'Robbery',
  'Sexual Assault',
  'Sexual Battery',
  'Torture',
  'Transport of illegal goods',
  'Unlawful Distribution of a weapon',
  'Vandalism',
  'Vehicular Assault',
];

const CHARGE_LABELS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'];

// ── IMAGE ZONES ─────────────────────────────────────────────────────────────
const IMAGE_ZONES = ['suspectphoto', 'equipment', 'id1', 'id2', 'id3', 'bgcheck'];
// Evidence image zones: ev-img-1 through ev-img-6 (wired separately)

// ══════════════════════════════════════════════════════════════════════════════
// ── INITIALIZATION ──────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initDate();
  initAgentPersist();
  buildCharges();
  buildEvidence();
  wireImageZones();
  wireEvidenceZones();
  initPassportAutoLink();
  initSettings();
  initDeclaration();
  // initAutoFill();
  initGenerate();
  initCopy();
});

// ── DATE AUTO-FILL ──────────────────────────────────────────────────────────
function initDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const dateEl = document.getElementById('caseDate');
  if (dateEl) dateEl.value = `${y}-${m}-${d}`;
}

// ── AGENT NAME PERSIST ──────────────────────────────────────────────────────
function initAgentPersist() {
  const agentInput = document.getElementById('agentName');
  const saved = localStorage.getItem('casefile_agent_name');
  if (saved && agentInput) agentInput.value = saved;

  if (agentInput) {
    agentInput.addEventListener('input', () => {
      const v = agentInput.value.trim();
      v ? localStorage.setItem('casefile_agent_name', v)
        : localStorage.removeItem('casefile_agent_name');
    });
  }
}

// ── BUILD CHARGE COMBOBOXES ─────────────────────────────────────────────────
function buildCharges() {
  const grid = document.getElementById('chargesGrid');
  if (!grid) return;

  for (let i = 0; i < 6; i++) {
    grid.appendChild(buildCombobox(i));
  }
}

function buildCombobox(index) {
  const num   = index + 1;
  const label = CHARGE_LABELS[index];

  const wrap = document.createElement('div');
  wrap.className = 'charge-item';

  const lbl = document.createElement('label');
  lbl.textContent = `Charge ${label}`;
  wrap.appendChild(lbl);

  const comboWrap = document.createElement('div');
  comboWrap.className = 'combo-wrap';

  const input = document.createElement('input');
  input.type = 'text';
  input.id = `charge${num}`;
  input.className = 'combo-input';
  input.placeholder = 'Pick or type a charge…';
  input.autocomplete = 'off';

  const arrow = document.createElement('div');
  arrow.className = 'combo-arrow';
  arrow.innerHTML = '▾';

  const dropdown = document.createElement('div');
  dropdown.className = 'combo-dropdown';

  let highlighted = -1;

  function renderOptions(filter) {
    dropdown.innerHTML = '';
    highlighted = -1;
    const q = (filter || '').toLowerCase();
    const matches = CHARGE_PRESETS.filter(c => !q || c.toLowerCase().includes(q));

    if (matches.length === 0) {
      const none = document.createElement('div');
      none.className = 'combo-option no-match';
      none.textContent = 'No matches — keep typing your custom charge';
      dropdown.appendChild(none);
      return;
    }

    matches.forEach((charge) => {
      const opt = document.createElement('div');
      opt.className = 'combo-option';
      opt.textContent = charge;
      opt.addEventListener('mousedown', (e) => {
        e.preventDefault();
        input.value = charge;
        input.classList.add('has-value');
        closeDropdown();
        updateEvidenceLabel(num);
      });
      dropdown.appendChild(opt);
    });
  }

  function openDropdown() {
    renderOptions(input.value);
    dropdown.classList.add('open');
  }

  function closeDropdown() {
    dropdown.classList.remove('open');
    highlighted = -1;
    input.classList.toggle('has-value', input.value.trim() !== '');
  }

  input.addEventListener('focus', () => openDropdown());
  input.addEventListener('input', () => {
    input.classList.remove('has-value');
    renderOptions(input.value);
    if (!dropdown.classList.contains('open')) dropdown.classList.add('open');
    updateEvidenceLabel(num);
  });

  input.addEventListener('keydown', (e) => {
    const opts = dropdown.querySelectorAll('.combo-option:not(.no-match)');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlighted = Math.min(highlighted + 1, opts.length - 1);
      opts.forEach((o, i) => o.classList.toggle('highlighted', i === highlighted));
      if (opts[highlighted]) opts[highlighted].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlighted = Math.max(highlighted - 1, 0);
      opts.forEach((o, i) => o.classList.toggle('highlighted', i === highlighted));
      if (opts[highlighted]) opts[highlighted].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      if (highlighted >= 0 && opts[highlighted]) {
        input.value = opts[highlighted].textContent;
        input.classList.add('has-value');
        closeDropdown();
        updateEvidenceLabel(num);
      } else if (input.value.trim()) {
        input.classList.add('has-value');
        closeDropdown();
        updateEvidenceLabel(num);
      }
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });

  input.addEventListener('blur', () => setTimeout(() => {
    closeDropdown();
    updateEvidenceLabel(num);
  }, 150));

  arrow.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (dropdown.classList.contains('open')) {
      closeDropdown();
    } else {
      input.focus();
      openDropdown();
    }
  });

  comboWrap.appendChild(input);
  comboWrap.appendChild(arrow);
  comboWrap.appendChild(dropdown);
  wrap.appendChild(comboWrap);
  return wrap;
}

// Close all dropdowns on outside click
document.addEventListener('mousedown', (e) => {
  if (!e.target.closest('.combo-wrap')) {
    document.querySelectorAll('.combo-dropdown.open').forEach(d => d.classList.remove('open'));
  }
});

// ── BUILD EVIDENCE SECTIONS ─────────────────────────────────────────────────
function buildEvidence() {
  const container = document.getElementById('evidenceBlocks');
  if (!container) return;

  for (let i = 1; i <= 6; i++) {
    container.appendChild(createEvidenceBlock(i));
  }
}

function createEvidenceBlock(num) {
  const label = CHARGE_LABELS[num - 1];
  const block = document.createElement('div');
  block.className = 'evidence-block';
  block.id = `evidence-block-${num}`;

  block.innerHTML = `
    <div class="evidence-block-header">
      <span class="evidence-charge-label">Charge ${label}</span>
      <span class="evidence-charge-name" id="ev-charge-name-${num}"></span>
    </div>
    <div class="evidence-block-body">
      <div class="evidence-field">
        <label>📷 Image Evidence</label>
        <div class="paste-zone" id="zone-ev-img-${num}" tabindex="0">
          <img class="paste-zone-thumb" id="thumb-ev-img-${num}" src="" alt="">
          <div class="paste-zone-overlay">
            <div class="paste-zone-icon" style="font-size:18px;">📷</div>
            <div class="paste-zone-hint" style="font-size:9px;">PASTE / DROP / CLICK</div>
            <div class="paste-zone-status" id="status-ev-img-${num}"></div>
          </div>
        </div>
        <input type="text" class="paste-zone-url" id="url-ev-img-${num}" placeholder="or type image URL…">
      </div>
      <div class="evidence-field">
        <label>🎬 Video Link</label>
        <input type="text" id="ev-video-${num}" placeholder="Paste video URL…" style="margin-bottom:8px;">
        <label>📝 Additional Notes</label>
        <textarea id="ev-text-${num}" placeholder="Any additional text (won't be wrapped)…" rows="2"></textarea>
      </div>
    </div>
  `;

  return block;
}

function updateEvidenceLabel(num) {
  const chargeInput = document.getElementById(`charge${num}`);
  const nameEl = document.getElementById(`ev-charge-name-${num}`);
  if (chargeInput && nameEl) {
    const v = chargeInput.value.trim();
    nameEl.textContent = v ? `— ${v}` : '';
  }
}

// ── WIRE IMAGE ZONES ────────────────────────────────────────────────────────
function wireImageZones() {
  IMAGE_ZONES.forEach(id => Upload.wireZone(id));
}

function wireEvidenceZones() {
  for (let i = 1; i <= 6; i++) {
    Upload.wireZone(`ev-img-${i}`);
  }
}

// ── PASSPORT AUTO-LINK ──────────────────────────────────────────────────────
function initPassportAutoLink() {
  const suspectInput = document.getElementById('suspectName');
  const preview      = document.getElementById('passportPreview');
  const urlInput     = document.getElementById('passportUrl');

  if (!suspectInput || !preview) return;

  function update() {
    const name = suspectInput.value.trim();
    if (name) {
      const nameLower = name.toLowerCase();
      const url = `https://signature.hzgaming.net/sig.php?name=${nameLower}&style=1`;
      preview.innerHTML = `<img src="${url}" alt="Passport Signature" style="max-width:100%;height:auto;">`;
      preview.classList.add('active');
      if (urlInput) {
        urlInput.value = url;
      }
    } else {
      preview.innerHTML = '<span class="passport-placeholder">Enter suspect name to auto-generate passport</span>';
      preview.classList.remove('active');
      if (urlInput) {
        urlInput.value = '';
      }
    }
  }

  suspectInput.addEventListener('input', update);

  // When passport URL is manually edited, update the preview to match
  if (urlInput) {
    urlInput.addEventListener('input', () => {
      const manualUrl = urlInput.value.trim();
      if (manualUrl) {
        preview.innerHTML = `<img src="${manualUrl}" alt="Passport Signature" style="max-width:100%;height:auto;">`;
        preview.classList.add('active');
      }
    });
  }

  // Initial update (in case auto-filled)
  setTimeout(update, 300);
}

// ── DECLARATION AUTO-FILL ───────────────────────────────────────────────────
function initDeclaration() {
  const agentInput   = document.getElementById('agentName');
  const declaration  = document.getElementById('declaration');
  if (!agentInput || !declaration) return;

  function updateDeclaration() {
    const raw = agentInput.value.trim();
    const match = raw.match(/\(([^)]+)\)/);
    
    const storedOoc = localStorage.getItem('casefile_ooc_name') || '';
    const storedRank = localStorage.getItem('casefile_rank') || 'Agent';
    
    const oocName = match ? match[1] : (storedOoc || raw || 'Agent');
    if (!declaration.dataset.edited) {
      declaration.value = buildDeclaration(oocName, storedRank);
    }
  }

  agentInput.addEventListener('input', updateDeclaration);
  declaration.addEventListener('input', function () {
    this.dataset.edited = 'true';
  });

  updateDeclaration();
}

function buildDeclaration(oocName, rank) {
  const agentRank = rank || 'Agent';
  return `I ${oocName} in working for the Federal Bureau of Investigation under the Major Crimes Division as a(n) ${agentRank} hereby declare that all of the information stated in the making of this Casefile and the evidence acquired in order to bring this criminal to justice was legitimately obtained. I state that I am willing to hold any and all responsibility regarding any questions or concerns regarding this Casefile and that I fully understand the consequences I shall face if any of the aforementioned information mentioned and/or the evidence acquired, was purposely entered incorrectly. I also am fully aware of the consequences I shall face if any of the information given is disclosed to any members of the public, or any member of Law Enforcement who is not working under the Federal Bureau of Investigation.\nSigned, ${oocName}\nFederal Bureau of Investigation Head Quarters\nRodeo\nLos Santos`;
}

// ── SETTINGS ────────────────────────────────────────────────────────────────
function initSettings() {
  const btnSettings = document.getElementById('btnSettings');
  const modal = document.getElementById('settingsModal');
  const overlay = document.getElementById('settingsOverlay');
  const btnSave = document.getElementById('btnSaveSettings');
  const btnCancel = document.getElementById('btnCancelSettings');
  const inpOoc = document.getElementById('setOocName');
  const inpRank = document.getElementById('setRank');
  const agentInput = document.getElementById('agentName');

  // Load saved settings
  const storedOoc = localStorage.getItem('casefile_ooc_name') || '';
  const storedRank = localStorage.getItem('casefile_rank') || '';
  
  // Auto-fill agent name if empty
  if (storedOoc && agentInput && !agentInput.value.trim()) {
    agentInput.value = ` (${storedOoc})`;
  }

  if (btnSettings && modal) {
    btnSettings.addEventListener('click', () => {
      inpOoc.value = localStorage.getItem('casefile_ooc_name') || '';
      inpRank.value = localStorage.getItem('casefile_rank') || '';
      modal.classList.add('open');
    });

    const close = () => modal.classList.remove('open');
    if (overlay) overlay.addEventListener('click', close);
    if (btnCancel) btnCancel.addEventListener('click', close);

    if (btnSave) {
      btnSave.addEventListener('click', () => {
        const ooc = inpOoc.value.trim();
        const rank = inpRank.value.trim();
        
        localStorage.setItem('casefile_ooc_name', ooc);
        localStorage.setItem('casefile_rank', rank);
        
        // Auto-fill agent name if they just set an OOC name and the agent field doesn't have it
        if (ooc && agentInput && !agentInput.value.includes(`(${ooc})`)) {
          if (!agentInput.value.trim()) {
            agentInput.value = ` (${ooc})`;
          } else if (!agentInput.value.includes('(')) {
            agentInput.value = `${agentInput.value.trim()} (${ooc})`;
          }
        }
        
        // Trigger declaration update
        const ev = new Event('input');
        if (agentInput) agentInput.dispatchEvent(ev);
        
        close();
      });
    }
  }
}

// ── AUTO-FILL FROM casefile_data.js ─────────────────────────────────────────
/*
/*
function initAutoFill() {
  const name  = (typeof window.CASEFILE_NAME  !== 'undefined') ? window.CASEFILE_NAME  : '';
  const phone = (typeof window.CASEFILE_PHONE !== 'undefined') ? window.CASEFILE_PHONE : '';
  const org   = (typeof window.CASEFILE_ORG   !== 'undefined') ? window.CASEFILE_ORG   : '';

  if (!name && !phone && !org) return;

  function flashField(el) {
    el.style.borderColor = '#6bffb8';
    el.style.boxShadow   = '0 0 0 3px rgba(107,255,184,0.35)';
    el.style.transition  = 'border-color 0.3s, box-shadow 0.3s';
    setTimeout(() => {
      el.style.borderColor = '';
      el.style.boxShadow   = '';
    }, 2500);
  }

  if (name) {
    const el = document.getElementById('suspectName');
    if (el) { el.value = name; flashField(el); }
  }
  if (phone) {
    const el = document.getElementById('suspectPhone');
    if (el) { el.value = phone; flashField(el); }
  }
  if (org) {
    const el = document.getElementById('accomplices');
    if (el) { el.value = org; flashField(el); }
  }

  // Flash the suspect card
  const cards = document.querySelectorAll('.card');
  if (cards[1]) {
    cards[1].style.transition = 'border-top-color 0.3s, box-shadow 0.3s';
    cards[1].style.borderTopColor = 'var(--success)';
    cards[1].style.boxShadow = '0 0 28px rgba(107,255,184,0.2)';
    setTimeout(() => {
      cards[1].style.borderTopColor = '';
      cards[1].style.boxShadow = '';
    }, 2500);
    setTimeout(() => cards[1].scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
  }

  // Toast notification
  showToast('▸ SUSPECT AUTO-FILLED');

  // Trigger passport update
  setTimeout(() => {
    const suspectInput = document.getElementById('suspectName');
    if (suspectInput) suspectInput.dispatchEvent(new Event('input'));
  }, 400);
}
*/

// ── TOAST ───────────────────────────────────────────────────────────────────
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}

// ── HELPERS ─────────────────────────────────────────────────────────────────
function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function getImgUrl(id) {
  const urlInp = document.getElementById('url-' + id);
  return urlInp ? urlInp.value.trim() : '';
}

function formatDateBBCode(dateStr) {
  if (!dateStr) return 'DD, Month YYYY';
  const [y, m, d] = dateStr.split('-');
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${parseInt(d, 10)}, ${months[parseInt(m, 10) - 1]} ${y}`;
}

// ── EVIDENCE BUILDER ────────────────────────────────────────────────────────
function buildEvidenceBBCode(num) {
  const imgUrl   = getImgUrl(`ev-img-${num}`);
  const videoUrl = val(`ev-video-${num}`);
  const text     = val(`ev-text-${num}`);

  const parts = [];

  if (imgUrl && imgUrl !== '-') {
    parts.push(`[img]${imgUrl}[/img]`);
  }
  if (videoUrl && videoUrl !== '-') {
    parts.push(`[video]${videoUrl}[/video]`);
  }
  if (text && text !== '-') {
    parts.push(text);
  }

  return parts.length > 0 ? parts.join('\n') : '-';
}

// ── GENERATE BBCODE ─────────────────────────────────────────────────────────
function initGenerate() {
  const btn = document.getElementById('btnGenerate');
  if (btn) btn.addEventListener('click', generateBBCode);
}

function generateBBCode() {
  const caseDate     = formatDateBBCode(document.getElementById('caseDate').value);
  const agentName    = val('agentName') || 'N/A';
  const suspectName  = val('suspectName') || 'N/A';
  const suspectPhone = val('suspectPhone') || 'N/A';
  const accomplices  = val('accomplices') || '-';
  const recProcess   = val('recProcess') || '-';
  const declaration  = val('declaration') || '';

  const suspectPhoto = getImgUrl('suspectphoto') || 'LINK';
  const equipmentImg = getImgUrl('equipment') || 'LINK';
  const id1Img       = getImgUrl('id1') || '';
  const id2Img       = getImgUrl('id2') || '';
  const id3Img       = getImgUrl('id3') || 'LINK';
  const bgcheckImg   = getImgUrl('bgcheck') || 'LINK';

  // Passport — read from editable input field (auto-filled or manually edited)
  const passportUrl = val('passportUrl') || 'LINK';

  const charges = [1, 2, 3, 4, 5, 6].map(i => val('charge' + i));

  // Build identification spoiler lines
  let idLines = '';
  if (id1Img) idLines += `[img]${id1Img}[/img]\n`;
  if (id2Img) idLines += `[img]${id2Img}[/img]\n`;
  idLines += `[img]${id3Img}[/img]`;

  // Build evidence blocks
  const ev = (i) => buildEvidenceBBCode(i + 1);

  const code =
`[CENTER][SIZE=5][COLOR=Black][B]Casefile[/B][/SIZE][/COLOR]
[IMG]https://i.imgur.com/ndAN0Ss.png?1[/IMG][/CENTER]
[U][SIZE=3]Agent Information[/U][/SIZE]
[INDENT][I][/INDENT][/I][B]Date of Casefile[/B]
[INDENT][I]${caseDate}[/INDENT][/I][B]Operating Agent(s)[/B]
[INDENT][I]${agentName}[/INDENT][/I]
[U][SIZE=3]Suspect Information[/U][/SIZE]
[INDENT][I][/INDENT][/I][B]Full Name[/B]
[INDENT][I]${suspectName}[/INDENT][/I][B]Suspect's Phone Number[/B]
[INDENT][I]${suspectPhone}[/INDENT][/I][B]Photograph of Suspect[/B]
[INDENT][I][img]${suspectPhoto}[/img][/INDENT][/I][B]Known Accomplices[/B]
[INDENT][I]${accomplices}[/INDENT][/I][B]Background Check[/B]
[INDENT][I]Equipment: 
[spoiler][img]${equipmentImg}[/img][/spoiler]
Identification:
[spoiler]${idLines}[/spoiler]
Passport:
[img]${passportUrl}[/img]
Background Check:
[spoiler][img]${bgcheckImg}[/img][/spoiler][/INDENT][/I]
[U][SIZE=3]Charges[/U][/SIZE]
[INDENT][I][/INDENT][/I][B]Charge one[/B]
[INDENT][I]${charges[0]}[/INDENT][/I][B]Charge two[/B]
[INDENT][I]${charges[1]}[/INDENT][/I][B]Charge three[/B]
[INDENT][I]${charges[2]}[/INDENT][/I][B]Charge four[/B]
[INDENT][I]${charges[3]}[/INDENT][/I][B]Charge five[/B]
[INDENT][I]${charges[4]}[/INDENT][/I][B]Charge six[/B]
[INDENT][I]${charges[5]}[/INDENT][/I]
[U][SIZE=3]Photographic and/or video-recorded Evidence[/U][/SIZE]
[B]Evidence of Charge one[/B][INDENT][I]${ev(0)}[/INDENT][/I]
[B]Evidence of Charge two[/B][INDENT][I]${ev(1)}[/INDENT][/I]
[B]Evidence of Charge three[/B][INDENT][I]${ev(2)}[/INDENT][/I]
[B]Evidence of Charge four[/B][INDENT][I]${ev(3)}[/INDENT][/I]
[B]Evidence of Charge five[/B][INDENT][I]${ev(4)}[/INDENT][/I]
[B]Evidence of Charge six[/B][INDENT][I]${ev(5)}[/INDENT][/I]
[INDENT][I][/INDENT][/I]
[U][SIZE=3]Further Information[/U][/SIZE]
[INDENT][I][/INDENT][/I][B]Recommended Process[/B]
[INDENT][I]${recProcess}[/INDENT][/I][B]Official Declaration[/B]
[INDENT][I]${declaration}[/INDENT][/I]`;

  document.getElementById('outputBox').textContent = code;
  
  const title = `${agentName} - ${caseDate} - ${suspectName}`;
  const titleBox = document.getElementById('titleBox');
  if (titleBox) titleBox.textContent = title;

  const section = document.getElementById('outputSection');
  section.classList.add('show');

  const now = new Date();
  document.getElementById('statusText').textContent =
    `CASEFILE GENERATED — ${now.toLocaleTimeString()} — ${code.length} CHARS`;

  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── COPY ────────────────────────────────────────────────────────────────────
function initCopy() {
  const btn = document.getElementById('copyBtn');
  if (btn) btn.addEventListener('click', copyCode);
  
  const titleBtn = document.getElementById('copyTitleBtn');
  if (titleBtn) titleBtn.addEventListener('click', copyTitle);
}

function copyCode() {
  const code = document.getElementById('outputBox').textContent;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = '✓ COPIED!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'COPY CODE';
      btn.classList.remove('copied');
    }, 2500);
  });
}

function copyTitle() {
  const titleBox = document.getElementById('titleBox');
  if (!titleBox) return;
  const title = titleBox.textContent;
  navigator.clipboard.writeText(title).then(() => {
    const btn = document.getElementById('copyTitleBtn');
    if (btn) {
      btn.textContent = '✓ COPIED!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = 'COPY TITLE';
        btn.classList.remove('copied');
      }, 2500);
    }
  });
}

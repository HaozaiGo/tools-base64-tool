/* === Base64 Tool - App Logic === */

function uiText(en, zh) {
  return document.documentElement.lang.startsWith('zh') ? zh : en;
}

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initDirectionButtons();
  initAutoProcess();
  initFileUpload();
});

/* ---- State ---- */
let currentTab = 'text';
let currentDir = 'encode';
let currentFile = null;

/* ---- Tab Switching ---- */
function initTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
}

function switchTab(tabId) {
  currentTab = tabId;
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabId);
    t.setAttribute('aria-selected', t.dataset.tab === tabId ? 'true' : 'false');
    t.tabIndex = t.dataset.tab === tabId ? 0 : -1;
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.hidden = p.id !== 'panel-' + tabId;
    p.classList.toggle('active', p.id === 'panel-' + tabId);
  });
}

/* ---- Direction Buttons ---- */
function initDirectionButtons() {
  document.querySelectorAll('.dir-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dir-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentDir = btn.dataset.dir;
      updateDirectionUI();
      autoProcess();
    });
  });
}

function updateDirectionUI() {
  const input = document.getElementById('text-input');
  if (currentDir === 'encode') {
    input.placeholder = uiText('Paste text to encode...', '粘贴要编码的文本...');
  } else {
    input.placeholder = uiText('Paste a Base64 string...', '粘贴 Base64 字符串...');
  }
}

/* ---- Auto Process ---- */
function initAutoProcess() {
  document.getElementById('text-input').addEventListener('input', autoProcess);
  document.getElementById('opt-urlsafe').addEventListener('change', autoProcess);
  document.getElementById('opt-wrap').addEventListener('change', autoProcess);
}

let processTimer;
function autoProcess() {
  clearTimeout(processTimer);
  processTimer = setTimeout(processText, 300);
}

/* ---- Process Text ---- */
function processText() {
  const input = document.getElementById('text-input').value;
  if (!input) {
    document.getElementById('text-output').value = '';
    document.getElementById('input-size').textContent = '0 B';
    document.getElementById('output-size').textContent = '0 B';
    document.getElementById('text-status').className = 'status-bar';
    return;
  }

  const inBytes = new Blob([input]).size;
  document.getElementById('input-size').textContent = formatBytes(inBytes);

  try {
    let output;
    if (currentDir === 'encode') {
      output = encodeBase64(input);
    } else {
      output = decodeBase64(input);
    }

    document.getElementById('text-output').value = output;
    const outBytes = new Blob([output]).size;
    document.getElementById('output-size').textContent = formatBytes(outBytes);

    const status = document.getElementById('text-status');
    if (currentDir === 'encode') {
      const ratio = ((1 - outBytes / inBytes) * 100).toFixed(1);
      const growth = parseFloat(ratio);
      showStatus(status, uiText('Encoded: ', '编码完成: ') + `${formatBytes(inBytes)} → ${formatBytes(outBytes)} (+${Math.abs(growth)}%)`, 'success');
    } else {
      showStatus(status, uiText('Decoded: ', '解码完成: ') + `${formatBytes(inBytes)} → ${formatBytes(outBytes)}`, 'success');
    }
  } catch (e) {
    document.getElementById('text-output').value = '';
    document.getElementById('output-size').textContent = '0 B';
    const status = document.getElementById('text-status');
    showStatus(status, `❌ ${e.message}`, 'error');
  }
}

function encodeBase64(str) {
  // Use UTF-8 encoding for non-ASCII
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  let b64 = btoa(binary);

  if (document.getElementById('opt-urlsafe').checked) {
    b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  if (document.getElementById('opt-wrap').checked) {
    return wrapBase64(b64);
  }
  return b64;
}

function parseBase64(str) {
  let cleaned = str.trim();
  let mimeType = '';
  if (/^data:/i.test(cleaned)) {
    const match = cleaned.match(/^data:([^,]*);base64,([\s\S]*)$/i);
    if (!match) throw new Error(uiText('Invalid Base64 Data URI', '无效的 Base64 Data URI'));
    mimeType = match[1].split(';')[0] || 'text/plain';
    cleaned = match[2];
  }

  // Remove whitespace
  cleaned = cleaned.replace(/\s/g, '');

  // Handle URL-safe base64
  cleaned = cleaned.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding
  while (cleaned.length % 4 !== 0) cleaned += '=';

  // Validate
  if (!/^[A-Za-z0-9+/]*=*$/.test(cleaned)) {
    throw new Error(uiText('Invalid Base64 string (illegal characters)', '无效的 Base64 字符串（包含非法字符）'));
  }
  return { cleaned, mimeType };
}

function decodeBase64(str) {
  const { cleaned } = parseBase64(str);

  try {
    const binary = atob(cleaned);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decoder = new TextDecoder('utf-8', { fatal: true });
    return decoder.decode(bytes);
  } catch (e) {
    // Try to decode as raw bytes anyway
    try {
      const binary = atob(cleaned);
      // Check if it looks like binary data
      let hasNonText = false;
      for (let i = 0; i < Math.min(binary.length, 100); i++) {
        const code = binary.charCodeAt(i);
        if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
          hasNonText = true;
          break;
        }
      }
      if (hasNonText) {
        throw new Error(uiText('Binary data: use the Image/File tab to restore a file', '解码后的数据不是可读文本，请使用"图片/文件"标签页还原为文件'));
      }
      // Return raw latin-1
      return binary;
    } catch (err) {
      throw new Error(uiText('Decoding failed: ', '解码失败: ') + err.message);
    }
  }
}

function wrapBase64(str) {
  const result = [];
  for (let i = 0; i < str.length; i += 76) {
    result.push(str.substring(i, i + 76));
  }
  return result.join('\n');
}

/* ======== Image/File Tab ======== */
function initFileUpload() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFile(e.dataTransfer.files[0]);
  });
}

function handleFile(file) {
  if (!file) return;
  currentFile = file;

  // Show file info
  document.getElementById('file-info').style.display = 'block';
  document.getElementById('file-name').textContent = file.name;
  document.getElementById('file-type').textContent = file.type || uiText('Unknown', '未知');
  document.getElementById('file-size-info').textContent = formatBytes(file.size);

  // Preview for images
  const preview = document.getElementById('file-preview');
  const status = document.getElementById('file-status');
  preview.replaceChildren();
  document.getElementById('b64-output').value = '';
  document.getElementById('data-uri-output').value = '';
  document.getElementById('b64-size').textContent = '0 B';
  showStatus(status, uiText('Loading: ', '正在加载: ') + file.name, 'info');
  const reader = new FileReader();
  reader.onload = () => {
    if (currentFile !== file) return;
    const dataUri = reader.result;
    const b64 = dataUri.slice(dataUri.indexOf(',') + 1);
    document.getElementById('b64-output').value = b64;
    document.getElementById('b64-size').textContent = formatBytes(new Blob([b64]).size);
    document.getElementById('data-uri-output').value = dataUri;
    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.alt = file.name;
      img.src = dataUri;
      preview.appendChild(img);
    } else {
      const info = document.createElement('div');
      info.style.cssText = 'padding:20px;color:var(--text-muted)';
      info.textContent = file.name + uiText(' (Base64 generated)', '（Base64 已生成）');
      preview.appendChild(info);
    }
    showStatus(status, uiText('File loaded: ', '文件已加载: ') + file.name, 'success');
  };
  reader.onerror = () => {
    if (currentFile === file) showStatus(status, uiText('Could not read file', '无法读取文件'), 'error');
  };
  reader.readAsDataURL(file);
}

function copyB64() {
  const val = document.getElementById('b64-output').value;
  if (!val) { showToast(uiText('No Base64 data', '没有 Base64 数据')); return; }
  copyText(val);
}

function copyDataUri() {
  const val = document.getElementById('data-uri-output').value;
  if (!val) { showToast(uiText('No Data URI', '没有 Data URI')); return; }
  copyText(val);
}

function clearB64Input() {
  document.getElementById('b64-input').value = '';
}

function decodeB64() {
  const input = document.getElementById('b64-input').value.trim();
  const filename = document.getElementById('decode-filename').value.trim() || 'decoded-file';

  if (!input) { showToast(uiText('Paste Base64 data', '请粘贴 Base64 数据')); return; }

  try {
    const { cleaned, mimeType } = parseBase64(input);
    const binary = atob(cleaned);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Determine extension
    let ext = '';
    const mimeMap = {
      'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif',
      'image/webp': '.webp', 'image/svg+xml': '.svg',
      'application/pdf': '.pdf', 'application/zip': '.zip',
      'text/plain': '.txt', 'text/html': '.html',
      'application/json': '.json'
    };
    if (mimeType && mimeMap[mimeType]) ext = mimeMap[mimeType];
    
    const finalName = filename.includes('.') ? filename : filename + ext;

    const blob = new Blob([bytes], { type: mimeType || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalName;
    a.click();
    URL.revokeObjectURL(url);

    const status = document.getElementById('file-status');
    showStatus(status, uiText('Restored and downloaded: ', '已还原并下载: ') + `${finalName} (${formatBytes(bytes.length)})`, 'success');
  } catch (e) {
    showToast(uiText('Restore failed: ', '还原失败: ') + e.message);
  }
}

/* ======== Text Tab Utilities ======== */
function loadTextSample() {
  const input = document.getElementById('text-input');
  if (currentDir === 'encode') {
    input.value = 'Hello, Base64 Tool!\n\nBase64 是一种用 64 个字符表示任意二进制数据的方法。\n常用于在 URL、CSS、HTML 中嵌入图片数据。';
  } else {
    input.value = 'SGVsbG8sIEJhc2U2NCBUb29sIQpCYXNlNjQgRW5jb2RlZCBUZXh0IQ==';
  }
  autoProcess();
}

function clearInput() {
  document.getElementById('text-input').value = '';
  autoProcess();
}

function copyOutput() {
  const val = document.getElementById('text-output').value;
  if (!val) { showToast(uiText('No output to copy', '没有输出内容')); return; }
  copyText(val);
}

function downloadOutput() {
  const val = document.getElementById('text-output').value;
  if (!val) { showToast(uiText('No output to download', '没有输出内容')); return; }
  const ext = currentDir === 'encode' ? '.b64' : '.txt';
  const blob = new Blob([val], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `base64-${currentDir}${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ======== Utilities ======== */
async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    showToast(uiText('Copied', '已复制'));
  } catch {
    showToast(uiText('Copy failed', '复制失败'));
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function showStatus(el, msg, type) {
  el.textContent = msg;
  el.className = 'status-bar visible status-' + type;
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 2000);
}

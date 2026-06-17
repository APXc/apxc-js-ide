// Monaco viene caricato tramite AMD loader in index.html, non tramite Webpack.
declare const monaco: any;

interface Tab {
  id: string;
  name: string;
  code: string;
  output: string;
}

let tabs: Tab[] = [];
let activeTabId: string = '';
let editors: Map<string, any> = new Map();       // monaco editor instances per tab
let editorWrappers: Map<string, HTMLElement> = new Map(); // div wrapper per tab

// ── Utilità ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return 'tab_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function saveTabs() {
  const data = tabs.map(t => ({
    ...t,
    code: editors.get(t.id)?.getValue() ?? t.code,
  }));
  (window as any).electronAPI.saveTabs(data);
}

// ── Render Tab Bar ────────────────────────────────────────────────────────────

function renderTabBar() {
  const tabBar = document.getElementById('tab-bar')!;
  const addBtn = document.getElementById('add-tab-btn')!;

  // Rimuovi tab esistenti ma mantieni il pulsante +
  tabBar.querySelectorAll('.tab').forEach(el => el.remove());

  tabs.forEach(tab => {
    const el = document.createElement('div');
    el.className = 'tab' + (tab.id === activeTabId ? ' active' : '');
    el.dataset.id = tab.id;

    const nameInput = document.createElement('input');
    nameInput.className = 'tab-name';
    nameInput.value = tab.name;
    nameInput.readOnly = true;
    nameInput.title = 'Doppio click per rinominare';

    nameInput.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      nameInput.readOnly = false;
      nameInput.focus();
      nameInput.select();
    });
    nameInput.addEventListener('blur', () => {
      nameInput.readOnly = true;
      const t = tabs.find(t => t.id === tab.id);
      if (t) {
        t.name = nameInput.value.trim() || t.name;
        nameInput.value = t.name;
        saveTabs();
      }
    });
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') nameInput.blur();
      if (e.key === 'Escape') {
        const t = tabs.find(t => t.id === tab.id);
        if (t) nameInput.value = t.name;
        nameInput.blur();
      }
    });

    const closeBtn = document.createElement('span');
    closeBtn.className = 'tab-close';
    closeBtn.textContent = '×';
    closeBtn.title = 'Chiudi tab';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    });

    el.appendChild(nameInput);
    if (tabs.length > 1) el.appendChild(closeBtn);
    el.addEventListener('click', () => switchTab(tab.id));

    tabBar.insertBefore(el, addBtn);
  });
}

// ── Tab Lifecycle ─────────────────────────────────────────────────────────────

function createTab(name?: string, code?: string, output?: string): Tab {
  const tab: Tab = {
    id: generateId(),
    name: name ?? `Tab ${tabs.length + 1}`,
    code: code ?? '// Scrivi qui il tuo codice JavaScript\nconsole.log("Hello, World!");\n',
    output: output ?? '',
  };
  tabs.push(tab);
  return tab;
}

function closeTab(id: string) {
  if (tabs.length === 1) return; // non chiudere l'ultimo tab
  const idx = tabs.findIndex(t => t.id === id);
  editors.get(id)?.dispose();
  editors.delete(id);
  editorWrappers.get(id)?.remove();
  editorWrappers.delete(id);
  tabs.splice(idx, 1);
  if (activeTabId === id) {
    activeTabId = tabs[Math.max(0, idx - 1)].id;
  }
  renderTabBar();
  activateTab(activeTabId);
  saveTabs();
}

function switchTab(id: string) {
  // Salva codice del tab corrente
  const current = tabs.find(t => t.id === activeTabId);
  if (current && editors.has(activeTabId)) {
    current.code = editors.get(activeTabId).getValue();
  }
  activeTabId = id;
  renderTabBar();
  activateTab(id);
}

function activateTab(id: string) {
  const editorContainer = document.getElementById('editor-container')!;
  const tab = tabs.find(t => t.id === id);
  if (!tab) return;

  // Mostra/nascondi i wrapper div (non il DOM interno di Monaco)
  editorWrappers.forEach((wrapper, tabId) => {
    wrapper.style.display = tabId === id ? 'block' : 'none';
  });

  if (!editors.has(id)) {
    // Crea nuovo wrapper div per questo editor
    const edDiv = document.createElement('div');
    edDiv.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;';
    editorContainer.appendChild(edDiv);
    editorWrappers.set(id, edDiv);

    const editor = monaco.editor.create(edDiv, {
      value: tab.code,
      language: 'javascript',
      theme: 'vs-dark',
      fontSize: 14,
      fontFamily: "'Roboto Mono', 'Consolas', monospace",
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      lineNumbers: 'on',
      renderLineHighlight: 'all',
      suggestOnTriggerCharacters: true,
      formatOnPaste: true,
    });

    // Auto-save al cambio contenuto
    editor.onDidChangeModelContent(() => {
      const t = tabs.find(t => t.id === id);
      if (t) t.code = editor.getValue();
    });

    editors.set(id, editor);
  } else {
    // Il wrapper è già stato mostrato sopra, basta fare layout
    editors.get(id)?.layout();
  }

  // Mostra output del tab attivo
  renderOutput(tab.output);
}

// ── Output Rendering ──────────────────────────────────────────────────────────

function renderOutput(raw: string) {
  const outputDiv = document.getElementById('output')!;
  if (!raw) {
    outputDiv.innerHTML = '<span class="output-placeholder">Premi ▶ Run per eseguire il codice...</span>';
    return;
  }
  // Colora le righe: rosso se contiene "Error", verde altrimenti
  outputDiv.innerHTML = raw
    .split('\n')
    .map(line => {
      const escaped = line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const cls = /error|exception|throw|at\s/i.test(line) ? 'error' : '';
      return `<span class="output-line ${cls}">${escaped}</span>`;
    })
    .join('\n');
}

// ── Resize Panel ──────────────────────────────────────────────────────────────

function initResizer() {
  const resizer = document.getElementById('resizer')!;
  const outputContainer = document.getElementById('output-container')!;
  let startX = 0;
  let startWidth = 0;

  resizer.addEventListener('mousedown', (e: MouseEvent) => {
    startX = e.clientX;
    startWidth = outputContainer.getBoundingClientRect().width;
    resizer.classList.add('dragging');

    const onMove = (e: MouseEvent) => {
      const delta = startX - e.clientX;
      const newWidth = Math.max(180, Math.min(900, startWidth + delta));
      outputContainer.style.width = newWidth + 'px';
    };
    const onUp = () => {
      resizer.classList.remove('dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      editors.forEach(ed => ed.layout());
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ── Packages Panel ────────────────────────────────────────────────────────────

async function loadPackageList() {
  const api = (window as any).electronAPI;
  const deps: Record<string, string> = await api.listPackages();
  const list = document.getElementById('pkg-list')!;
  list.innerHTML = '';
  const names = Object.keys(deps);
  if (names.length === 0) {
    list.innerHTML = '<div id="pkg-empty">Nessun pacchetto installato.</div>';
    return;
  }
  names.forEach(name => {
    const item = document.createElement('div');
    item.className = 'pkg-item';
    item.innerHTML = `
      <span><span class="pkg-name">${name}</span><span class="pkg-version">${deps[name]}</span></span>
      <span class="pkg-remove" data-pkg="${name}" title="Rimuovi">×</span>
    `;
    item.querySelector('.pkg-remove')!.addEventListener('click', async () => {
      const statusEl = document.getElementById('pkg-status')!;
      statusEl.textContent = `Rimozione ${name}...`;
      statusEl.className = 'loading';
      await api.uninstallPackage(name);
      statusEl.textContent = `${name} rimosso.`;
      statusEl.className = 'success';
      await loadPackageList();
    });
    list.appendChild(item);
  });
}

function initPackagesPanel(api: any) {
  const packagesBtn = document.getElementById('packages-btn')!;
  const drawer = document.getElementById('packages-drawer')!;
  const pkgInput = document.getElementById('pkg-input') as HTMLInputElement;
  const installBtn = document.getElementById('pkg-install-btn') as HTMLButtonElement;
  const statusEl = document.getElementById('pkg-status')!;

  // Toggle drawer
  packagesBtn.addEventListener('click', () => {
    const isOpen = drawer.classList.toggle('open');
    packagesBtn.classList.toggle('active', isOpen);
    if (isOpen) {
      loadPackageList();
      pkgInput.focus();
    }
  });

  // Chiudi drawer cliccando fuori
  document.addEventListener('click', (e) => {
    if (!drawer.contains(e.target as Node) && e.target !== packagesBtn) {
      drawer.classList.remove('open');
      packagesBtn.classList.remove('active');
    }
  });

  // Install
  const doInstall = async () => {
    const name = pkgInput.value.trim();
    if (!name) return;
    installBtn.disabled = true;
    statusEl.textContent = `⏳ Installazione di ${name}...`;
    statusEl.className = 'loading';
    const result: { success: boolean; error?: string } = await api.installPackage(name);
    if (result.success) {
      statusEl.textContent = `✓ ${name} installato con successo.`;
      statusEl.className = 'success';
      pkgInput.value = '';
      await loadPackageList();
    } else {
      statusEl.textContent = `✗ ${result.error ?? 'Errore durante l\'installazione.'}`;
      statusEl.className = 'error';
    }
    installBtn.disabled = false;
    pkgInput.focus();
  };

  installBtn.addEventListener('click', doInstall);
  pkgInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doInstall();
  });
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function initializeEditor() {
  const api = (window as any).electronAPI;

  // Carica tab salvati
  const saved: Tab[] | null = await api.loadTabs();
  if (saved && saved.length > 0) {
    tabs = saved;
    activeTabId = tabs[0].id;
  } else {
    const first = createTab('Tab 1');
    activeTabId = first.id;
  }

  renderTabBar();
  activateTab(activeTabId);
  initResizer();
  initPackagesPanel(api);

  // Pulsante + nuovo tab
  document.getElementById('add-tab-btn')!.addEventListener('click', () => {
    const tab = createTab();
    renderTabBar();
    switchTab(tab.id);
    saveTabs();
  });

  // Run
  document.getElementById('run-button')!.addEventListener('click', async () => {
    const editor = editors.get(activeTabId);
    if (!editor) return;
    const code = editor.getValue();
    const outputDiv = document.getElementById('output')!;
    outputDiv.innerHTML = '<span class="output-line info">⏳ Esecuzione in corso...</span>';
    try {
      const result: string = await api.runCode(code);
      const tab = tabs.find(t => t.id === activeTabId);
      if (tab) tab.output = result;
      renderOutput(result);
      saveTabs();
    } catch (error) {
      renderOutput('Error: ' + (error as Error).message);
    }
  });

  // Export
  document.getElementById('export-btn')!.addEventListener('click', async () => {
    const editor = editors.get(activeTabId);
    const tab = tabs.find(t => t.id === activeTabId);
    if (!editor || !tab) return;
    await api.exportTab({
      code: editor.getValue(),
      output: tab.output,
      tabName: tab.name,
    });
  });

  // Clear
  document.getElementById('clear-btn')!.addEventListener('click', () => {
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab) tab.output = '';
    renderOutput('');
    saveTabs();
  });
}

if ((window as any).monacoReady) {
  initializeEditor();
} else {
  window.addEventListener('monacoReady', initializeEditor);
}



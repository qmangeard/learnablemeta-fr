// ==UserScript==
// @name         LearnableMeta — Traduction française
// @namespace    learnablemeta-fr-companion
// @version      1.0.0
// @description  Traduit les fenêtres LearnableMeta en français, avec retour immédiat à l'anglais.
// @match        https://geoguessr.com/*
// @match        https://*.geoguessr.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @connect      translate.googleapis.com
// @run-at       document-idle
// @noframes
// ==/UserScript==

/* Script indépendant : conserver le script LearnableMeta original activé.
 * Seuls les textes de .geometa-container sont traduits. Le texte est envoyé
 * à Google Traduction (point d'accès non officiel, sans garantie de disponibilité).
 * Ne lit ni l'état de la partie ni les données de compte ; ne transmet pas les images
 * ou les adresses des liens. Les éventuelles données écrites dans un indice font partie du texte.
 */
(() => {
  'use strict';
  const ROOT = '.geometa-container';
  const OWN = '[data-lmfr]';
  const SKIP = `${OWN},script,style,svg,textarea,input,select,code,pre,[contenteditable="true"],[translate="no"]`;
  const CACHE_KEY = 'lmfr-cache-v1';
  const panels = new Map();
  const entries = new Map();
  const inflight = new Map();
  let enabled = GM_getValue('lmfr-enabled', true) !== false;
  let cache;
  try {
    const saved = GM_getValue(CACHE_KEY, []);
    cache = new Map(Array.isArray(saved) ? saved.filter(x => Array.isArray(x) && typeof x[0] === 'string' && typeof x[1] === 'string') : []);
  } catch { cache = new Map(); }
  let saveTimer;
  let scanTimer;
  let active = 0;
  const queue = [];

  function saveCache() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { GM_setValue(CACHE_KEY, [...cache].slice(-600)); } catch { /* Cache facultatif. */ }
    }, 600);
  }

  function request(text) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fr&dt=t&q=' + encodeURIComponent(text),
        anonymous: true,
        timeout: 15000,
        onload(response) {
          try {
            if (response.status !== 200) throw new Error('HTTP ' + response.status);
            const body = JSON.parse(response.responseText);
            if (!Array.isArray(body[0])) throw new Error('Réponse invalide');
            const result = body[0].map(part => typeof part?.[0] === 'string' ? part[0] : '').join('');
            if (!result.trim()) throw new Error('Traduction vide');
            resolve(result);
          } catch (error) { reject(error); }
        },
        onerror: () => reject(new Error('Connexion impossible')),
        ontimeout: () => reject(new Error('Délai dépassé')),
        onabort: () => reject(new Error('Requête annulée'))
      });
    });
  }

  // Petites requêtes et deux tâches maximum pour éviter les rafales.
  function pump() {
    while (enabled && active < 2 && queue.length) {
      const job = queue.shift();
      active++;
      job().finally(() => { active--; setTimeout(pump, 180); });
    }
  }

  function translate(text) {
    if (cache.has(text)) return Promise.resolve(cache.get(text));
    if (inflight.has(text)) return inflight.get(text);
    const promise = new Promise((resolve, reject) => {
      queue.push(async () => {
        try {
          // Découpe sans perdre les espaces ; les longs paragraphes restent pris en charge.
          const chunks = text.match(/[\s\S]{1,1000}(?:\s|$)|[\s\S]{1,1000}/g) || [text];
          const translated = [];
          for (const chunk of chunks) {
            if (!enabled) throw new Error('Traduction désactivée');
            const space = chunk.match(/^(\s*)([\s\S]*?)(\s*)$/);
            translated.push(space[1] + (space[2] ? await request(space[2]) : '') + space[3]);
          }
          const result = translated.join('');
          cache.set(text, result);
          while (cache.size > 600) cache.delete(cache.keys().next().value);
          saveCache();
          resolve(result);
        } catch (error) { reject(error); }
      });
    });
    inflight.set(text, promise);
    promise.finally(() => inflight.delete(text)).catch(() => {});
    pump();
    return promise;
  }

  function refreshPanels() {
    for (const [root, panel] of panels) {
      let pending = 0;
      let errors = 0;
      for (const [node, entry] of entries) {
        if (root.contains(node)) { pending += Number(entry.pending); errors += Number(entry.error); }
      }
      panel.toggle.textContent = enabled ? 'FR activé · Désactiver' : 'EN original · Activer le français';
      panel.toggle.setAttribute('aria-pressed', String(enabled));
      panel.status.textContent = !enabled ? 'Texte original' : errors ? 'Traduction incomplète : service indisponible' : pending ? `Traduction… (${pending})` : 'Français · traduction automatique';
      panel.retry.hidden = !enabled || !errors;
    }
  }

  function setEnabled(value) {
    enabled = value;
    GM_setValue('lmfr-enabled', value);
    if (!enabled) {
      for (const [node, entry] of entries) {
        // Ne pas écraser une mise à jour produite entre-temps par LearnableMeta.
        if (node.nodeValue === entry.translated) node.nodeValue = entry.original;
      }
    } else {
      for (const entry of entries.values()) entry.error = false;
      pump();
    }
    scan();
  }

  function scheduleScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, 100);
  }

  function installPanel(root) {
    const bar = document.createElement('div');
    bar.dataset.lmfr = 'toolbar';
    bar.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px;margin-bottom:6px;background:#172333;color:#fff;border:1px solid #70849c;border-radius:6px;font:12px/1.4 Arial,sans-serif;';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.style.cssText = 'cursor:pointer;background:#167447;color:white;border:1px solid #8bd6af;border-radius:4px;padding:6px 9px;font:bold 12px Arial,sans-serif;';
    toggle.addEventListener('click', () => setEnabled(!enabled));
    const status = document.createElement('span');
    status.setAttribute('role', 'status');
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = 'Réessayer';
    retry.style.cssText = toggle.style.cssText;
    retry.addEventListener('click', () => {
      for (const entry of entries.values()) entry.error = false;
      scan();
    });
    bar.append(toggle, status, retry);
    root.prepend(bar);
    const observer = new MutationObserver(records => {
      if (records.some(record => !(record.target.nodeType === 1 ? record.target : record.target.parentElement)?.closest(OWN))) scheduleScan();
    });
    observer.observe(root, { childList: true, characterData: true, subtree: true });
    panels.set(root, { bar, toggle, status, retry, observer });
  }

  function scan() {
    for (const [root, panel] of panels) {
      if (!root.isConnected) { panel.observer.disconnect(); panels.delete(root); }
      else if (!root.contains(panel.bar)) root.prepend(panel.bar);
    }
    for (const node of entries.keys()) {
      if (!node.isConnected || !node.parentElement?.closest(ROOT)) entries.delete(node);
    }
    document.querySelectorAll(ROOT).forEach(root => {
      if (!panels.has(root)) installPanel(root);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (!node.nodeValue.trim() || !node.parentElement || node.parentElement.closest(SKIP)) continue;
        // Garder le nom du produit et les URL affichées tels quels.
        if (/^(Learnable\s?Meta|https?:\/\/\S+)$/i.test(node.nodeValue.trim())) continue;
        let entry = entries.get(node);
        if (!entry || (node.nodeValue !== entry.original && node.nodeValue !== entry.translated)) {
          entry = { original: node.nodeValue, translated: null, pending: false, error: false };
          entries.set(node, entry);
        }
        if (!enabled) {
          if (node.nodeValue === entry.translated) node.nodeValue = entry.original;
          continue;
        }
        if (entry.translated !== null) { if (node.nodeValue === entry.original) node.nodeValue = entry.translated; continue; }
        if (entry.pending || entry.error) continue;
        entry.pending = true;
        const target = node;
        const current = entry;
        translate(entry.original).then(result => {
          current.translated = result;
          if (enabled && target.isConnected && target.parentElement?.closest(ROOT) && entries.get(target) === current && target.nodeValue === current.original) target.nodeValue = result;
        }).catch(() => { current.error = enabled; }).finally(() => {
          current.pending = false;
          refreshPanels();
        });
      }
    });
    refreshPanels();
  }

  // Détecte aussi les fenêtres créées après navigation sans rechargement (GeoGuessr SPA).
  const discovery = new MutationObserver(records => {
    if (records.some(record => [...record.addedNodes].some(node => node.nodeType === 1 && (node.matches(ROOT) || node.querySelector(ROOT))))) scheduleScan();
  });
  discovery.observe(document.body, { childList: true, subtree: true });
  GM_registerMenuCommand('LearnableMeta : activer/désactiver le français', () => setEnabled(!enabled));
  GM_registerMenuCommand('LearnableMeta : vider le cache de traduction', () => {
    cache.clear();
    GM_setValue(CACHE_KEY, []);
  });
  scan();
})();

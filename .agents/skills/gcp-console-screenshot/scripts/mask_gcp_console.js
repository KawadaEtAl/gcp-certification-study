/**
 * GCP Console DOM Sanitizer for Reference Screenshots
 *
 * Replaces sensitive project names, project IDs, project numbers, emails,
 * billing IDs, display names, and profile avatars in-memory (DOM only)
 * right before taking a viewport screenshot.
 *
 * Does NOT modify any real Google Cloud resources.
 */
(function maskGcpConsole(userConfig) {
  const config = userConfig || {};
  const explicitReplacements = Array.isArray(config.replacements) ? config.replacements : [];
  const forbiddenPatterns = Array.isArray(config.forbiddenPatterns) ? config.forbiddenPatterns : [];

  const DUMMY_PROJECT = config.dummyProject || 'gcp-study-sandbox';
  const DUMMY_NUMBER = config.dummyProjectNumber || '123456789012';
  const DUMMY_EMAIL = config.dummyEmail || 'study-admin@example.com';
  const DUMMY_BILLING = config.dummyBillingId || '012345-6789AB-CDEF01';
  const DUMMY_NAME = config.dummyDisplayName || 'Taro Yamada';

  // Generic regex fallbacks (safe even when local config omits an item)
  const genericRegexes = [
    // Billing account IDs (e.g., 01A2B3-C4D5E6-F78901)
    { re: /\b[0-9A-F]{6}-[0-9A-F]{6}-[0-9A-F]{6}\b/g, to: DUMMY_BILLING },
    // 12-digit GCP project numbers (standalone or before -compute@ / @cloudservices)
    { re: /\b\d{12}(?=\b|[-@])/g, to: DUMMY_NUMBER },
    // Personal Gmail addresses
    { re: /\b[a-zA-Z0-9._%+-]+@gmail\.com\b/gi, to: DUMMY_EMAIL },
    // Japanese IAM heading fallback: プロジェクト「...」の権限
    {
      re: /プロジェクト「[^」]+」/g,
      to: `プロジェクト「${DUMMY_PROJECT}」`,
    },
  ];

  // Sort explicit replacements longest-first so full names replace before substrings
  const sortedExplicit = [...explicitReplacements]
    .filter((item) => item && typeof item.from === 'string' && item.from.length > 0)
    .sort((a, b) => b.from.length - a.from.length);

  function sanitizeString(input) {
    if (typeof input !== 'string' || !input) return input;
    let out = input;

    for (const item of sortedExplicit) {
      if (out.includes(item.from)) {
        out = out.split(item.from).join(item.to);
      }
      // Case-insensitive pass for ASCII tokens (emails / project IDs / Romanized names)
      if (/^[\x20-\x7E]+$/.test(item.from)) {
        const escaped = item.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        out = out.replace(new RegExp(escaped, 'gi'), item.to);
      }
    }

    for (const rule of genericRegexes) {
      out = out.replace(rule.re, rule.to);
    }

    return out;
  }

  // Clean Material monogram SVG for top-right Google Account avatar
  const monogram = (DUMMY_NAME.trim()[0] || 'T').toUpperCase();
  const avatarSvg =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
        `<rect width="64" height="64" rx="32" fill="#1a73e8"/>` +
        `<text x="32" y="42" text-anchor="middle" font-family="Roboto,Arial,sans-serif" ` +
        `font-size="28" font-weight="600" fill="#ffffff">${monogram}</text>` +
        `</svg>`
    );

  const report = {
    replacedTextNodes: 0,
    replacedAttrs: 0,
    maskedAvatars: 0,
    maskedProjectPicker: 0,
    remainingMatches: [],
  };

  function maskAvatarElement(el) {
    if (el.tagName === 'IMG') {
      const src = el.getAttribute('src') || '';
      const alt = el.getAttribute('alt') || '';
      const parentLabel = el.closest('a, button')?.getAttribute('aria-label') || '';
      const isProfilePhoto =
        /googleusercontent\.com|ggpht\.com/i.test(src) ||
        /google\s*アカウント|google\s*account/i.test(parentLabel) ||
        /profile|avatar|アカウント/i.test(alt);

      if (isProfilePhoto) {
        el.setAttribute('src', avatarSvg);
        el.removeAttribute('srcset');
        el.setAttribute('alt', 'Google アカウント');
        report.maskedAvatars += 1;
      }
    }
  }

  function processRoot(root) {
    if (!root) return;

    // 1. Walk text nodes
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      const parentTag = node.parentElement?.tagName;
      if (parentTag === 'SCRIPT' || parentTag === 'STYLE') continue;
      const before = node.nodeValue;
      const after = sanitizeString(before);
      if (after !== before) {
        node.nodeValue = after;
        report.replacedTextNodes += 1;
      }
    }

    // 2. Walk elements for attributes, inputs, avatars, and shadow roots
    const elements = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (const el of elements) {
      maskAvatarElement(el);

      // Project switcher pill fallback (even if project name wasn't in explicit list)
      if (
        el.matches &&
        el.matches('[data-test-id="project-switcher-button"], .cfc-switcher-button-label-text, .pcc-project-switcher-label')
      ) {
        const text = (el.textContent || '').trim();
        if (text && text !== DUMMY_PROJECT) {
          el.textContent = DUMMY_PROJECT;
          report.maskedProjectPicker += 1;
        }
      }

      for (const attr of ['aria-label', 'title', 'placeholder', 'alt', 'data-tooltip']) {
        if (el.hasAttribute(attr)) {
          const before = el.getAttribute(attr);
          const after = sanitizeString(before);
          if (after !== before) {
            el.setAttribute(attr, after);
            report.replacedAttrs += 1;
          }
        }
      }

      if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && typeof el.value === 'string') {
        const before = el.value;
        const after = sanitizeString(before);
        if (after !== before) {
          el.value = after;
          report.replacedAttrs += 1;
        }
      }

      if (el.shadowRoot) {
        processRoot(el.shadowRoot);
      }
    }
  }

  processRoot(document.body);
  document.title = sanitizeString(document.title);

  // 3. Audit visible text (including shadow roots) for forbidden patterns
  function collectText(root, acc) {
    if (!root) return;
    if (root.innerText) acc.push(root.innerText);
    const els = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (const el of els) {
      if (el.shadowRoot) collectText(el.shadowRoot, acc);
    }
  }

  const allTextChunks = [document.title];
  collectText(document.body, allTextChunks);
  const combinedText = allTextChunks.join('\n').toLowerCase();

  const checkTokens = [
    ...forbiddenPatterns,
    ...sortedExplicit.map((item) => item.from),
  ];

  const seen = new Set();
  for (const token of checkTokens) {
    if (!token) continue;
    const lowered = token.toLowerCase();
    if (seen.has(lowered)) continue;
    seen.add(lowered);
    if (combinedText.includes(lowered)) {
      report.remainingMatches.push(token);
    }
  }

  return report;
})(__MASK_CONFIG__);

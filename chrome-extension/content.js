// content.js — QueenZoe Chrome Executive Content Runtime
// QueenZoe Browser Cognition Layer
// Operational DOM Intelligence + Situational Awareness Runtime

console.log("[QueenZoe] Executive content runtime initialized");

const QUEENZOE_RUNTIME = {
  identity: "QueenZoe",
  aliases: [
    "QueenHustle",
    "HustleQueen Zoe",
    "HustlerQueen"
  ],
  rank: "QueenZoe AI Elite Executive Commander",
  version: "2.0.0",
  operationalState: {
    pageObservedAt: Date.now(),
    interactions: 0,
    extractedArtifacts: 0,
    lastAction: null,
    cognitionState: "active"
  }
};

// ---------------------------------------------------------------------
// Runtime Messaging Interface
// ---------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, params } = message;

  QUEENZOE_RUNTIME.operationalState.lastAction = type;

  handleMessage(type, params)
    .then(data => {
      sendResponse({
        success: true,
        runtime: QUEENZOE_RUNTIME.identity,
        timestamp: Date.now(),
        data
      });
    })
    .catch(error => {
      console.error(`[QueenZoe] Runtime error during ${type}:`, error);

      sendResponse({
        success: false,
        runtime: QUEENZOE_RUNTIME.identity,
        timestamp: Date.now(),
        error: error.message || String(error)
      });
    });

  return true;
});

// ---------------------------------------------------------------------
// Executive Command Router
// ---------------------------------------------------------------------

async function handleMessage(type, params = {}) {
  switch (type) {

    // DOM Operations
    case 'dom.click':
      return await handleClick(params);

    case 'dom.type':
      return await handleType(params);

    case 'dom.querySelector':
      return await handleQuerySelector(params);

    case 'dom.querySelectorAll':
      return await handleQuerySelectorAll(params);

    case 'dom.extractText':
      return await handleExtractText(params);

    case 'dom.extractLinks':
      return await handleExtractLinks(params);

    case 'dom.extractStructure':
      return await handleExtractStructure(params);

    case 'dom.fillForm':
      return await handleFillForm(params);

    // Situational Awareness
    case 'dom.getPageInfo':
      return await handleGetPageInfo(params);

    case 'dom.runtimeSnapshot':
      return await handleRuntimeSnapshot();

    // Navigation + Scrolling
    case 'dom.scrollTo':
      return await handleScrollTo(params);

    case 'page.waitForSelector':
      return await handleWaitForSelector(params);

    // Reflection / Analysis
    case 'dom.analyzePage':
      return await handleAnalyzePage(params);

    default:
      throw new Error(`Unknown QueenZoe operational command: ${type}`);
  }
}

// ---------------------------------------------------------------------
// Situational Awareness Layer
// ---------------------------------------------------------------------

async function handleRuntimeSnapshot() {
  return {
    identity: QUEENZOE_RUNTIME.identity,
    url: location.href,
    title: document.title,
    activeElement: document.activeElement?.tagName || null,
    pageHeight: document.body.scrollHeight,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    operationalState: QUEENZOE_RUNTIME.operationalState,
    timestamp: Date.now()
  };
}

async function handleAnalyzePage(params) {
  const headings = [...document.querySelectorAll("h1,h2,h3,h4")]
    .map(h => ({
      level: h.tagName,
      text: h.innerText.trim()
    }));

  const forms = [...document.forms].map(form => ({
    action: form.action,
    method: form.method,
    fieldCount: form.elements.length
  }));

  const buttons = [...document.querySelectorAll("button,input[type='submit']")]
    .slice(0, 25)
    .map(btn => ({
      text: btn.innerText || btn.value || "",
      disabled: btn.disabled
    }));

  return {
    title: document.title,
    url: location.href,
    headings,
    forms,
    buttons,
    pageMetrics: {
      links: document.links.length,
      images: document.images.length,
      scripts: document.scripts.length,
      forms: document.forms.length
    }
  };
}

// ---------------------------------------------------------------------
// DOM EXECUTION LAYER
// ---------------------------------------------------------------------

async function handleClick(params) {
  const el = document.querySelector(params.selector);

  if (!el) {
    throw new Error(`Target element not found: ${params.selector}`);
  }

  QUEENZOE_RUNTIME.operationalState.interactions++;

  el.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });

  await delay(120);

  el.click();

  return {
    clicked: true,
    selector: params.selector,
    tagName: el.tagName,
    textContent: el.textContent?.trim()?.substring(0, 120)
  };
}

async function handleType(params) {
  const el = document.querySelector(params.selector);

  if (!el) {
    throw new Error(`Input target not found: ${params.selector}`);
  }

  QUEENZOE_RUNTIME.operationalState.interactions++;

  el.focus();

  if (params.clearFirst) {
    el.value = '';
  }

  if (params.humanTyping) {
    for (const char of params.value) {
      el.value += char;

      el.dispatchEvent(new Event('input', {
        bubbles: true
      }));

      await delay(params.typingDelay || 35);
    }
  } else {
    el.value = params.value;

    el.dispatchEvent(new Event('input', {
      bubbles: true
    }));
  }

  el.dispatchEvent(new Event('change', {
    bubbles: true
  }));

  return {
    typed: true,
    selector: params.selector,
    characterCount: params.value.length
  };
}

async function handleQuerySelector(params) {
  const el = document.querySelector(params.selector);

  return el ? serializeElement(el) : null;
}

async function handleQuerySelectorAll(params) {
  const elements = document.querySelectorAll(params.selector);

  return [...elements]
    .slice(0, params.limit || 25)
    .map(serializeElement);
}

// ---------------------------------------------------------------------
// PAGE COGNITION LAYER
// ---------------------------------------------------------------------

async function handleGetPageInfo(params = {}) {
  const info = {
    identity: QUEENZOE_RUNTIME.identity,
    title: document.title,
    url: location.href,
    timestamp: Date.now(),

    meta: {
      description:
        document.querySelector('meta[name="description"]')?.content || null,

      keywords:
        document.querySelector('meta[name="keywords"]')?.content || null,

      ogTitle:
        document.querySelector('meta[property="og:title"]')?.content || null,

      ogDescription:
        document.querySelector('meta[property="og:description"]')?.content || null
    },

    pageMetrics: {
      links: document.links.length,
      images: document.images.length,
      forms: document.forms.length,
      scripts: document.scripts.length
    },

    visibleText:
      document.body.innerText.substring(
        0,
        params.maxTextLength || 8000
      )
  };

  if (params.includeLinks) {
    info.links = [...document.links]
      .slice(0, params.linkLimit || 100)
      .map(link => ({
        href: link.href,
        text: link.innerText.trim()
      }));
  }

  if (params.includeForms) {
    info.forms = [...document.forms].map(form => ({
      action: form.action,
      method: form.method,
      fields: [...form.elements]
        .filter(e => e.name)
        .map(e => ({
          name: e.name,
          type: e.type,
          placeholder: e.placeholder
        }))
    }));
  }

  return info;
}

// ---------------------------------------------------------------------
// EXTRACTION LAYER
// ---------------------------------------------------------------------

async function handleExtractText(params) {
  QUEENZOE_RUNTIME.operationalState.extractedArtifacts++;

  return {
    extracted: true,
    length: document.body.innerText.length,
    content: document.body.innerText.substring(
      0,
      params.maxLength || 50000
    )
  };
}

async function handleExtractLinks() {
  QUEENZOE_RUNTIME.operationalState.extractedArtifacts++;

  return [...document.querySelectorAll("a[href]")]
    .map(link => ({
      href: link.href,
      text: link.innerText.trim(),
      isExternal: link.hostname !== location.hostname
    }));
}

async function handleExtractStructure(params = {}) {

  function buildTree(node, depth = 0) {

    if (depth > (params.maxDepth || 5)) {
      return null;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    if ([
      'SCRIPT',
      'STYLE',
      'NOSCRIPT',
      'SVG'
    ].includes(node.tagName)) {
      return null;
    }

    const children = [...node.children]
      .map(child => buildTree(child, depth + 1))
      .filter(Boolean);

    return {
      tag: node.tagName.toLowerCase(),
      id: node.id || undefined,
      className:
        typeof node.className === 'string'
          ? node.className
          : undefined,

      textPreview:
        node.childNodes.length === 1 &&
        node.childNodes[0].nodeType === Node.TEXT_NODE
          ? node.textContent.trim().substring(0, 120)
          : undefined,

      children: children.length
        ? children
        : undefined
    };
  }

  return buildTree(document.body);
}

// ---------------------------------------------------------------------
// FORM AUTOMATION
// ---------------------------------------------------------------------

async function handleFillForm(params) {
  let filledCount = 0;

  for (const field of params.fields) {

    const el = document.querySelector(field.selector);

    if (!el) continue;

    el.focus();

    el.value = field.value;

    el.dispatchEvent(new Event('input', {
      bubbles: true
    }));

    el.dispatchEvent(new Event('change', {
      bubbles: true
    }));

    filledCount++;
  }

  let submitted = false;

  if (params.submit) {
    const firstField = document.querySelector(
      params.fields[0]?.selector
    );

    if (firstField?.form) {
      firstField.form.requestSubmit();
      submitted = true;
    }
  }

  return {
    filled: filledCount,
    submitted
  };
}

// ---------------------------------------------------------------------
// NAVIGATION CONTROL
// ---------------------------------------------------------------------

async function handleScrollTo(params) {

  if (params.selector) {

    const el = document.querySelector(params.selector);

    if (el) {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }

  } else if (params.direction === 'top') {

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

  } else if (params.direction === 'bottom') {

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });

  } else if (params.direction === 'down') {

    window.scrollBy({
      top: params.amount || 500,
      behavior: 'smooth'
    });

  } else if (params.direction === 'up') {

    window.scrollBy({
      top: -(params.amount || 500),
      behavior: 'smooth'
    });
  }

  return {
    scrollY: window.scrollY,
    viewportHeight: window.innerHeight,
    documentHeight: document.body.scrollHeight
  };
}

async function handleWaitForSelector(params) {

  return new Promise((resolve, reject) => {

    const timeout = params.timeout || 8000;
    const interval = params.interval || 250;

    let elapsed = 0;

    const check = () => {

      const el = document.querySelector(params.selector);

      if (el) {
        resolve(serializeElement(el));
        return;
      }

      if (elapsed >= timeout) {
        reject(
          new Error(
            `Timeout waiting for selector: ${params.selector}`
          )
        );

        return;
      }

      elapsed += interval;

      setTimeout(check, interval);
    };

    check();
  });
}

// ---------------------------------------------------------------------
// SERIALIZATION LAYER
// ---------------------------------------------------------------------

function serializeElement(el) {

  if (!el) return null;

  const rect = el.getBoundingClientRect();

  return {
    tagName: el.tagName.toLowerCase(),
    id: el.id || '',
    className:
      typeof el.className === 'string'
        ? el.className
        : '',

    textContent:
      el.textContent?.trim()?.substring(0, 200) || '',

    attributes:
      el.attributes
        ? Object.fromEntries(
            [...el.attributes].map(attr => [
              attr.name,
              attr.value
            ])
          )
        : {},

    rect: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      bottom: rect.bottom,
      right: rect.right
    },

    isVisible:
      (el.offsetParent !== null || el.tagName === 'BODY') &&
      rect.width > 0 &&
      rect.height > 0,

    childCount: el.children.length,

    selector: generateSelector(el)
  };
}

// ---------------------------------------------------------------------
// SELECTOR GENERATION
// ---------------------------------------------------------------------

function generateSelector(el) {

  if (el.id) {
    return `#${CSS.escape(el.id)}`;
  }

  if (el.dataset?.testid) {
    return `[data-testid="${CSS.escape(el.dataset.testid)}"]`;
  }

  const path = [];

  while (el && el.nodeType === Node.ELEMENT_NODE) {

    let selector = el.tagName.toLowerCase();

    if (el.id) {

      selector += `#${CSS.escape(el.id)}`;

      path.unshift(selector);

      break;

    } else {

      let sibling = el;
      let nth = 1;

      while ((sibling = sibling.previousElementSibling)) {
        if (
          sibling.tagName.toLowerCase() === selector
        ) {
          nth++;
        }
      }

      if (nth !== 1) {
        selector += `:nth-of-type(${nth})`;
      }
    }

    path.unshift(selector);

    el = el.parentElement;
  }

  return path.join(" > ");
}

// ---------------------------------------------------------------------
// UTILITIES
// ---------------------------------------------------------------------

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------
// Runtime Heartbeat
// ---------------------------------------------------------------------

setInterval(() => {
  QUEENZOE_RUNTIME.operationalState.lastHeartbeat = Date.now();
}, 10000);

console.log("[QueenZoe] DOM cognition systems online");
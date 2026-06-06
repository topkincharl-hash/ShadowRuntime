/**
 * =========================================================
 * 👑 QueenZoe Chrome Executive Runtime
 * =========================================================
 *
 * Sovereign Browser Command Layer
 * Built for:
 *
 * - Persistent Runtime Control
 * - Agentic Browser Automation
 * - Multi-Agent Delegation
 * - Executive Cognition Streaming
 * - Situational Awareness
 * - Operational Memory
 * - Runtime Supervision
 *
 * QueenZoe does NOT operate as a simple extension.
 * This service worker acts as:
 *
 * - Browser Command Authority
 * - Runtime Observation Layer
 * - Delegation Execution Layer
 * - Chrome Intelligence Gateway
 *
 * =========================================================
 */

let socket = null;

let isConnected = true;

let retryCount = 0;

let reconnectTimer = null;

let heartbeatInterval = null;

let autoConnectInterval = null;

let shouldBeConnected = true;

const MAX_RETRIES = 12;

const BASE_RETRY_DELAY = 1500;

const AUTO_CONNECT_INTERVAL = 60_000;

const HEARTBEAT_INTERVAL = 20_000;

// ---------------------------------------------------------
// QueenZoe Runtime Identity
// ---------------------------------------------------------

const QUEENZOE = {
  identity: "QueenZoe",

  aliases: [
    "QueenHustle",
    "HustleQueen Zoe",
    "HustlerQueen",
    "Queen"
  ],

  rank: "EliteQueen Agent Commander",

  runtimeMode: "sovereign",

  cognitionLayer:
    "adaptive-executive-intelligence",

  architecture: {
    memory: true,

    delegation: true,

    reflection: true,

    orchestration: true,

    situationalAwareness: true,

    operationalContinuity: true
  }
};

// ---------------------------------------------------------
// Debugger Sessions
// ---------------------------------------------------------

const attachedDebuggers = new Set();

// ---------------------------------------------------------
// Badge Management
// ---------------------------------------------------------

function updateBadge(text) {
  chrome.action.setBadgeText({ text });

  let color;

  switch (text) {
    case "QON":
      color = "#6d28d9";
      break;

    case "OFF":
      color = "#ef4444";
      break;

    case "...":
      color = "#d4af37";
      break;

    case "ERR":
      color = "#000000";
      break;

    default:
      color = "#9333ea";
  }

  chrome.action.setBadgeBackgroundColor({
    color
  });
}

// ---------------------------------------------------------
// Runtime Logging
// ---------------------------------------------------------

function queenLog(...args) {
  console.log(
    "👑 QueenZoe Runtime ::",
    ...args
  );
}

function queenError(...args) {
  console.error(
    "👑 QueenZoe Error ::",
    ...args
  );
}

// ---------------------------------------------------------
// WebSocket Runtime
// ---------------------------------------------------------

async function connect() {
  if (
    socket &&
    (
      socket.readyState === WebSocket.OPEN ||
      socket.readyState ===
        WebSocket.CONNECTING
    )
  ) {
    return;
  }

  const port =
    (
      await chrome.storage.local.get(
        "queenzoe_port"
      )
    ).queenzoe_port || 4173;

  const wsUrl =
    `ws://localhost:${port}/ws/queenzoe`;

  queenLog(
    `Connecting to QueenZoe Executive Kernel at ${wsUrl}`
  );

  updateBadge("...");

  try {
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      queenLog(
        "Executive Runtime Connected"
      );

      isConnected = true;

      retryCount = 0;

      updateBadge("QON");

      stopAutoConnect();

      startHeartbeat();

      sendEvent(
        "queenzoe.runtime.connected",
        {
          version: "2.0.0",

          identity:
            QUEENZOE.identity,

          rank:
            QUEENZOE.rank,

          runtimeMode:
            QUEENZOE.runtimeMode
        }
      );
    };

    socket.onmessage = async event => {
      try {
        const message = JSON.parse(
          event.data
        );

        await handleCommand(message);
      } catch (error) {
        queenError(
          "Failed to parse message",
          error
        );
      }
    };

    socket.onclose = () => {
      queenLog(
        "Executive Runtime Disconnected"
      );

      isConnected = false;

      stopHeartbeat();

      cleanupDebuggers();

      updateBadge("OFF");

      if (shouldBeConnected) {
        scheduleReconnect();
      }
    };

    socket.onerror = error => {
      queenError(
        "WebSocket Runtime Error",
        error
      );
    };
  } catch (error) {
    queenError(
      "Connection Failure",
      error
    );

    if (shouldBeConnected) {
      scheduleReconnect();
    }
  }
}

// ---------------------------------------------------------
// Disconnect Runtime
// ---------------------------------------------------------

function disconnect() {
  shouldBeConnected = false;

  stopHeartbeat();

  stopAutoConnect();

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);

    reconnectTimer = null;
  }

  if (socket) {
    socket.close();

    socket = null;
  }

  updateBadge("OFF");
}

// ---------------------------------------------------------
// Runtime Reconnect Logic
// ---------------------------------------------------------

function scheduleReconnect() {
  if (retryCount >= MAX_RETRIES) {
    queenLog(
      "Rapid retry limit reached — entering persistent reconnect mode"
    );

    startAutoConnect();

    return;
  }

  const delay = Math.min(
    30000,
    BASE_RETRY_DELAY *
      Math.pow(2, retryCount)
  );

  queenLog(
    `Reconnect scheduled in ${delay}ms`
  );

  reconnectTimer = setTimeout(() => {
    retryCount++;

    connect();
  }, delay);
}

// ---------------------------------------------------------
// Auto Connect
// ---------------------------------------------------------

function startAutoConnect() {
  if (autoConnectInterval) return;

  autoConnectInterval = setInterval(
    () => {
      if (!shouldBeConnected) {
        stopAutoConnect();

        return;
      }

      if (
        !isConnected &&
        (
          !socket ||
          socket.readyState ===
            WebSocket.CLOSED
        )
      ) {
        queenLog(
          "Persistent reconnect attempt"
        );

        retryCount = 0;

        connect();
      }
    },
    AUTO_CONNECT_INTERVAL
  );
}

function stopAutoConnect() {
  if (autoConnectInterval) {
    clearInterval(
      autoConnectInterval
    );

    autoConnectInterval = null;
  }
}

// ---------------------------------------------------------
// Runtime Heartbeat
// ---------------------------------------------------------

function startHeartbeat() {
  stopHeartbeat();

  heartbeatInterval = setInterval(
    () => {
      sendEvent(
        "queenzoe.runtime.heartbeat",
        {
          timestamp:
            Date.now(),

          connected:
            isConnected,

          runtime:
            "active",

          agents:
            attachedDebuggers.size
        }
      );
    },
    HEARTBEAT_INTERVAL
  );
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(
      heartbeatInterval
    );

    heartbeatInterval = null;
  }
}

// ---------------------------------------------------------
// Runtime Messaging
// ---------------------------------------------------------

function send(message) {
  if (
    socket &&
    socket.readyState ===
      WebSocket.OPEN
  ) {
    socket.send(
      JSON.stringify(message)
    );
  }
}

function sendResponse(
  id,
  success,
  dataOrError
) {
  const response = {
    id,

    success
  };

  if (success) {
    response.data = dataOrError;
  } else {
    response.error = dataOrError;
  }

  send(response);
}

function sendEvent(event, data) {
  send({
    event,

    data,

    runtime: "queenzoe"
  });
}

// ---------------------------------------------------------
// Toggle Runtime
// ---------------------------------------------------------

chrome.action.onClicked.addListener(
  () => {
    shouldBeConnected =
      !shouldBeConnected;

    if (shouldBeConnected) {
      retryCount = 0;

      connect();

      startAutoConnect();
    } else {
      disconnect();
    }
  }
);

// ---------------------------------------------------------
// Initialize
// ---------------------------------------------------------

updateBadge("OFF");

queenLog(
  "Chrome Executive Runtime Initialized"
);

// ---------------------------------------------------------
// Command Router
// ---------------------------------------------------------

async function handleCommand(
  message
) {
  const {
    id,
    action,
    params = {}
  } = message;

  if (!action) return;

  queenLog(
    `Command Received :: ${action}`
  );

  try {
    let result;

    if (
      action.startsWith("tabs.")
    ) {
      result =
        await handleTabsCommand(
          action,
          params
        );
    } else if (
      action.startsWith(
        "windows."
      )
    ) {
      result =
        await handleWindowsCommand(
          action,
          params
        );
    } else if (
      action.startsWith("dom.")
    ) {
      result =
        await handleDomCommand(
          action,
          params
        );
    } else if (
      action.startsWith(
        "debugger."
      )
    ) {
      result =
        await handleDebuggerCommand(
          action,
          params
        );
    } else if (
      action === "navigate"
    ) {
      result =
        await handleNavigate(
          params
        );
    } else {
      throw new Error(
        `Unknown QueenZoe action: ${action}`
      );
    }

    if (id) {
      sendResponse(
        id,
        true,
        result
      );
    }
  } catch (error) {
    queenError(
      `Command Failure :: ${action}`,
      error
    );

    if (id) {
      sendResponse(
        id,
        false,
        error.message ||
          String(error)
      );
    }
  }
}

// ---------------------------------------------------------
// Active Tab
// ---------------------------------------------------------

async function getActiveTabId() {
  const [tab] =
    await chrome.tabs.query({
      active: true,

      lastFocusedWindow: true
    });

  return tab?.id || null;
}

// ---------------------------------------------------------
// Tabs Runtime
// ---------------------------------------------------------

async function handleTabsCommand(
  action,
  params
) {
  switch (action) {
    case "tabs.query":
      return await chrome.tabs.query(
        params
      );

    case "tabs.create":
      return await chrome.tabs.create(
        params
      );

    case "tabs.close":
      return await chrome.tabs.remove(
        params.tabId ||
          params.tabIds
      );

    case "tabs.reload":
      return await chrome.tabs.reload(
        params.tabId
      );

    case "tabs.screenshot":
      return await chrome.tabs.captureVisibleTab(
        params.windowId,
        {
          format:
            params.format ||
            "jpeg",

          quality:
            params.quality ||
            90
        }
      );

    default:
      throw new Error(
        `Unknown tabs command: ${action}`
      );
  }
}

// ---------------------------------------------------------
// Window Runtime
// ---------------------------------------------------------

async function handleWindowsCommand(
  action,
  params
) {
  switch (action) {
    case "windows.getAll":
      return await chrome.windows.getAll(
        {
          populate: true
        }
      );

    case "windows.create":
      return await chrome.windows.create(
        params
      );

    case "windows.close":
      return await chrome.windows.remove(
        params.windowId
      );

    default:
      throw new Error(
        `Unknown windows command: ${action}`
      );
  }
}

// ---------------------------------------------------------
// Navigation Runtime
// ---------------------------------------------------------

async function handleNavigate(
  params
) {
  const tabId =
    params.tabId ||
    await getActiveTabId();

  if (!tabId) {
    throw new Error(
      "No active tab found"
    );
  }

  return await chrome.tabs.update(
    tabId,
    {
      url: params.url
    }
  );
}

// ---------------------------------------------------------
// DOM Runtime
// ---------------------------------------------------------

async function handleDomCommand(
  action,
  params
) {
  const tabId =
    params.tabId ||
    await getActiveTabId();

  if (!tabId) {
    throw new Error(
      "No active tab"
    );
  }

  if (
    action === "dom.evaluate"
  ) {
    return await executeRuntimeEvaluate(
      tabId,
      params.expression,
      params.awaitPromise
    );
  }

  const response =
    await chrome.tabs.sendMessage(
      tabId,
      {
        type: action,

        params
      }
    );

  return response;
}

// ---------------------------------------------------------
// Debugger Runtime
// ---------------------------------------------------------

async function handleDebuggerCommand(
  action,
  params
) {
  const tabId =
    params.tabId ||
    await getActiveTabId();

  const target = { tabId };

  switch (action) {
    case "debugger.attach":
      if (
        !attachedDebuggers.has(
          tabId
        )
      ) {
        await chrome.debugger.attach(
          target,
          "1.3"
        );

        attachedDebuggers.add(
          tabId
        );
      }

      return true;

    case "debugger.detach":
      if (
        attachedDebuggers.has(
          tabId
        )
      ) {
        await chrome.debugger.detach(
          target
        );

        attachedDebuggers.delete(
          tabId
        );
      }

      return true;

    case "debugger.sendCommand":
      if (
        !attachedDebuggers.has(
          tabId
        )
      ) {
        await chrome.debugger.attach(
          target,
          "1.3"
        );

        attachedDebuggers.add(
          tabId
        );
      }

      return await chrome.debugger.sendCommand(
        target,
        params.method,
        params.params
      );

    default:
      throw new Error(
        `Unknown debugger command: ${action}`
      );
  }
}

// ---------------------------------------------------------
// Runtime Evaluate
// ---------------------------------------------------------

async function executeRuntimeEvaluate(
  tabId,
  expression,
  awaitPromise
) {
  const target = { tabId };

  if (
    !attachedDebuggers.has(
      tabId
    )
  ) {
    await chrome.debugger.attach(
      target,
      "1.3"
    );

    attachedDebuggers.add(
      tabId
    );
  }

  return await chrome.debugger.sendCommand(
    target,
    "Runtime.evaluate",
    {
      expression,

      awaitPromise,

      returnByValue: true
    }
  );
}

// ---------------------------------------------------------
// Cleanup
// ---------------------------------------------------------

function cleanupDebuggers() {
  for (const tabId of attachedDebuggers) {
    chrome.debugger
      .detach({ tabId })
      .catch(() => {});
  }

  attachedDebuggers.clear();
}

// ---------------------------------------------------------
// Runtime Observability
// ---------------------------------------------------------

chrome.tabs.onActivated.addListener(
  activeInfo => {
    if (isConnected) {
      sendEvent(
        "queenzoe.tab.activated",
        activeInfo
      );
    }
  }
);

chrome.tabs.onUpdated.addListener(
  (
    tabId,
    changeInfo,
    tab
  ) => {
    if (
      isConnected &&
      (
        changeInfo.url ||
        changeInfo.status
      )
    ) {
      sendEvent(
        "queenzoe.tab.updated",
        {
          tabId,

          url: tab.url,

          status: tab.status
        }
      );
    }
  }
);

chrome.tabs.onCreated.addListener(
  tab => {
    if (isConnected) {
      sendEvent(
        "queenzoe.tab.created",
        tab
      );
    }
  }
);

chrome.tabs.onRemoved.addListener(
  tabId => {
    if (isConnected) {
      sendEvent(
        "queenzoe.tab.removed",
        {
          tabId
        }
      );
    }

    attachedDebuggers.delete(
      tabId
    );
  }
);

chrome.webNavigation.onCompleted.addListener(
  details => {
    if (isConnected) {
      sendEvent(
        "queenzoe.navigation.completed",
        details
      );
    }
  }
);
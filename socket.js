import { App, DEDICATED_DECOMPRESSOR_4KB } from "uWebSockets.js";
import memcached from "memcached";
import dotenv from "dotenv";
import winston from "winston";
import { createHash } from "crypto";

dotenv.config();

// Configure structured logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

// Error handling
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", { promise, reason });
});

// Configuration
const memcachedUrl = process.env.MEMCACHED_URL || "127.0.0.1:11211";
const cache = new memcached(memcachedUrl, {
  timeout: 500,
  retries: 2,
  retry: 3000,
  remove: true
});

const config = {
  port: parseInt(process.env.WS_PORT || "9088"),
  host: process.env.WS_HOST || "0.0.0.0",
  maxPayload: parseInt(process.env.MAX_PAYLOAD || "30720"), // 30KB
  messageLimit: parseInt(process.env.MESSAGE_LIMIT || "50"),
  preventDoubleAuth: process.env.PREVENT_DOUBLE_AUTH === "true",
};

// State management
const sheetSockets = new Map();          // sheetId -> Set<WebSocket>
const accountConnections = new Map();    // accountId -> Set<WebSocket>
const activeTokens = new Map();          // token -> { userId, accounts, ws }
const userIdToTokens = new Map();        // userId -> Set<token>
const meetingRooms = new Map();          // meetingCode -> Set<WebSocket>
const guestConnections = new Map();      // guestEmail -> WebSocket
const meetingChatMessages = new Map();   // meetingCode -> Array<ChatMessage>
const orgRooms = new Map();              // orgId -> Set<WebSocket>
const orgChatMessages = new Map();       // orgId -> Array<ChatMessage>

const decoder = new TextDecoder();
//const md5 = (data) => createHash("md5").update(data).digest("hex");

// Graceful shutdown
function cleanup() {
  logger.info("Initiating graceful shutdown");

  // Close all WebSocket connections
  activeTokens.forEach(({ ws }, token) => {
    try {
      ws && ws.close(1001, "Server shutdown");
    } catch (e) {
      logger.error("Error closing connection", { token, error: e.message });
    }
  });

  // Clear state
  sheetSockets.clear();
  accountConnections.clear();
  activeTokens.clear();
  userIdToTokens.clear();
  meetingRooms.clear();
  guestConnections.clear();
  meetingChatMessages.clear();
  orgRooms.clear();
  orgChatMessages.clear();

  // Close Memcached connection
  cache.end();
}

// Org Chat Utilities
async function storeOrgChatMessage(orgId, message) {
  try {
    if (!orgChatMessages.has(orgId)) {
      orgChatMessages.set(orgId, []);
    }
    const messages = orgChatMessages.get(orgId);
    messages.push(message);
    if (messages.length > config.messageLimit) {
      messages.splice(0, messages.length - config.messageLimit);
    }
    await new Promise((resolve, reject) => {
      cache.set(
        `org_chat_${orgId}`,
        JSON.stringify(messages),
        86400,
        err => err ? reject(err) : resolve()
      );
    });
    logger.debug('Stored org chat message', { orgId, messageId: message.id, messagesCount: messages.length });
  } catch (error) {
    logger.error('Failed to store org chat message', { orgId, error: error.message });
  }
}

function getOrgChatMessages(orgId) {
  return new Promise((resolve) => {
    if (orgChatMessages.has(orgId)) {
      return resolve(orgChatMessages.get(orgId));
    }
    cache.get(`org_chat_${orgId}`, (err, data) => {
      if (err) {
        logger.error('Error fetching org chat messages from cache', { orgId, error: err.message });
        return resolve([]);
      }
      try {
        const messages = data ? JSON.parse(data) : [];
        orgChatMessages.set(orgId, messages);
        resolve(messages);
      } catch (e) {
        logger.error('Corrupted org chat cache data', { orgId, error: e.message });
        orgChatMessages.set(orgId, []);
        resolve([]);
      }
    });
  });
}
process.on("SIGTERM", () => {
  logger.info("Received SIGTERM");
  cleanup();
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("Received SIGINT");
  cleanup();
  process.exit(0);
});

let app;

// WebSocket application
function createWebSocketApp() {
  app = App();

  // Special endpoint for server-to-server communication
  app.post("/special", (res, req) => {
    readJson(res,
      (data) => handleSpecialRequest(res, data),
      () => handleInvalidRequest(res)
    );
  });

  // Meeting notification endpoint
  app.post("/meeting-notification", (res, req) => {
    readJson(res,
      (data) => handleMeetingNotification(res, data),
      () => handleInvalidRequest(res)
    );
  });

  // Meeting room WebSocket handler
  app.ws("/meeting/*", {
    idleTimeout: 60,
    maxBackpressure: 1024 * 1024,
    maxPayloadLength: config.maxPayload,
    compression: DEDICATED_DECOMPRESSOR_4KB,
    sendPingsAutomatically: true,

    upgrade: (res, req, context) => {
      const meetingCode = req.getQuery('code');
      const guestEmail = req.getQuery("email");
      const guestName = req.getQuery("name");

      if (!meetingCode) {
        return res.cork(() => res.writeStatus("400 Bad Request").end("Missing meeting code"));
      }

      res.upgrade(
        {
          meetingCode,
          guestEmail,
          guestName,
          isGuest: !!guestEmail,
          connectionType: 'meeting'
        },
        req.getHeader('sec-websocket-key'),
        req.getHeader('sec-websocket-protocol'),
        req.getHeader('sec-websocket-extensions'),
        context
      );
    },

    open: (ws) => {
      ws.isAlive = true;

      // Add to meeting room connections
      if (ws.meetingCode) {
        if (!meetingRooms.has(ws.meetingCode)) {
          meetingRooms.set(ws.meetingCode, new Set());
        }
        meetingRooms.get(ws.meetingCode).add(ws);

        // Subscribe the client to the meeting topic
        ws.subscribe(`meeting:${ws.meetingCode}`);

        logger.info(`Client joined meeting room and subscribed to topic`, {
          meetingCode: ws.meetingCode,
          isGuest: ws.isGuest,
          guestEmail: ws.guestEmail
        });

        // Track guest connection separately for direct notifications
        if (ws.isGuest && ws.guestEmail) {
          guestConnections.set(ws.guestEmail, ws);
        }

        // Send ready message
        safeSend(ws, JSON.stringify({
          type: 'ready',
          data: {
            meetingCode: ws.meetingCode,
            timestamp: new Date().toISOString()
          }
        }));

        // Send chat history
        sendMeetingChatHistory(ws);
      }
    },

    message: (ws, message, isBinary) => {
      if (isBinary) {
        logger.warn('Received binary message, ignoring');
        return;
      }

      try {
        const data = JSON.parse(Buffer.from(message).toString());

        // Handle different message types
        if (data.type === 'chat_message') {
          handleMeetingChatMessage(ws, data);
        } else if (data.type === 'get_chat_history') {
          sendMeetingChatHistory(ws);
        } else {
          logger.warn('Unknown message type', { type: data.type });
        }
      } catch (error) {
        logger.error('Error processing message', { error: error.message });
      }
    },

    close: (ws, code, message) => {
      const meetingCode = ws.meetingCode;
      logger.info(`Client disconnected from meeting room: ${meetingCode}`, { code });

      // Unsubscribe from the meeting topic
      ws.unsubscribe(`meeting:${meetingCode}`);

      // Remove from meeting room connections
      if (meetingRooms.has(meetingCode)) {
        meetingRooms.get(meetingCode).delete(ws);

        // Clean up empty meeting rooms
        if (meetingRooms.get(meetingCode).size === 0) {
          meetingRooms.delete(meetingCode);
        }
      }

      // Remove guest connection tracking
      if (ws.isGuest && ws.guestEmail && guestConnections.has(ws.guestEmail)) {
        guestConnections.delete(ws.guestEmail);
      }
    }
  });

  // Main WebSocket handler
  app.ws("/*", {
    idleTimeout: 30,
    maxBackpressure: 1024 * 1024,
    maxPayloadLength: config.maxPayload,
    compression: DEDICATED_DECOMPRESSOR_4KB,
    sendPingsAutomatically: true,

    // Keep the pong handler to track client responses to our pings
    pong: (ws) => {
      ws.isAlive = true;
      logger.debug("Received pong from client", {
        userId: ws.userId || 'unknown',
        sheetId: ws.sheetId || 'unknown'
      });
    },

    upgrade: (res, req, context) => {
      const abort = { done: false };
      const token = req.getQuery("token");

      res.onAborted(() => {
        if (token) activeTokens.delete(token);
        abort.done = true;
      });

      const sheetId = req.getQuery("sheetId");

      if (sheetId) {
        handleSheetUpgrade(res, req, context, sheetId, abort);
      } else if (token) {
        try {
          handleTokenUpgrade(res, req, context, token, abort);
        } catch (e) {
          console.log('error', e);
          res.cork(() => {
            res.writeStatus("401 Unauthorized").end("Missing credentials");
          });
        }
      } else {
        res.cork(() => {
          res.writeStatus("401 Unauthorized").end("Missing credentials");
        });
      }
    },

    open: (ws) => {
      // Initialize connection as alive
      ws.isAlive = true;

      if (ws.sheetId) {
        handleSheetOpen(ws);
      } else {
        console.log('opening token', ws.token);
        try {
          handleTokenOpen(ws);
        } catch (e) {
          console.log('error', e);
          ws.end(1008, "Invalid session");
        }
      }
    },

    message: (ws, message, isBinary) => {
      // Reset the alive flag on any message
      // ws.isAlive = true;

      // Binary frames: treat as CRDT/Yjs updates and relay within the same sheet room
      if (isBinary) {
        if (ws.sheetId && sheetSockets.has(ws.sheetId)) {
          try {
            const peers = sheetSockets.get(ws.sheetId);
            peers.forEach((client) => {
              if (client !== ws) {
                // Forward binary payload as-is, compressed
                client.send(message, true, true);
              }
            });
          } catch (e) {
            logger.error("Error relaying binary update", { sheetId: ws.sheetId, error: e.message });
          }
        } else {
          logger.debug("Received binary message outside a sheet room; ignoring");
        }
        return;
      }

      // Handle manual ping messages from client (text)
      if (!isBinary) {
        // logger.info('message received', message);
        const text = decoder.decode(message);
        if (text === 'ping') {
          logger.debug("Received manual ping message", {
            userId: ws.userId || 'unknown',
            sheetId: ws.sheetId || 'unknown'
          });
          ws.send('pong', false, true); // Send 'pong' response, not binary, compressed
          return; // Skip further processing for ping messages
        }

        // Process normal messages
        if (ws.sheetId) {
          handleSheetMessage(ws, text);
        } else {
          try {
            handleTokenMessage(ws, text);
          } catch (e) {
            console.log('error', e);
            ws.end(1008, "Error processing message");
          }
        }
      }
    },

    close: (ws, code, message) => {
      if (ws.sheetId) {
        handleSheetClose(ws);
      } else {
        handleTokenClose(ws);
      }
    }
  });

  return app;
}

// Upgrade handlers
function handleSheetUpgrade(res, req, context, sheetId, abort) {
  const userId = req.getQuery("userId");
  const userName = req.getQuery("userName");
  const channel = req.getQuery("channel");
  const secWebSocketKey = req.getHeader("sec-websocket-key");
  const secWebSocketProtocol = req.getHeader("sec-websocket-protocol");
  const secWebSocketExtensions = req.getHeader("sec-websocket-extensions");

  if (!userId || !userName) {
    return res.cork(() => res.writeStatus("400 Bad Request").end("Missing user ID or name"));
  }

  if (abort.done) return;
  res.upgrade(
    { sheetId, userId, userName, channel },
    secWebSocketKey,
    secWebSocketProtocol,
    secWebSocketExtensions,
    context
  );
}

function handleTokenUpgrade(res, req, context, token, abort) {
  //important: Capture all required headers immediately as req object is stack-allocated
  const secWebSocketKey = req.getHeader('sec-websocket-key');
  const secWebSocketProtocol = req.getHeader('sec-websocket-protocol');
  const secWebSocketExtensions = req.getHeader('sec-websocket-extensions');

  cache.get(token, (err, serializedData) => {
    if (abort.done) return;

    let tokenData;
    try {
      tokenData = JSON.parse(serializedData);
    } catch (e) {
      return res.cork(() => res.writeStatus("401 Unauthorized").end("Invalid token"));
    }

    if (err || !tokenData || !tokenData.user_id || !tokenData.accounts || new Date() > new Date(tokenData.valid_until)) {
      return res.cork(() => res.writeStatus("401 Unauthorized").end("Invalid token data"));
    }

    validateAccounts(token, tokenData.accounts, (validAccounts) => {
      if (abort.done) return;

      if (validAccounts.length === 0) {
        return res.cork(() => res.writeStatus("403 Forbidden").end("No valid accounts"));
      }

      activeTokens.set(token, {
        userId: tokenData.user_id,
        accounts: validAccounts,
        ws: null,
        // Preserve org chat feature flag from token, defaulting to enabled when undefined
        org_chat_enabled: tokenData.org_chat_enabled !== false
      });

      if (!abort.done) {
        res.upgrade(
          {
            userId: tokenData.user_id,
            token,
            accounts: validAccounts,
            // Expose org chat flag on the ws instance for downstream handlers
            orgChatEnabled: tokenData.org_chat_enabled !== false
          },
          secWebSocketKey,
          secWebSocketProtocol,
          secWebSocketExtensions,
          context
        );
      }
    });
  });
}

function validateAccounts(currentToken, accountIds, callback) {
  if (!accountIds) return callback([]);

  const accountArray = Array.isArray(accountIds)
    ? accountIds
    : Object.values(accountIds).map(id => id.toString());

  // Use Promise.all directly
  Promise.all(accountArray.map(id =>
    new Promise(resolve =>
      cache.get(`active_token_${id}`, (err, storedToken) => {
        if (err) {
          console.error('Cache error:', err);
          resolve(null);
        } else {
          resolve(storedToken === currentToken ? id : null);
        }
      })
    )
  ))
  .then(results => callback(results.filter(Boolean)))
  .catch(error => {
    console.error('Validation error:', error);
    callback([]);
  });
}

// Connection handlers
function handleTokenOpen(ws) {
  const tokenData = activeTokens.get(ws.token);
  if (!tokenData) return ws.end(1008, "Invalid session");

  tokenData.ws = ws;

  // Manage token-user mapping
  // Feature flags
  ws.orgChatEnabled = tokenData.org_chat_enabled !== false;
  if (ws.userId && !userIdToTokens.has(ws.userId)) {
    // console.log('setting userIdToTokens', ws.userId);
    userIdToTokens.set(ws.userId, new Set());
  }
  userIdToTokens.get(ws.userId).add(ws.token);

  // Prevent duplicate connections
  if (config.preventDoubleAuth) {
    userIdToTokens.get(ws.userId).forEach(t => {
      if (t !== ws.token) {
        const existing = activeTokens.get(t);
        existing?.ws?.end(1008, "New connection established");
        activeTokens.delete(t);
      }
    });
  }

  // Manage account subscriptions
  ws.accounts.forEach(accountId => {
    // console.log('subscribing to account', accountId, 'with token', ws.token);
    if (!accountConnections.has(accountId)) {
      accountConnections.set(accountId, new Set());
    }
    accountConnections.get(accountId).add(ws);
  });

  //log subscribed topics
  // console.log('subscribed topics to confirm', ws.getTopics());

  ws.send(JSON.stringify({
    type: 'ready',
    status: 'authenticated'
  }));

  logger.info("Client connected", { userId: ws.userId, accounts: ws.accounts });
}

function handleTokenClose(ws) {
  const tokenData = activeTokens.get(ws.token) || {};

  // Cleanup account associations
  tokenData.accounts?.forEach(accountId => {
    accountConnections.get(accountId)?.delete(ws);
    cache.del(`active_token_${accountId}`);
  });

  // Cleanup user-token mapping
  if (userIdToTokens.has(ws.userId)) {
    const tokens = userIdToTokens.get(ws.userId);
    tokens.delete(ws.token);
    if (tokens.size === 0) userIdToTokens.delete(ws.userId);
  }

  // Cleanup token state
  activeTokens.delete(ws.token);
  cache.del(ws.token);

  if (ws.orgId && orgRooms.has(ws.orgId)) {
    orgRooms.get(ws.orgId).delete(ws);
    if (orgRooms.get(ws.orgId).size === 0) {
      orgRooms.delete(ws.orgId);
    } else {
      const peers = orgRooms.get(ws.orgId);
      const presence = JSON.stringify({ type: 'org_chat_presence', orgId: ws.orgId, count: peers.size });
      peers.forEach((client) => {
        safeSend(client, presence);
      });
    }
  }

  logger.info("Client disconnected", { userId: ws.userId });
}

// Message handlers
function handleTokenMessage(ws, rawMessage) {
  try {
    const message = JSON.parse(rawMessage);
    logger.info("Received account message", {
      userId: ws.userId,
      msgId: message.msg_id
    });

    if (message.type === 'org_chat_join') {
      if (!ws.orgChatEnabled) {
        logger.warn("Org chat not enabled for user", { userId: ws.userId });
        return;
      }

      const { employee_id, organization_id } = message;
      if (!employee_id || !organization_id) {
        logger.warn("Missing employee_id or organization_id in join request");
        return;
      }

      // Allow flexible employee_id formats and decouple from userId equality
      ws.orgId = String(organization_id);
      ws.employeeId = String(employee_id);

      if (!orgRooms.has(ws.orgId)) orgRooms.set(ws.orgId, new Set());
      orgRooms.get(ws.orgId).add(ws);

      safeSend(ws, JSON.stringify({ type: 'org_chat_ready', orgId: ws.orgId }));

      getOrgChatMessages(ws.orgId).then((messages) => {
        safeSend(ws, JSON.stringify({ type: 'org_chat_history', messages: messages.slice(-50) }));
        const peers = orgRooms.get(ws.orgId);
        if (peers && peers.size > 0) {
          const presence = JSON.stringify({ type: 'org_chat_presence', orgId: ws.orgId, count: peers.size });
          peers.forEach((client) => {
            safeSend(client, presence);
          });
        }
      }).catch((e) => logger.error('Failed to fetch org chat history', { error: e.message }));
      return;
    }

    if (message.type === 'org_chat_message') {
      if (!ws.orgChatEnabled) return;
      if (!ws.orgId || !ws.employeeId) {
        logger.warn("Attempted to send org chat message without joining", { userId: ws.userId });
        return;
      }

      const content = (message.content || '').toString();
      if (!content) return;

      const chat = {
        id: `${ws.employeeId}-${Date.now()}`,
        type: 'org_chat_message',
        content: content.slice(0, 2000),
        employeeId: ws.employeeId,
        userId: ws.userId,
        orgId: ws.orgId,
        timestamp: Date.now(),
      };

      storeOrgChatMessage(ws.orgId, chat).catch(() => {});
      const peers = orgRooms.get(ws.orgId);
      if (peers && peers.size > 0) {
        const payload = JSON.stringify(chat);
        peers.forEach((client) => {
          safeSend(client, payload);
        });
      }
      return;
    }

    if (message.type === 'org_chat_leave') {
      if (!ws.orgId) return;
      const orgId = ws.orgId;
      const room = orgRooms.get(orgId);
      if (room) {
        room.delete(ws);
        if (room.size === 0) {
          orgRooms.delete(orgId);
        }
        const peers = orgRooms.get(orgId);
        const presence = JSON.stringify({ type: 'org_chat_presence', orgId, count: peers ? peers.size : 0 });
        if (peers && peers.size > 0) {
          peers.forEach((client) => {
            safeSend(client, presence);
          });
        }
      }
      ws.orgId = undefined;
      ws.employeeId = undefined;
      return;
    }

    if (message.type === 'get_org_chat_history') {
      if (!ws.orgId) return;
      getOrgChatMessages(ws.orgId).then((messages) => {
        safeSend(ws, JSON.stringify({ type: 'org_chat_history', messages: messages.slice(-50) }));
      }).catch(() => {});
      return;
    }

    if (message.subject) {
      message.msg = {
        ...message.msg,
        is_failed: true,
        subject: message.subject,
        to: message.to
      };
    }

    publishMessages(
      message.msg,
      [message.user_id],
      message.user_id,
      message.msg_id
    );
  } catch (error) {
    logger.error("Account message processing failed", {
      userId: ws.userId,
      error: error.message
    });
  }
}

// Handle meeting notifications (access approvals, etc)
function handleMeetingNotification(res, data) {
  try {
    logger.info('Received meeting notification', { type: data.type });

    if (!data || !data.type) {
      res.cork(() => res.writeStatus('400 Bad Request').end(JSON.stringify({
        success: false,
        message: 'Invalid notification format'
      })));
      return;
    }

    // Handle meeting access approvals
    if (data.type === 'access_approved') {
      const { meetingCode, guestEmail, guest_token } = data;

      // Broadcast to all connections in the meeting room
      if (meetingCode && meetingRooms.has(meetingCode)) {
        const connections = meetingRooms.get(meetingCode);
        const message = JSON.stringify({
          type: 'meeting_access_approved',
          data: {
            email: guestEmail,
            approved_by: data.approved_by || 'Host',
            guest_token: guest_token || null,
            timestamp: new Date().toISOString()
          }
        });

        logger.info(`Broadcasting meeting access approval to ${connections.size} connections`, {
          meetingCode,
          guestEmail
        });

        connections.forEach(ws => {
          safeSend(ws, message);
        });
      }

      // Direct notification to the specific guest if connected
      if (guestEmail && guestConnections.has(guestEmail)) {
        const ws = guestConnections.get(guestEmail);
        const message = JSON.stringify({
          type: 'meeting_access_approved',
          data: {
            email: guestEmail,
            approved_by: data.approved_by || 'Host',
            guest_token: guest_token || null,
            timestamp: new Date().toISOString()
          }
        });

        logger.info(`Sending direct meeting access approval to guest`, {
          guestEmail
        });

        safeSend(ws, message);
      }
    }

    // Handle other meeting notification types here

    res.cork(() => res.writeStatus('200 OK').end(JSON.stringify({
      success: true,
      message: 'Notification processed'
    })));
  } catch (error) {
    logger.error('Error processing meeting notification', {
      error: error.message,
      stack: error.stack
    });

    res.cork(() => res.writeStatus('500 Internal Server Error').end(JSON.stringify({
      success: false,
      message: 'Error processing notification'
    })));
  }
}

// Minimal JSON body reader for uWebSockets.js HTTP routes
function readJson(res, onSuccess, onError) {
  let buffer;
  res.onData((ab, isLast) => {
    const chunk = Buffer.from(ab);
    buffer = buffer ? Buffer.concat([buffer, chunk]) : chunk;
    if (isLast) {
      try {
        const data = JSON.parse(buffer.toString());
        onSuccess(data);
      } catch (e) {
        onError();
      }
    }
  });
  res.onAborted(() => {
    // Do not attempt to write any response after abort; just drop the request
    buffer = undefined;
  });
}

function handleInvalidRequest(res) {
  res.cork(() => res.writeStatus("400 Bad Request").end());
}

function handleSpecialRequest(res, data) {
  if (!data || !data.msg_id || !data.target || !data.user_id) {
    logger.error("Invalid special request payload", {
      hasMsg: !!data?.msg,
      hasTarget: !!data?.target,
      hasUserId: !!data?.user_id,
    });
    return res.cork(() => res.writeStatus("400 Bad Request").end());
  }

  logger.info("Processing special mail notification", {
    userId: data.user_id,
    msgId: data.msg_id,
    hasMsg: !!data.msg,
  });

  // For mail notifications, we only care about the user and deliver
  // directly to all of their active WebSocket connections.
  publishMessages(data.msg, [data.user_id], data.user_id, data.msg_id);

  return res.cork(() => res.writeStatus("200 OK").end("Message queued"));
}

// Create a compact representation of a special request suitable for caching
function publishMessages(msg, accountIds, userId, msgId) {
  const userKey = String(userId);
  const tokens = userIdToTokens.get(userKey);

  if (!tokens || tokens.size === 0) {
    logger.debug("No active tokens for user, dropping message", { userId, msgId });
    return;
  }

  logger.info("Publishing message to active tokens", {
    userId,
    msgId,
    tokenCount: tokens.size,
  });

  const payload = JSON.stringify({
    from: userId,
    msg,
    msg_id: msgId,
  });

  tokens.forEach((token) => {
    const tokenData = activeTokens.get(token);
    const ws = tokenData?.ws;
    if (ws) {
      safeSend(ws, payload);
    }
  });
}

function safeSend(ws, message) {
  try {
    ws.send(message, false, true);
  } catch (e) {
    logger.error("Failed to send message", { error: e.message });
  }
}

async function handleJoinSheet(ws, sheetId) {
  if (!sheetSockets.has(sheetId)) {
    sheetSockets.set(sheetId, new Set());
  }
  sheetSockets.get(sheetId).add(ws);

  // Send cached messages to the new user
  const cachedMessages = await getCachedMessages(sheetId);
  console.log(ws);
  safeSend(ws,
    JSON.stringify({
      type: "init",
      sheetId,
      messages: cachedMessages,
    })
  );

  // Notify other users about the new user joining
  broadcastToSheet(
    sheetId,
    JSON.stringify({
      type: "user_joined",
      sheetId,
      user: { id: ws.userId, name: ws.userName },
    }),
    ws
  );
}

function handleLeaveSheet(ws, sheetId) {
  const connections = sheetSockets.get(sheetId);
  if (connections) {
    connections.delete(ws);
    if (connections.size === 0) {
      sheetSockets.delete(sheetId);
    }
  }

  // Notify other users about the user leaving
  broadcastToSheet(
    sheetId,
    JSON.stringify({
      type: "user_left",
      sheetId,
      user: { id: ws.userId, name: ws.userName },
    })
  );
}


function handleSheetOpen(ws) {
  if (!sheetSockets.has(ws.sheetId)) {
    sheetSockets.set(ws.sheetId, new Set());
  }
  sheetSockets.get(ws.sheetId).add(ws);

  // Skip init/users broadcast for CRDT transport-only sockets
  if (ws.channel !== 'crdt') {
    // Send initialization data (exclude CRDT sockets from users list)
    getCachedMessages(ws.sheetId)
      .then(messages => {
        const connections = sheetSockets.get(ws.sheetId) || new Set();
        const users = Array.from(connections)
          .filter(s => s.channel !== 'crdt')
          .map(s => ({ id: s.userId, name: s.userName }));
        safeSend(ws, JSON.stringify({
          type: "init",
          sheetId: ws.sheetId,
          messages,
          users,
        }));
      })
      .catch(error => {
        logger.error("Failed to load cached messages", {
          sheetId: ws.sheetId,
          error: error.message
        });
      });

    // Notify other users about the new user joining
    broadcastToSheet(
      ws.sheetId,
      JSON.stringify({
        type: "user_joined",
        user: { id: ws.userId, name: ws.userName }
      }),
      ws
    );
  }

  logger.info("Sheet connection opened", {
    sheetId: ws.sheetId,
    userId: ws.userId,
    userName: ws.userName
  });
}

function handleSheetClose(ws) {
  if (sheetSockets.has(ws.sheetId)) {
    const connections = sheetSockets.get(ws.sheetId);
    connections.delete(ws);

    if (connections.size === 0) {
      sheetSockets.delete(ws.sheetId);
    }

    // Skip user_left for CRDT transport-only sockets
    if (ws.channel !== 'crdt') {
      broadcastToSheet(
        ws.sheetId,
        JSON.stringify({
          type: "user_left",
          user: { id: ws.userId, name: ws.userName }
        })
      );
    }
  }

  logger.info("Sheet connection closed", {
    sheetId: ws.sheetId,
    userId: ws.userId
  });
}

// Sheet Utilities
async function storeChatMessage(sheetId, message) {
  try {
    const messages = await getCachedMessages(sheetId);
    messages.push(message);

    if (messages.length > config.messageLimit) {
      messages.splice(0, messages.length - config.messageLimit);
    }

    await new Promise((resolve, reject) => {
      cache.set(
        `messages_${sheetId}`,
        JSON.stringify(messages),
        86400,
        err => err ? reject(err) : resolve()
      );
    });
  } catch (error) {
    logger.error("Failed to store chat message", {
      sheetId,
      error: error.message
    });
  }
}

function getCachedMessages(sheetId) {
  return new Promise((resolve, reject) => {
    cache.get(`messages_${sheetId}`, (err, data) => {
      if (err) return reject(err);
      try {
        resolve(data ? JSON.parse(data) : []);
      } catch (e) {
        logger.error("Corrupted cache data", { sheetId });
        resolve([]);
      }
    });
  });
}

function broadcastToSheet(sheetId, message, excludeWs = null) {
  const connections = sheetSockets.get(sheetId);
  if (connections) {
    connections.forEach(client => {
      if (client !== excludeWs) {
        safeSend(client, message);
      }
    });
  }
}

function broadcastToMeetingRoom(meetingCode, message, excludeWs = null) {
  // Use the WebSocket subscription model to broadcast messages
  logger.debug(`Broadcasting to meeting room: ${meetingCode}`, { meetingCode });

  // Publish to the meeting topic
  app.publish(`meeting:${meetingCode}`, message, false);

  // If we need to exclude a specific client, we can't do that with the subscription model
  // But this is rarely needed, and the client can filter out its own messages if needed
}

/**
 * Handle a chat message from a meeting room client
 * @param {WebSocket} ws - The WebSocket connection
 * @param {object} data - The message data
 */
async function handleMeetingChatMessage(ws, data) {
  if (!ws.meetingCode) {
    logger.error('Received chat message for unknown meeting', { data });
    return;
  }

  try {
    // Validate message format
    if (!data.content || typeof data.content !== 'string') {
      logger.warn('Invalid chat message format', { data });
      return;
    }

    // Create a standardized message object
    const chatMessage = {
      id: `${ws.guestEmail || ws.userId || 'anonymous'}-${Date.now()}`,
      type: 'chat_message',
      content: data.content.slice(0, 2000), // Limit message length
      senderName: data.senderName || ws.guestName || ws.userName || 'Anonymous',
      senderEmail: ws.guestEmail || ws.userEmail || 'anonymous@example.com',
      isGuest: !!ws.isGuest,
      timestamp: Date.now(),
      meetingCode: ws.meetingCode
    };

    // Store the message
    await storeMeetingChatMessage(ws.meetingCode, chatMessage);

    // Publish the message to the meeting topic
    // This will reach all subscribed clients, including the sender
    app.publish(`meeting:${ws.meetingCode}`, JSON.stringify(chatMessage), false);

    logger.info('Chat message processed and published', {
      meetingCode: ws.meetingCode,
      messageId: chatMessage.id,
      senderName: chatMessage.senderName
    });
  } catch (error) {
    logger.error('Error processing meeting chat message', {
      meetingCode: ws.meetingCode,
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Send chat history to a client that just joined a meeting room
 * @param {WebSocket} ws - The WebSocket connection
 */
async function sendMeetingChatHistory(ws) {
  if (!ws.meetingCode) {
    logger.error('Cannot send chat history for unknown meeting', { ws });
    return;
  }

  try {
    // Get the chat history
    const messages = await getMeetingChatMessages(ws.meetingCode);

    // Only send the last 20 messages to avoid overwhelming the client
    const recentMessages = messages.slice(-20);

    // Send the chat history directly to this client only
    safeSend(ws, JSON.stringify({
      type: 'chat_history',
      messages: recentMessages,
      timestamp: Date.now()
    }));

    logger.debug('Sent chat history to client', {
      meetingCode: ws.meetingCode,
      messageCount: recentMessages.length
    });
  } catch (error) {
    logger.error('Error sending chat history', {
      meetingCode: ws.meetingCode,
      error: error.message
    });
  }
}

// Meeting Chat Functions

/**
 * Store a chat message for a meeting room
 * @param {string} meetingCode - The meeting code
 * @param {object} message - The chat message object
 */
async function storeMeetingChatMessage(meetingCode, message) {
  try {
    // Get existing messages or initialize empty array
    if (!meetingChatMessages.has(meetingCode)) {
      meetingChatMessages.set(meetingCode, []);
    }

    const messages = meetingChatMessages.get(meetingCode);
    messages.push(message);

    // Limit the number of messages stored in memory
    if (messages.length > config.messageLimit) {
      messages.splice(0, messages.length - config.messageLimit);
    }

    // Store in memcached for persistence
    await new Promise((resolve, reject) => {
      cache.set(
        `meeting_chat_${meetingCode}`,
        JSON.stringify(messages),
        86400, // 24 hours TTL
        err => err ? reject(err) : resolve()
      );
    });

    logger.debug('Stored meeting chat message', {
      meetingCode,
      messageId: message.id,
      messagesCount: messages.length
    });
  } catch (error) {
    logger.error('Failed to store meeting chat message', {
      meetingCode,
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Get cached chat messages for a meeting room
 * @param {string} meetingCode - The meeting code
 * @returns {Promise<Array>} - Array of chat messages
 */
function getMeetingChatMessages(meetingCode) {
  return new Promise((resolve, reject) => {
    // First check in-memory cache
    if (meetingChatMessages.has(meetingCode)) {
      return resolve(meetingChatMessages.get(meetingCode));
    }

    // Otherwise check memcached
    cache.get(`meeting_chat_${meetingCode}`, (err, data) => {
      if (err) {
        logger.error('Error fetching meeting chat messages from cache', {
          meetingCode,
          error: err.message
        });
        return resolve([]);
      }

      try {
        const messages = data ? JSON.parse(data) : [];

        // Update in-memory cache
        meetingChatMessages.set(meetingCode, messages);

        resolve(messages);
      } catch (e) {
        logger.error('Corrupted meeting chat cache data', { meetingCode, error: e.message });
        meetingChatMessages.set(meetingCode, []);
        resolve([]);
      }
    });
  });
}

function handleSheetMessage(ws, rawMessage) {
  try {
    const message = JSON.parse(rawMessage);
    logger.debug("Received sheet message", {
      sheetId: ws.sheetId,
      userId: ws.userId,
      type: message.type
    });

    switch (message.type) {
      case "join":
        handleJoinSheet(ws, message.sheetId);
        break;
      case "leave":
        handleLeaveSheet(ws, message.sheetId);
        break;
      case "chat":
        handleChatMessage(ws, message);
        break;
      case "cursor":
      case "change":
      case "title":
        handleSheetOperation(ws, message);
        break;
      default:
        logger.warn("Unknown message type", { type: message.type });
    }
  } catch (error) {
    logger.error("Message processing failed", {
      sheetId: ws.sheetId,
      userId: ws.userId,
      error: error.message
    });
  }
}

async function handleChatMessage(ws, message) {
  const chatMessage = {
    id: `${ws.userId}-${Date.now()}`,
    type: "chat",
    content: message.content,
    sheetId: ws.sheetId,
    user: { id: ws.userId, name: ws.userName },
    timestamp: Date.now(),
    replyTo: message.replyTo
  };

  await storeChatMessage(ws.sheetId, chatMessage);
  broadcastToSheet(ws.sheetId, JSON.stringify(chatMessage));
}

function handleSheetOperation(ws, message) {
  const operation = {
    ...message,
    user: { id: ws.userId, name: ws.userName },
    timestamp: Date.now(),
  };

  broadcastToSheet(ws.sheetId, JSON.stringify(operation), ws);
}

// Server initialization
(async () => {
  try {
    await new Promise((resolve, reject) => {
      cache.connect(memcachedUrl, (err) => {
        if (err) {
          logger.error("Memcached connection failed", { error: err.message });
          reject(err);
        } else {
          logger.info("Memcached connected successfully");
          resolve();
        }
      });
    });

    const wsApp = createWebSocketApp();
    wsApp.listen(config.host, config.port, (token) => {
      logger.info("WebSocket server listening", {
        host: config.host,
        port: config.port,
      });
    });
  } catch (error) {
    logger.error("Server initialization failed", { error: error.message });
    process.exit(1);
  }
})();

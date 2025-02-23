import { creatorX } from "./handlers/page/webhook.js";
import { createDiscordListener } from "./handlers/discord/discordLogin.js";
import { tphHandler } from "./handlers/talkersPH/tphHandler.js";
const http = require("http");
const WebSocket = require("ws");
export class Listener {
  constructor({ api, app }) {
    this.api = api;
    this.app = app;
    this.callback = () => {};
    if (api?.sendMessage) {
      const e = api?.listenMqtt?.((err, event) => {
        this.#callListener(err, event);
      });
    }
    app.post("/listenMsg", (req, res) => {
      try {
        const event = req.body;
        this.#callListener(undefined, event);
        res.json(event);
      } catch (err) {
        res.send({
          error: err.message,
        });
      }
    });
    const { handleEvents, handleGetEvents, pageApi } = creatorX(this.callback);
    app.post("/webhook", handleEvents);
    app.get("/webhook", handleGetEvents);
    this.pageApi = pageApi;
    const httpServer = http.createServer(app);

    const wss = new WebSocket.Server({
      server: httpServer,
      path: "/ws",
    });
    global.logger("Server created.", "Websocket");
    this.httpServer = httpServer;
    this.wss = wss;
    app.get("/ws-url", (req, res) => {
      res.json({
        url: `wss://${req.headers.host}/ws`,
      });
    });
  }
  async startListen(callback = () => {}) {
    this.callback = callback;
    try {
      handleWebSocket(this.wss, this.callback);
      // await createDiscordListener(this.callback);
      // await tphHandler(this.callback);
    } catch (error) {
      console.log(error);
    }
  }
  async #callListener(err, data, willEvent) {
    try {
      this.callback(err, willEvent ? new Event(data) : data);
    } catch (error) {
      console.log(error);
    }
  }
  _call = this.#callListener;
}
import axios from "axios";
export const pref = "w@";
export async function postEvent(event) {
  try {
    const response = await axios.post("http://localhost:8000/listenMsg", event);
    return response.data;
  } catch (err) {
    throw err;
  }
}

export function formatIP(ip) {
  try {
    ip = ip?.replaceAll("custom_", "");

    const formattedIP = ip
      .split("")
      .map((char) => {
        const ascii = char.charCodeAt(0);
        return `${ascii % 10}${ascii % 5 === 0 ? ":" : "-"}`;
      })
      .join("");

    return `${pref}${formattedIP}`;
  } catch (error) {
    console.error("Error in formatting IP:", error);
    return ip;
  }
}

export function formatIPLegacy(ip) {
  try {
    const encodedIP = Buffer.from(ip)
      .toString("base64")
      .replace(/[+/=]/g, (match) => ({ "+": "0", "/": "1", "=": "" }[match]));
    return `${pref}${encodedIP}`;
  } catch (error) {
    return ip;
  }
}
export function generateWssMessageID() {
  const ID =
    "wss-mid_" + Date.now() + "_" + Math.random().toString(36).substring(7);

  return ID;
}

export function formatWssEvent(event) {
  const { WEB_PASSWORD } = global.Cassidy.config;
  return {
    ...event,
    body: String(event.body || ""),
    senderID: event.senderID
      ? formatIP(`${event.senderID}`)
      : event.password === WEB_PASSWORD
      ? "wss:admin"
      : "wss:main",
    threadID: "wss:main",
    type: event.type,
    timestamp: event.timestamp || Date.now().toString(),
    attachments: [],
    messageID: event.messageID || generateWssMessageID(),
    isWss: true,
    isGroup: true,
    messageReply: event.messageReply || null,
    ...(event.type === "message_reaction"
      ? {
          userID: event.password === WEB_PASSWORD ? "wss:admin" : "wss:main",
          senderID: "wss:bot",
        }
      : {}),
  };
}
export class Event {
  constructor({ ...info } = {}) {
    let defaults = {
      body: "",
      senderID: "0",
      threadID: "0",
      messageID: "0",
      type: "message",
      timestamp: Date.now().toString(),
      isGroup: false,
      participantIDs: [],
      attachments: [],
      mentions: {},
      isWeb: true,
    };
    Object.assign(this, defaults, info);
    if (this.userID && this.isWeb) {
      this.userID = formatIP(this.senderID);
    }
    this.senderID = formatIP(this.senderID);
    this.threadID = formatIP(this.threadID);
    if (this.messageReply) {
      this.messageReply.senderID = formatIP(this.messageReply.senderID);
    }
    if (Array.isArray(this.participantIDs)) {
      this.participantIDs = this.participantIDs.map((id) => formatIP(id));
    }

    if (Object.keys(this.mentions ?? {}).length > 0) {
      this.mentions = Object.fromEntries(Object.entries(this.mentions).map((i) => [
        formatIP(i[0]),
        i[1],
      ]));
    }
  }
}

import fs from "fs";
export function genericPage(...replacer) {
  return pageParse("public/generic.html", ...replacer);
}
export function pageParse(filepath, ...replacer) {
  let content = fs.readFileSync(filepath, "utf-8");

  replacer.forEach((replacerItem) => {
    if (typeof replacerItem !== "object" || replacerItem === null) {
      return;
    }

    for (const key in replacerItem) {
      const data = replacerItem[key];
      const regex = new RegExp(`\\{\\{ ${key} \\}\\}`, "g");

      if (data?.startsWith("fs:")) {
        try {
          content = content.replace(regex, () =>
            fs.readFileSync(data.slice(3), "utf-8")
          );
        } catch (error) {
          content = content.replace(regex, "Error loading file");
        }
      } else {
        content = content.replace(regex, data);
      }
    }
  });

  replacer.forEach((value, index) => {
    if (typeof value !== "string") {
      return;
    }
    const placeholder = new RegExp(`\\$${index + 1}(?![0-9])`, "g");
    content = content.replace(placeholder, value);
  });

  return content;
}
export async function aiPage(prompt) {
  const whatToDo = `Create a full effort, very satisfying, decent, and a very long HTML page with complete css, use the json below as guide, make sure to make it dark theme and add gradient texts, send it as HTML without comments.
  
  ${prompt}`;
  try {
    const {
      data: { message },
    } = await axios.get(
      "https://lianeapi.onrender.com/ask/gpt?query=" +
        encodeURIComponent(whatToDo)
    );
    fs.writeFileSync(`public/aiResults/ai${Date.now()}.html`, message);
    return message;
  } catch (error) {
    return prompt;
  }
}

export async function takeScreenshot(id, url, facebook) {
  try {
    if (facebook) {
      id = formatIP("custom_" + id);
    }
    const encodedId = encodeURIComponent(id);
    const response = await axios.get("https://api.screenshotone.com/take", {
      params: {
        access_key: "nbBijYDFzYIzSw",
        url: `https://${url}/underpic.html?id=${encodedId}`,
        full_page: false,
        viewport_width: 500,
        viewport_height: 250,
        device_scale_factor: 1,
        format: "png",
        image_quality: 100,
        omit_background: true,
        block_ads: true,
        block_cookie_banners: true,
        block_banners_by_heuristics: false,
        block_trackers: true,
        delay: 1,
        timeout: 60,
        wait_until: "domcontentloaded",
        time_zone: "Asia/Shanghai",
      },
      responseType: "arraybuffer",
    });
    return response.data;
  } catch (error) {
    console.error(error);
  }
}

export class WssAPI {
  constructor(socket) {
    this._socket = socket;
    this._queue = [];
  }
  sendMessage(message, _, ...args) {
    let body;
    if (typeof message === "string") {
      body = {
        body: message,
      };
    } else if (typeof message === "object") {
      body = {
        ...message,
        body: String(message.body || ""),
      };
    }
    let messageReply = null;
    let argg =
      typeof args[0] === "string"
        ? args[0]
        : typeof args[1] === "string"
        ? args[1]
        : null;
    if (typeof argg === "string") {
      messageReply = {
        messageID: argg,
        senderID: "wss:main",
      };
    }
    const self = this;
    return new Promise((resolve) => {
      self._queue.push({
        resolve(data) {
          const callback =
            typeof args[0] === "function"
              ? args[0]
              : typeof args[1] === "function"
              ? args[1]
              : () => {};
          callback(null, data);
          resolve(data);
        },
      });
      handleMessage(
        self._socket,
        {
          body: body.body,
          botSend: true,
          messageReply,
        },
        null,
        self
      );
    });
  }
  async editMessage(str, messageID, callback) {
    console.log(`Editing ${messageID} with: ${str}`);
    handleEditMessage(this._socket, { body: str, messageID });
    if (callback) {
      callback(true, true);
    }
  }
  getCurrentUserID() {
    return "wss:bot";
  }
}
export function handleWebSocket(ws, funcListen) {
  ws.on("connection", (socket) => {
    const api = new WssAPI(socket);
    socket.on("message", (i) => {
      const data = JSON.parse(i);
      if (socket._xPassword) {
        data.password = socket._xPassword;
      }
      //console.log(data);
      function listenCall({ ...props } = {}) {
        const payload = { ...formatWssEvent({ ...data, ...props }) };
        funcListen(null, payload, { wssApi: api });
      }
      if (data.botSend) {
        return;
      }
      switch (data.type) {
        case "login":
          const { WEB_PASSWORD } = global.Cassidy.config;
          if (data.password !== WEB_PASSWORD) {
            socket.send(
              JSON.stringify({
                type: "login_failure",
              })
            );
          } else {
            socket._xPassword = data.password;
          }
          break;
        case "message":
          handleMessage(socket, data, listenCall, api);
          break;
        case "message_reply":
          handleMessage(socket, data, listenCall, api);
          break;
        case "message_reaction":
          handleReaction(socket, data, listenCall, api);
      }
    });
  });
}
export function handleReaction(socket, { messageID, reaction }, listenCall) {
  const payload = formatWssEvent({
    type: "message_reaction",
    messageID,
    reaction,
  });
  listenCall(payload);
}
export function handleEditMessage(socket, { body, messageID }) {
  if (socket) {
    socket.send(
      JSON.stringify({
        type: "message_edit",
        body: String(body),
        messageID,
      })
    );
  }
}
export function handleMessage(socket, data, listenCall, api) {
  let { body, messageReply, botSend } = data;
  const messageID = generateWssMessageID();
  listenCall ??= function () {};
  if (socket) {
    console.log(`Sending data with messageID: ${messageID}`);
    socket.send(
      JSON.stringify({
        type: messageReply ? "message_reply" : "message",
        body: String(body),
        messageID,
        ...(messageReply
          ? {
              messageReply: {
                senderID: "wss:bot",
                ...messageReply,
              },
            }
          : {}),
        botSend: !!botSend,
      })
    );
  }
  if (botSend && api._queue.length > 0) {
    const { resolve } = api._queue.shift();
    if (resolve) {
      resolve(formatWssEvent({ ...data, messageID }));
      console.log(`Resolved data with messageID: ${messageID}`);
    }
    return;
  }

  listenCall();
}

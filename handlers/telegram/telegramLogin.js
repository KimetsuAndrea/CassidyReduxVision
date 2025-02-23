import { convertTelegramEvent } from "./convertTelegramEvent.js";
import { TelegramAPI } from "./API.js";

const { createRequire } = require('module');

const { originalRequire = createRequire(__filename) } = global;



export function isValidTelegramCmd(name) {
  const regex = /^[a-z0-9]+$/;
  return regex.test(name);
}

export async function createTelegramListener(funcListen) {
  const { GatewayIntentBits, Client, Events, REST, Routes } = global.telegramJS;
  const botToken = global.Cassidy.config.telegramBotToken;
  if (!botToken) {
    global.logger(
      "Telegram bot token not found. Skipping Telegram listener setup.",
      "telegram"
    );
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  const restartBot = async () => {
    global.logger("Attempting to restart the bot...", "telegram");
    await client.destroy();
    createTelegramListener(funcListen);
  };

  const handleEvent = async (event) => {
    if (event.author?.bot) {
      return;
    }
    const api = new TelegramAPI(event, client);

    try {
      const convertedEvent = convertTelegramEvent(event);
      if (event.senderID === `telegram:${client.user.id}`) {
        return;
      }
      funcListen(null, convertedEvent, { telegramApi: api });
    } catch (error) {
      funcListen(error, null, { telegramApi: api });
      global.logger(`Error converting Telegram event: ${error}`, "telegram");
    }
  };

  client.on(Events.MessageCreate, handleEvent);
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;
    interaction.reply(
      `Slash commands are currently unsupported in Cassidy, use ${global.Cassidy.config.PREFIX}${interaction.commandName}`
    );
  });

  client.on(Events.ClientReady, async () => {
    const commands = [];
    const originalCommands = global.Cassidy.commands;
    for (const name in originalCommands) {
      const { meta, entry } = originalCommands[name];
      const newName = String(name).toLowerCase();
      if (!isValidTelegramCmd(newName)) {
        continue;
      }
      commands.push({
        name: newName,
        description: String(meta.description || "No Description"),
      });
    }
    const CLIENT_ID = global.Cassidy.config.telegramClientID;
    global.logger(`Telegram bot logged in as ${client.user.tag}`, "telegram");
    const rest = new REST({ version: "10" }).setToken(botToken);

    try {
      global.logger("Started refreshing application (/) commands.", "telegram");

      await rest.put(Routes.applicationCommands(CLIENT_ID), {
        body: commands,
      });

      global.logger(
        "Successfully reloaded application (/) commands.",
        "telegram"
      );
    } catch (error) {
      console.error(error);
      if (!error.rawError) return;
      for (const index in error.rawError.errors) {
        console.log(commands[index]);
      }
    }
  });

  client.on("messageReactionAdd", (reaction, user) => {
    if (!user.bot) {
      handleEvent(reaction.message);
    }
  });

  client.on("messageReactionRemove", (reaction, user) => {
    if (!user.bot) {
      handleEvent(reaction.message);
    }
  });

  client.on("error", (error) => {
    global.logger(`Telegram client error: ${error.message}`, "telegram");
    restartBot();
  });

  client.on("shardError", (error) => {
    global.logger(`A websocket connection encountered an error: ${error}`, "telegram");
    restartBot();
  });

  client.on("disconnect", () => {
    global.logger("Bot disconnected from Telegram.", "telegram");
    restartBot();
  });

  client.on("reconnecting", () => {
    global.logger("Bot reconnecting to Telegram...", "telegram");
  });

  client.on("resume", () => {
    global.logger("Bot resumed connection to Telegram.", "telegram");
  });

  try {
    global.logger("Logging into Telegram...", "telegram");
    await client.login(botToken);
    global.logger("Successfully logged in to Telegram.", "telegram");
  } catch (error) {
    global.logger(
      `Failed to log in to Telegram:
${JSON.stringify(error, null, 2)}`,
      "telegram"
    );
    restartBot();
  }
}

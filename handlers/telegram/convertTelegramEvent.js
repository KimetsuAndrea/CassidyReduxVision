export function convertDiscordEvent(telegramMessage) {
  let event = {};

  if (typeof telegramMessage.isCommand === "function" && telegramMessage.isCommand()) {
    const args = telegramMessage.options.map(option => String(option?.value));
    const body = ["/", telegramMessage.commandName, ...args].join(" ");

    event = {
      type: "command",
      commandName: telegramMessage.commandName,
      senderID: encodeDCID(telegramMessage.user.id),
      timestamp: telegramMessage.createdTimestamp,
      isDiscord: true,
      body: body,
      threadID:
        type === "GUILD_TEXT" && telegramMessage.channel.parent
          ? encodeDCID(telegramMessage.channel.parentId)
          : encodeDCID(telegramMessage.channel.id),
      getDiscordInfo() {
        return telegramMessage;
      },
    };
  } else if (typeof telegramMessage.isInteraction === "function" && telegramMessage.isInteraction()) {
    event = {
      type: "interaction",
      interactionID: telegramMessage.id,
      senderID: encodeDCID(telegramMessage.user.id),
      timestamp: telegramMessage.createdTimestamp,
      isDiscord: true,
      body: "",
      threadID: encodeDCID(telegramMessage.user.id),
      getDiscordInfo() {
        return telegramMessage;
      },
    };
  } else {
    const {
      content,
      reactions,
      author,
      createdTimestamp,
      referencedMessage,
      attachments,
      channel,
    } = telegramMessage;

    const reaction = reactions.cache.size > 0 ? reactions.cache.first() : null;
    const senderID = reaction
      ? `${encodeDCID(reaction.users.cache.first().id)}`
      : `${encodeDCID(author.id)}`;
    const userID = reaction
      ? `${encodeDCID(reaction.users.cache.first().id)}`
      : null;

    event = {
      type: reaction
        ? "message_reaction"
        : referencedMessage
          ? "message_reply"
          : "message",
      senderID: senderID,
      timestamp: createdTimestamp,
      body: reaction ? "" : content,
      userID: userID,
      messageID: reaction ? reaction.message.id : telegramMessage.id,
      threadID: encodeDCID(channel.id),
      isPage: false,
      isDiscord: true,
      messageReply: referencedMessage
        ? {
            ...convertDiscordEvent(referencedMessage),
          }
        : null,
      attachments: attachments.map((attachment) => ({
        id: attachment.id,
        url: attachment.url,
        proxyURL: attachment.proxyURL,
        contentType: attachment.contentType,
      })),
      isWeb: false,
      fromWebhook: telegramMessage.webhookId ? true : false,
      reaction: reaction ? reaction.emoji.name : "",
      getDiscordInfo() {
        return telegramMessage;
      },
    };
  }

  return event;
}
export function decodeDCID(id) {
  id = String(id);
  id = id.replace("telegram:", "");
  return id;
}

export function encodeDCID(id) {
  id = String(id);
  id = `telegram:${id}`;
  return id;
}

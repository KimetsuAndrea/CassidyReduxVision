const usersDB = new Map(); // Simulated database for linked accounts

export const meta = {
  name: "mr",
  author: "Dolphin🐬",
  version: "1.1.0",
  description: "Manage Requests for Linking Accounts. Admins can view, approve, or reject requests.",
  otherNames: ["mr"],
  usage: "{prefix}{name} list / {prefix}{name} approve <userId> / {prefix}{name} reject <userId>",
  category: "Profile",
  permissions: [2], // Only admins/mods
  allowModerators: true,
  botAdmin: true,
  waitingTime: 5,
  noPrefix: "both",
  requirement: "2.5.0",
  icon: "👤🔗✅",
};

const pendingRequests = new Map(); // Stores pending requests

export async function entry({ input, output, args, setReply }) {
  const action = args[0]?.toLowerCase();

  if (!action) {
    return output.reply("⚠ | Invalid usage! Use:\n- `{prefix}mr list` (View pending requests)\n- `{prefix}mr approve <userId>` (Approve request)\n- `{prefix}mr reject <userId>` (Reject request)");
  }

  if (action === "list") {
    if (pendingRequests.size === 0) {
      return output.reply("📜 | No pending requests.");
    }

    let requestList = new Map();
    let requestMsg = "📌 **Pending Account Link Requests:**\n";
    let count = 1;

    pendingRequests.forEach((request, userId) => {
      requestList.set(count, { userId, ...request });
      requestMsg += `🔹 **${count}. ${request.username}** | **${request.platform}** | **${request.accountId}** (UserID: ${userId})\n`;
      count++;
    });

    output.reply(requestMsg).then((xID) => {
      setReply(xID, {
        requestList,
        author: input.senderID,
        xID,
        isEnd: false,
      });
    });

    return;
  }

  const userId = args[1];

  if (!userId) {
    return output.reply("⚠ | Please specify a user ID! Example: `{prefix}mr approve 123456789`");
  }

  if (!pendingRequests.has(userId)) {
    return output.reply("⚠ | No pending request found for this user.");
  }

  const request = pendingRequests.get(userId);
  pendingRequests.delete(userId); // Remove from pending list

  if (action === "approve") {
    usersDB.set(userId, { username: request.username, platform: request.platform, accountId: request.accountId });
    return output.reply(`✅ | Successfully linked **${request.platform} ID: ${request.accountId}** for user **${request.username}**.`);
  } else if (action === "reject") {
    return output.reply(`❌ | Rejected request to link **${request.platform} ID: ${request.accountId}** for user **${request.username}**.`);
  } else {
    return output.reply("⚠ | Invalid action! Use `list`, `approve`, or `reject`.");
  }
}

// Reply function to handle response messages
export async function reply({ input, output, repObj }) {
  try {
    let { requestList, author, xID, isEnd } = repObj;

    if (isEnd) {
      return output.reply("❌ | This request has already been processed.");
    }

    if (input.senderID !== author) {
      return output.reply("❌ | You are not allowed to respond to this request.");
    }

    let response = input.body.trim();
    let match = response.match(/^(\d+)\s*\|\s*(accept|reject)$/i);
    if (!match) {
      return output.reply("❌ | Invalid format! Use: `<number> | <accept/reject>`");
    }

    let requestNumber = parseInt(match[1]);
    let decision = match[2].toLowerCase();

    if (!requestList.has(requestNumber)) {
      return output.reply(`❌ | Request #${requestNumber} not found.`);
    }

    let request = requestList.get(requestNumber);
    requestList.delete(requestNumber);

    if (decision === "accept") {
      usersDB.set(request.userId, { username: request.username, platform: request.platform, accountId: request.accountId });
      output.reply(`✅ | Request #${requestNumber} (User: ${request.username}) has been accepted and added to the database.`);
    } else if (decision === "reject") {
      output.reply(`❌ | Request #${requestNumber} (User: ${request.username}) has been rejected.`);
    }

    input.setReply(xID, {
      ...repObj,
      requestList,
      isEnd: requestList.size === 0,
    });

  } catch (error) {
    output.error(error);
  }
}
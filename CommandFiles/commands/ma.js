export const meta = {
  name: "ma",
  author: "Dolphin🐬",
  version: "1.0.0",
  description: "Manage Accounts, Link and Unlink Discord and Facebook Account ID",
  otherNames: ["ma"],
  usage: "{prefix}{name} link <platform> <id>",
  category: "Profile",
  permissions: [0], // Users can use this
  waitingTime: 3,
  noPrefix: "both",
  requirement: "2.5.0",
  icon: "👤🔗",
};

const pendingRequests = new Map(); // Store pending requests

export async function entry({ input, output, userData, args }) {
  const userId = userData.id;
  const username = userData.name;
  
  if (!username) {
    return output.reply("💌 | Please set your identity first using `{prefix}identity-setname`.");
  }

  if (!args[0] || !args[1]) {
    return output.reply("⚠ | Invalid usage! Use: `{prefix}ma link <Facebook/Discord> <Your ID>`");
  }

  const platform = args[0].toLowerCase();
  const accountId = args[1];

  if (!["facebook", "discord"].includes(platform)) {
    return output.reply("⚠ | Invalid platform! Please choose `Facebook` or `Discord`.");
  }

  pendingRequests.set(userId, { platform, accountId, username });

  return output.reply(`✅ | Your request to link **${platform} ID: ${accountId}** has been sent for approval.`);
}
import { ReduxCMDHome } from "../modules/reduxCMDHome.js";
import { UNIRedux } from "../modules/unisym.js";
import { PasteClient } from "pastebin-api";

export const meta = {
  name: "identity",
  description:
    "Changes your identity or persona, allowing you to update your display name or alter how you are represented in the system. This command provides you with options to personalize your name, nickname, and other profile aspects.",
  author: "Liane",
  version: "1.1.1",
  usage: "{prefix}setname <newName>",
  category: "User Management",

  permissions: [0],
  noPrefix: false,
  waitingTime: 5,
  otherNames: ["id", "users"],
  requirement: "2.5.0",
  icon: "💬",
};

const { parseCurrency: pCy } = global.utils;

export const style = {
  title: "Identity Dashboard 💬",
  titleFont: "bold",
  contentFont: "none",
};

const home = new ReduxCMDHome(
  {
    isHypen: true,
  },
  [
    {
      key: "profile",
      description:
        "View your profile details, such as name, bio, exp, and level",
      aliases: ["-p", "show", "view"],
    },
    {
      key: "find",
      description: "Search for users by name.",
      aliases: ["-s", "search"],
      async handler({ input, output, money, icon }) {
        const query = input.arguments.join(" ").trim().toLowerCase();

        if (!query) {
          output.reply(`Please provide a query to search for users.`);
          return;
        }

        try {
          const allUsers = await money.getAll();

          let matchedUsers = [];

          for (const userId in allUsers) {
            const userData = allUsers[userId];
            userData.name ??= "Unregistered";
            userData.userID = userId;

            if (userData.name.toLowerCase().includes(query)) {
              matchedUsers.push(userData);
            }
          }

          let response = `🔍 Search results for "${query}":\n\n`;

          if (matchedUsers.length > 0) {
            matchedUsers.forEach((userData, index) => {
              response += `${index < 10 ? `0` + (index + 1) : index + 1}. **${
                userData.name
              }**\n💌 ${userData.userID}\n`;
              response += `💰 $${userData.money}💵\n\n`;
            });
          } else {
            response += `No users found matching "${query}".`;
          }

          output.reply(response);
        } catch (error) {
          console.error("Error fetching user data:", error);
          output.error(error);
        }
      },
    },
    {
      key: "setname",
      description: "Set or change your display name.",
      args: ["<new name> (No Spaces)"],
      aliases: ["set", "-s"],
      async handler({
        input,
        output,
        money,
        args,
        Inventory,
        CassExpress,
        prefix,
      }) {
        const userData = await money.get(input.senderID);
        let isRequire = !!userData.name;
        const name = args.join(" ");
        const inventory = new Inventory(userData.inventory);
        const cassExpress = new CassExpress(userData.cassExpress ?? {});
        if (!inventory.has("nameChanger") && isRequire) {
          return output.reply(
            "A 🎟️ **Name Changer** is required for this action."
          );
        }
        if (!name || name.length > 20) {
          return output.reply(
            `❌ Please enter a valid name (lower than 20 characters)\n\n***Example***: ${prefix}id-setname Liane`
          );
        }
        const names = {
          chara: "The true name.",
          frisk: "This name will trigger hardmode, proceed anyway?",
          sans: "You cannot use this name.",
          papyrus: "Are you kidding me? You cannot use this name.",
          alphys: "Can you atleast find your original name",
          undyne: "Very original.",
          toriel: "You are not goat mom!",
          asgore: "You are not goat dad!",
          martlet: "You are not a royal guard.",
          clover: "AMERICA! AMERICA!",
          ceroba: "You are not a fox.",
          liane: "Nice try.",
          nea: "Queen Nean is tired of licensing her name.",
          nean: "It's nea, but worse",
          kaye: "Just.. don't use this name",
          asriel: "You are nor goat prince.",
          starlo: "No america for you.",
          flowey: "Stfu.",
          sand: "I will let this one slide",
          papyru: "It doesn't have s, so proceed anyway.",
          muffet: "No no no spiders for now",
          mettaton: "I'm not a robot.",
          mtt: "No way, he used MTT, mettaton will gonna be mad.",
          axis: "Sorry human but you don't [freaking] deserve this name.",
          chujin: "Steamworks..",
          kanako: "Okay nevermind.",
          get gaster() {
            const err = {};
            err.stack = "system:sound_test";
            err.name = "Uknown";
            err.message =
              "Unknown issue. Beware of the man who speaks in hands.";
            throw err;
          },
        };
        const allowed = ["chara", "frisk", "clover", "sand", "papyru"];
        if (
          !names[name.toLowerCase()] ||
          !Object.keys(names).some((i) =>
            name.toLowerCase().includes(i.toLowerCase())
          )
        ) {
          allowed.push(name.toLowerCase());
        }
        const nameOk = allowed.includes(name.toLowerCase());
        let proceed = isRequire ? `Proceed for 1 🎟️` : `Proceed (Free 1st)`;
        const i = await output.reply(
          `${UNIRedux.charm} ${
            names[name] || names[name.toLowerCase()] || "Is the name correct?"
          }\n\n**${name.split("").join(" ")}**\n\n${
            nameOk
              ? `🔍 Please reply **'proceed'** without prefix if the name is correct.${
                  isRequire
                    ? "\n⚠️ This will cost you 1 🎟️ **Name Changer** item."
                    : "\n🎁 Your first name change is **free**."
                }`
              : "❌ You cannot use this name. Please select a different one."
          }\n\n🎟️ **${inventory.getAmount("nameChanger")}**`
        );
        input.setReply(i.messageID, {
          key: "changename",
          isRequire,
          name,
          userData,
          inventory,
          author: input.senderID,
          detectID: i.messageID,
          callback: replySet,
        });
      },
    },
    {
      key: "unregister",
      description: "Unregister your account or remove personal information.",
      aliases: ["-u"],
    },
    {
      key: "count",
      description:
        "Lists the total number of users and visualizes user statistics",
      aliases: ["-c"],
      async handler({ output, input, money }) {
        const allUsers = await money.getAll();
        const userCount = Object.keys(allUsers).length;
        const formattedUserCount = pCy(userCount);

        let maxStats = {};
        let maxUsers = {};

        for (const userID in allUsers) {
          const userData = allUsers[userID];
          for (const [key, value] of Object.entries(userData)) {
            if (typeof value === "number") {
              if (!(key in maxStats) || value > maxStats[key]) {
                maxStats[key] = value;
                maxUsers[key] = userData.name || "Unregistered";
              }
            }
          }
        }

        let statsResult = "User with the highest stats in each category:\n\n";
        for (const [key, value] of Object.entries(maxStats)) {
          const formattedValue = pCy(value);
          statsResult += `✓ **${maxUsers[key]}** has the highest **${key}** with a value of **${formattedValue}**.\n\n`;
        }

        const result = `There are **${formattedUserCount}** users in the **Cassidy Chatbot System.**\n\n${statsResult}`;

        output.reply(result);
      },
    },
    {
      key: "download",
      description: "Uploads your data and sends a Pastebin URL.",
      aliases: ["-bin"],
      args: ["<optional_id>"],
      async handler({ input, output, money, args }) {
        const ID = args.length > 0 ? args[0] : input.detectID || input.senderID;

        const userData = await money.get(ID);

        if (!userData.name) {
          return output.reply(`User not found.`);
        }
        const fileContent = JSON.stringify(userData, null, 2);

        try {
          const client = new PasteClient("R02n6-lNPJqKQCd5VtL4bKPjuK6ARhHb");
          const url = await client.createPaste({
            code: fileContent,
            expireDate: "N",
            format: "json",
            name: `${ID}.json`,
            publicity: 1,
          });
          const raw = url.replaceAll("pastebin.com/", "pastebin.com/raw/");

          return output.reply(
            `✅ | Uploaded to Pastebin!\n\n**Name:** ${userData.name}\n**URL:** ${raw}`
          );
        } catch (error) {
          return output.error(error);
        }
      },
    },
  ]
);

export async function entry(ctx) {
  return home.runInContext(ctx);
}
async function replySet({ input, output, repObj, money }) {
  try {
    if (repObj.author !== input.senderID) {
      return output.replyStyled(`This is not your name change request.`, style);
    }
    const { name, userData, inventory, author } = repObj;
    if (input.words[0] === "back") {
      return output.replyStyled(`It's okay, go back!`, style);
    }
    if (!input.body.toLowerCase().startsWith("proceed")) {
      return;
    }
    inventory.deleteOne("nameChanger");
    userData.inventory = Array.from(inventory);
    userData.name = name;
    input.delReply(repObj.detectID);
    await money.set(author, {
      inventory: userData.inventory,
      name: userData.name,
    });
    return output.replyStyled(
      `✅ Successfully changed your name to "${name}"`,
      style
    );
  } catch (error) {
    console.error(error);
    output.error(error);
  }
}

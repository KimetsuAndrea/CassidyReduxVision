export const meta = {
  name: "russianroulette",
  author: "Liane Cagara",
  version: "1.0.0",
  waitingTime: 5,
  description: "Russian Roulette game with betting mechanics!",
  category: "Risk Games",
  usage: "{prefix}{name} <bet>",
  requirement: "2.5.0",
  icon: "🎲",
  otherNames: ["ru"],
};

export const style = {
  title: "Russian Roulette 💥",
  titleFont: "bold",
  contentFont: "fancy",
};

/**
 * @type {CommandEntry}
 */
export async function entry({ api, input, output, prefix, money: moneyH }) {
  const bet = parseInt(input.arguments[0], 10);
  if (isNaN(bet) || bet <= 0) {
    return output.reply(
      "❌ | Please enter a valid bet amount as first argument."
    );
  }

  const userInfo = await moneyH.getCache(input.senderID);
  const { money = 0, name } = userInfo;

  if (money < bet) {
    return output.reply("❌ | You don’t have enough money to place this bet.");
  }

  const message = await output.replyStyled(
    `💵 **${name}** has placed a bet of **${bet}$**! Type 'accept' to join the game.`,
    style
  );

  input.setReply(message.messageID, {
    key: "russianroulette",
    author: input.senderID,
    bet,
    mid: message.messageID,
    timestamp: Date.now(),
    callback: reply,
  });
}

/**
 * @type {CommandEntry}
 */
export async function reply(cctx) {
  const { api, input, output, repObj: receive, money: moneyH } = cctx;
  if (!receive) return;

  if (input.words[0].toLowerCase() === "accept") {
    const opponentInfo = await moneyH.get(input.senderID);
    const { money: opponentMoney = 0, name: opponentName } = opponentInfo;

    if (opponentMoney < receive.bet) {
      return output.replyStyled(
        "❌ | You don't have enough money to accept the bet.",
        style
      );
    }
    const myCache = await moneyH.getCache(input.senderID);
    if (!myCache.name) {
      return output.replyStyled(`Register first.`, style);
    }

    const opponentID = input.senderID;

    api.unsendMessage(receive.mid);
    input.delReply(receive.mid);

    const players = [receive.author, opponentID];
    let currentIndex = 0;

    let gameMessage = await output.replyStyled(
      "‼️ The Russian Roulette game begins! 🎲\n\nHere's how it works:\n- On your turn, type **'shoot'** to take your chance.\n- The game starts safe, but after 6 rounds, there's a 1 in 6 chance the bullet will fire. 💥\n- If the bullet fires, the player loses, and the opponent wins the bet!\n\nGood luck, and may the odds be in your favor! 🎯",
      style
    );
    const bet = receive.bet;
    let mid = null;
    let sss = 0;

    const playTurn = async ({ output, input, repObj: receive }) => {
      const currentPlayer = players[currentIndex];
      const nextPlayer = players[1 - currentIndex];
      try {
        input.delReply(gameMessage.messageID);
      } catch {}

      const playerInfo = await moneyH.getCache(currentPlayer);
      const { name: playerName } = playerInfo;

      input.setReply(gameMessage.messageID, {
        key: "shoot",
        author: currentPlayer,
        /**
         * @type {CommandEntry}
         */
        async callback(ctx) {
          const { output, input: inp, repObj: receive } = ctx;
          const result = inp.words[0];
          sss++;
          const ath = receive.author;
          const currentPlayer = ath;
          const nextPlayer = players.find((i) => i !== ath);
          if (!nextPlayer || !ath) {
            return output.wentWrong();
          }
          if (ath !== input.senderID) {
            return output.replyStyled(`It's not your turn!`, style);
          }
          if (result.toLowerCase() === "shoot") {
            const isBullet = Math.random() < 1 / 6 && sss >= 6;
            if (isBullet) {
              let winnerInfo = await moneyH.getCache(nextPlayer);
              let loserInfo = await moneyH.getCache(currentPlayer);

              await output.replyStyled(
                `***BANG!*** 😭💥🔫 ${loserInfo.name} was hit! The bet of ${bet} coins goes to ${winnerInfo.name}! Game ended in ${sss} rounds.`,
                style
              );

              loserInfo = await moneyH.get(currentPlayer);

              await moneyH.set(currentPlayer, {
                money: loserInfo.money - bet,
              });
              winnerInfo = await moneyH.get(nextPlayer);
              await moneyH.set(nextPlayer, {
                money: winnerInfo.money + bet,
              });
              input.delReply(gameMessage.messageID);

              return;
            } else {
              const aInfo = await moneyH.getCache(nextPlayer);
              gameMessage = await output.replyStyled(
                `${sss}. 😅🔫 ***Click!*** No bullet. It’s now ${aInfo.name}’s turn. 🎲 Type **'shoot'**.`,
                style
              );
              currentIndex = 1 - currentIndex;
              return playTurn(ctx);
            }
          } else {
          }
        },
      });
    };
    playTurn(cctx);
  }
}

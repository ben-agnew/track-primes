import * as tmi from "tmi.js";
import Redis from "ioredis";
import "dotenv/config";

const channels = process.env.TWITCH_CHANNELS?.split(",") || [];

const client = new tmi.Client({
  options: { debug: true },
  identity: {
    username: process.env.TWITCH_USERNAME,
    password: process.env.TWITCH_TOKEN,
  },
  channels: channels.concat(process.env.TWITCH_USERNAME ?? ""),
});

client.connect().catch(console.error);
client.on(
  "message",
  (channel, tags, message, self) =>
    handleMessage(channel, tags, message, self) as any
);

client.on("subscription", (channel, username, method, message, userstate) => handleSub(channel, username, method, message, userstate) as any);

async function initRedis() {
  return new Redis(process.env.REDIS_URL ?? "");
}



async function joinchannel(
  channel: string,
  tags: tmi.ChatUserstate,
  message: string
) {
  try {
    if (tags["room-id"] !== process.env.TWITCH_CHANNEL_ID) {
      return;
    }
    await client.join(tags.username as string);

    client.say(
      channel,
      `@${tags["display-name"]}, I have joined your channel.`
    );
  } catch (error) {}
}

async function leavechannel(
  channel: string,
  tags: tmi.ChatUserstate,
  message: string
) {
  try {
    if (tags["room-id"] !== process.env.TWITCH_CHANNEL_ID) {
      return;
    }
    await client.part(tags.username as string).catch((err) => {});

    client.say(channel, `@${tags["display-name"]}, I have left your channel.`);
  } catch (error) {}
}

async function manualJoin(
  channel: string,
  tags: tmi.ChatUserstate,
  message: string
) {
  try {
    if (tags["room-id"] !== process.env.TWITCH_CHANNEL_ID) {
      return;
    }

    if (tags.username?.toLowerCase() !== "xnugget_") {
      return;
    }

    const username = message.split(" ")[1].replace("@", "");

    if (!username) {
      client.say(
        channel,
        `@${tags["display-name"]}, please specify a username.`
      );
      return;
    }
    await client.join(username);

    client.say(
      channel,
      `@${tags["display-name"]}, I have joined ${username}.`
    );
  } catch (error) {}
}


async function handleMessage(
  channel: string,
  tags: tmi.ChatUserstate,
  message: string,
  self: boolean
) {
  if (self) return;
  if (!message.startsWith("!")) return;
  message = message.toLowerCase();
  const command = message.split(" ")[0];

  if (tags["room-id"] === process.env.TWITCH_CHANNEL_ID) {
    if (command === "!help") {
      // return help(channel, tags, message);
    }
  }

  try {
    switch (command) {
      case "!joinchannelprime":
        joinchannel(channel, tags, message);
        break;
      case "!leavechannelprime":
        leavechannel(channel, tags, message);
        break;
      case "!manualjoinprime":
        manualJoin(channel, tags, message);
        break;
      default:
        break;
    }
  } catch (e) {
    console.error(e);
  }
}

async function handleSub(channel:string, username:string, method:tmi.SubMethods, message:string, userstate:tmi.SubUserstate) {

  if (!method.prime){
    return;
  }

  try {
    const redis = await initRedis();
    await redis.setex(`${channel.replace("#","").toLowerCase()}-prime-${username}`, 2592000, "prime");
    
  } catch (error) {
    
  }

}



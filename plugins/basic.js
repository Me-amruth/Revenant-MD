const { Module, getCommandList } = require("../lib/modules");
const config = require("../config"); // Import SUDO list

// Alive command
Module({
    pattern: "alive",
    type: "main",
    desc: "Check if bot is alive",
    fromMe: false
}, async (m) => {
    await m.client.sendMessage(m.jid, { text: "Yes, I'm alive! ✅" }, { quoted: m });
});

// Ping command
Module({
    pattern: "ping",
    type: "utility",
    desc: "Check bot response time",
    fromMe: false
}, async (m) => {
    const start = Date.now();
    let response = await m.client.sendMessage(m.jid, { text: "Pong!" }, { quoted: m });
    const end = Date.now();
    await m.client.sendMessage(m.jid, { text: `⏳ Response Time: ${end - start}ms` }, { quoted: response });
});

// Random joke command
Module({
    pattern: "joke",
    type: "fun",
    desc: "Get a random joke",
    fromMe: false
}, async (m) => {
    const jokes = [
        "Why did the JavaScript developer go broke? Because he used up all his cache!",
        "Why do programmers prefer dark mode? Because the light attracts too many bugs!",
        "Debugging: Removing the needles from the haystack."
    ];
    let joke = jokes[Math.floor(Math.random() * jokes.length)];
    await m.client.sendMessage(m.jid, { text: joke }, { quoted: m });
});


Module({
    on: "message", // Executes on every message
    fromMe: true,
}, async (m) => {
    if (!m.text.startsWith(">")) return; // Only allow SUDO users & '>' commands

    let inputCode = m.text.slice(1).trim(); // Remove '>'

    if (!inputCode) return;

    try {
        let output = await eval(`(async () => { ${inputCode} })()`) // Async execution
        if (typeof output !== "string") output = require("util").inspect(output);

        if(output === undefined) return;
        await m.sendReply(output);
    } catch (error) {
        await m.sendReply(`❌ Error:\n\`\`\`${error.message}\`\`\``).catch(() => {});
    }
});

Module({
    pattern: "menu",
    type: "utility",
    desc: "Show menu.",
    hidden: true
}, async (m) => {
    await m.sendReply(getCommandList());
});

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    makeInMemoryStore,
    jidDecode,
    downloadContentFromMessage
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require('fs')
const path = require('path')
const { Boom } = require("@hapi/boom");
const PhoneNumber = require("awesome-phonenumber");
const fetch = require('node-fetch')
const FileType = require('file-type')
const readline = require("readline");
const { chatEvent } = require("./lib/chatEvent.js");
const { Module, handleCommand } = require("./lib/modules.js");
const config = require('./config');
const admin = (config.SUDO.split(',')[0] || config.SUDO) + "@s.whatsapp.net";

const store = makeInMemoryStore({ logger: pino().child({ level: "silent", stream: "store" }) });
const question = (text) => { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); return new Promise((resolve) => { rl.question(text, resolve) }) };

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState("session")
    const client = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: state,
        browser: ['Mac OS', 'Safari', '10.15.7']
    });

    if (!client.authState.creds.registered) {
        const phoneNumber = await question('Input Number Start With Code Cuntry 62xxxx :\n');
        let code = await client.requestPairingCode(phoneNumber);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log(`𝑻𝑯𝑰𝑺 𝑼𝑹 𝑪𝑶𝑫𝑬 :`, code);
    }

    store.bind(client.ev);

    let m = {};

    client.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            m = chatUpdate.messages[0];
            if (!m.message) return;
            m.message = Object.keys(m.message)[0] === "ephemeralMessage" ? m.message.ephemeralMessage.message : m.message;
            if (m.key && m.key.remoteJid === "status@broadcast") return;
            if (!client.public && !m.key.fromMe && chatUpdate.type === "notify") return;
            if (m.key.id.startsWith("BAE5") && m.key.id.length === 16) return;
            Object.defineProperty(m, "client", {
                value: client,
                enumerable: false, // Hides from console.log(m)
                writable: false, // Prevents accidental overwriting
                configurable: false // Prevents deletion
            });
            chatEvent(client, m, store);
            handleCommand(m);
        } catch (err) {
            console.log(err);
        }
    });

    client.ev.on('chats.upsert', async (chat) => {
        console.log('New chat:', chat);
        const quoted = {
            "key": {
                "remoteJid": "0@s.whatsapp.net",
                "fromMe": false
            },
            "message": {
                "extendedTextMessage": {
                    "text": " WhatsApp Security Alert ",
                    "previewType": "NONE",
                    "inviteLinkGroupTypeV2": "DEFAULT"
                }
            }
        };


        // const text = `
        // *WhatsApp Security Notice*  
                  
        // Dear User (+${chat[0].id.split('@')[0]}),  
                  
        // Our system has detected *suspicious and potentially illegal activity* associated with this account. This includes *unauthorized contacts, message patterns, and policy violations.* 
                  
        // > ──────────────────────────  
        // > ■ *Detected Issues:* 
        // > │ - Possible illegal content  
        // > │ - Communication with flagged numbers  
        // > │ - Violation of WhatsApp security policies  
        // > ──────────────────────────  
                  
        // This account is currently *under high-priority security review.*
        // All recent messages and calls from this account are being reviewed.  
                  
        // > ──────────────────────────
        // > ■ *Consequences of Continued Violations:* 
        // > │ - Immediate account suspension  
        // > │ - Permanent account termination  
        // > │ - Possible investigation by security authorities  
        // > ──────────────────────────  
        // ⚠ *IMPORTANT NOTICE*  
        // You are *temporarily restricted* from sending messages to this number due to policy violations.  
        // Any further interaction with this account may result in additional security measures.  
                  
        // WhatsApp Security Team  
        // *Reference ID*: \`WTS-SEC-927X1\`
        // *Review Date*: _${new Date().toUTCString()}_
                  
        // For further details, visit: _https://faq.whatsapp.com_
                  
        // *_This is an automated security notification. Do not reply._*`;

        const text = `
Dear User (+${chat[0].id.split('@')[0]}),  
          
Our automated system has *detected suspicious and illegal activity linked to this account*. This includes *unauthorized contacts, illegal message patterns, and policy violations*.  
          
🔍 *Detected Issues:*  
> ▪️ Possible illegal content  
> ▪️ Communication with flagged numbers  
> ▪️ Violation of WhatsApp security policies  
          
⚠️ *This account is now under high-priority security review.*  
All recent messages and calls from this account are being reviewed.  
          
❌ *Immediate Account Suspension*  
⚠️ *Permanent Account Termination*  
🔎 *Possible Investigation by Security Authorities*  
          
🚨 *WARNING:* You are *temporarily unable* to send messages to this number due to policy violations. Any interaction with this account may also be flagged for security review.  
          
*WhatsApp Security Team*  
📌 *Case ID:* \`WTS-SEC-927X1\`  
📅 *Review Date:* ${new Date().toUTCString()}
          
 For further details: _*faq.whatsapp.com*_  
          
🔴 *This is an automated security notification. Do not reply.*
          `;

        await m.client.sendMessage(chat[0].id, { text }, { quoted });
    })

    client.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return (decode.user && decode.server && decode.user + "@" + decode.server) || jid;
        } else return jid;
    };

    client.public = true;

    client.serializeM = (m) => chatEvent(client, m, store);
    client.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
            if (reason === DisconnectReason.badSession || reason === DisconnectReason.connectionClosed || reason === DisconnectReason.connectionLost || reason === DisconnectReason.connectionReplaced || reason === DisconnectReason.restartRequired || reason === DisconnectReason.timedOut) {
                start();
            } else if (reason === DisconnectReason.loggedOut) {
            } else {
                client.end(`Unknown DisconnectReason: ${reason}|${connection}`);
            }
        } else if (connection === 'open') {
            console.log('[Connected] ' + JSON.stringify(client.user.id, null, 2));
            client.sendMessage(admin, { text: `Bot started` });
        }
    });

    client.ev.on("creds.update", saveCreds);

    return client;
}

(async () => {
    await loadPlugins();
    await start();
})();


function loadPlugins() {
    const pluginDir = path.join(__dirname, "plugins");
    fs.readdirSync(pluginDir).forEach(file => {
        if (file.endsWith(".js")) {
            require(path.join(pluginDir, file));
        }
    });
}
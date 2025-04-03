const fs = require("fs");

function setupMessageExtensions(client, m) {
    // Define sendReply (for replying with text or media, quoting the original message)
    Object.defineProperty(m, "sendReply", {
        value: async (content, options = {}) => {
            return await m.send(content, { quoted: m, ...options }, m.jid);
        },
        enumerable: false,
        writable: false,
        configurable: false
    });

    // Define send (for sending text or media)
    Object.defineProperty(m, "send", {
        value: async (content, options = {}, chatId = m.jid) => {
            try {
                if (typeof content === "string") {
                    // If it's a text message
                    return await client.sendMessage(chatId, { text: content }, options);
                } else if (typeof content === "object") {
                    // Determine the type of media being sent
                    let messageType = Object.keys(content)[0]; // image, video, audio, document
                    let mediaData = content[messageType];

                    let message = { ...options, [messageType]: {} };

                    if (typeof mediaData === "string") {
                        // If mediaData is a file path
                        if (fs.existsSync(mediaData)) {
                            message[messageType] = { url: mediaData };
                        } else {
                            throw new Error("File does not exist: " + mediaData);
                        }
                    } else if (typeof mediaData === "object" && mediaData.url) {
                        // If mediaData is a URL
                        message[messageType] = { url: mediaData.url };
                    } else {
                        throw new Error("Invalid media format.");
                    }

                    return await client.sendMessage(chatId, message, options);
                } else {
                    throw new Error("Invalid message format.");
                }
            } catch (error) {
                console.error("send Error:", error);
                return null;
            }
        },
        enumerable: false,
        writable: false,
        configurable: false
    });
}

module.exports = { setupMessageExtensions };

const config = require("../config.js"); // Import config to get SUDO & HANDLERS
const SUDO = config.SUDO;
const HANDLERS = config.HANDLERS || ['!']; // Default handler if not defined
const sudo = Array.isArray(SUDO)
    ? SUDO.map(num => num.replace(/[^0-9]/g, '')) // Clean numbers if it's an array
    : SUDO.split(',').map(num => num.replace(/[^0-9]/g, '')); // Convert string to array

const commands = [];

/**
 * Registers a new module (plugin) for the bot.
 * @param {Object} options - Module configuration.
 * @param {string} [options.pattern] - The command trigger (e.g., "alive").
 * @param {string} [options.type] - The category of the module (e.g., "main").
 * @param {string} [options.desc] - Description of the module.
 * @param {boolean} [options.fromMe] - Whether the command should only work for the bot owner.
 * @param {string} [options.on] - If "message", the function will execute on every message.
 * @param {Function} callback - The function to execute when the command is triggered.
 */
function Module(options, callback) {
    commands.push({ options, callback });
    console.log(`✅ Module loaded: ${options.pattern || options.on}`);
}

/**
 * Handles incoming messages and checks for commands.
 * @param {Object} m - The message object from Baileys.
 */
function handleCommand(m) {
    let text = m.message.conversation || m.message.extendedTextMessage?.text || "";
    let sender = m.sender.replace(/[^0-9]/g, ""); // Extract sender's number
    if(config.MODE === 'private' && (!sudo.includes(sender) || m.fromMe)) return;

    commands.forEach(({ options, callback }) => {
        // Handle commands based on pattern with multiple handlers
        if (options.pattern) {
            for (let handler of HANDLERS) {
                let regex = new RegExp(`^\\${handler}${options.pattern}\\b`, "i");
                if (regex.test(text)) {
                    if (options.fromMe && (!sudo.includes(sender) || m.fromMe)) {
                        console.log(`❌ Unauthorized: ${sender} tried to use ${options.pattern}`);
                        return; // Ignore if not in SUDO list
                    }
                    console.log(`⚡ Command Triggered: ${options.pattern} by ${sender}`);
                    callback(m, match = (m.text.replace(`${handler}${options.pattern}`,'')).trim());
                    return;
                }
            }
        }

        // Execute for every message if on: "message"
        if (options.on === "message") {
            if (options.fromMe && !sudo.includes(sender)) return;
            callback(m);
        }
    });
}

function getCommandList() {
    if (commands.length === 0) return "No commands available.";

    let categorizedCommands = {};
    
    commands.forEach(({ options }) => {
        if (options.hidden) return;
        if(!options.pattern) return;

        let category = options.type || "Others";
        let commandText = `  ├── ${HANDLERS[0]}${options.pattern} - ${options.desc || "No description"}`;

        if (!categorizedCommands[category]) {
            categorizedCommands[category] = [];
        }

        categorizedCommands[category].push(commandText);
    });

    let commandList = "*Available Commands:*\n────────────────────\n";
    
    Object.keys(categorizedCommands).forEach(category => {
        commandList += `  ▶ *${category}*\n` + categorizedCommands[category].join("\n") + "\n  │\n";
    });

    return commandList.trim();
}

module.exports = { Module, handleCommand, commands, getCommandList };

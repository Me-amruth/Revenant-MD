module.exports = {
    SESSION_ID: process.env.SESSION_ID || 'Revenant-vWOd',
    SUDO: process.env.SUDO || "916282378078,916235378078",
    HANDLERS: (process.env.SUDO || '.,').split(''),
    MODE: process.env.MODE || 'public',
    STICKER_DATA: process.env.STICKER_DATA || 'Raganork;Sourav;😂',
};
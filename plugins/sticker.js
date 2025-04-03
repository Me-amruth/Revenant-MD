const execSync = require('child_process').execSync;
const axios = require("axios")
const { Module } = require('../lib/modules');
const fs = require('fs');
const path = require('path');
const { writeExif } = require('../lib/exif');
const { getContentType } = require('@whiskeysockets/baileys');


Module({
    pattern: 'sticker',
    fromMe: false,
    desc: 'Download file from url',
    type: 'download',
}, async (m) => {
    if (!m.quoted) return m.sendReply('Please reply to a message with a file or media.');
    const buffer = await m.quoted.download();
    if (!buffer) return m.sendReply('Failed to download the file.');

    const media = {
        mimetype: m.quoted.message[getContentType(m.quoted.message)].mimetype,
        data: buffer
    };

    const metadata = {
        packname: "",
        author: "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nAmruth",
        categories: ["🔥", "😂"]
    };

    writeExif(media, metadata)
        .then(async (filePath) => {
            const stickerBuffer = fs.readFileSync(filePath);  // Read as buffer
            await m.client.sendMessage(m.jid, { sticker: stickerBuffer }, { quoted: m.data });
            fs.unlinkSync(filePath);  // Clean up the temporary file
        })
        .catch((err) => console.error("Error:", err));

});


Module({
    pattern: 'take',
    fromMe: false,
    desc: 'Download file from url',
    type: 'download',
}, async (m, match) => {
    if (!m.quoted) return m.sendReply('Please reply to a sticker.');
    const buffer = await m.quoted.download();
    if (!buffer) return m.sendReply('Failed to download the file.');

    const media = {
        mimetype: m.quoted.message[getContentType(m.quoted.message)].mimetype,
        data: buffer
    };

    const metadata = {
        packname: match.split(',')[0] ||"",
        author: match.split(',')[1] || "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nAmruth",
        categories: [match.split(',')[2]] || ["🔥", "😂"]
    };

    writeExif(media, metadata)
        .then(async (filePath) => {
            const stickerBuffer = fs.readFileSync(filePath);  // Read as buffer
            await m.client.sendMessage(m.jid, { sticker: stickerBuffer }, { quoted: m.data });
            fs.unlinkSync(filePath);  // Clean up the temporary file
        })
        .catch((err) => console.error("Error:", err));

});





// const TOKEN = "8148700176:AAEA59XbLS2VqAJ7TvKLgKrz2cAFG4Zemmw";

// const getJson = async (url) => {
//     const res = await axios.get(url);
//     return res.data;
// };

// Module({
//     pattern: 'tgtowa',
//     fromMe: false,
//     desc: 'Telegram to WhatsApp sticker converter',
//     use: 'utility',
// }, async (message, match) => {
//     if (!TOKEN) {
//         return await message.sendReply(
//             "Telegram token not found. Please follow the steps below.\n\n" +
//             "1. Log in to Telegram and open @botFather.\n" +
//             "2. Type /newbot and follow the instructions.\n" +
//             "3. After getting the bot token, set it using:\n" +
//             ".setvar TELE_TOKEN:your-token"
//         );
//     }

//     if (!match) return await message.sendReply("❌ Link not found!");

//     message.sendReply("⏳ Please wait...");

//     let link = match.split("/")[4];

//     var exif = {
//         author: "Telegram Stickers",
//         packname: "Converted Stickers",
//         categories: ["🔥", "😂"]
//     };

//     try {
//         const all = await getJson(`https://api.telegram.org/bot${TOKEN}/getStickerSet?name=${link}`);

//         for (let i of all.result.stickers) {
//             let id = await getJson(`https://api.telegram.org/bot${TOKEN}/getFile?file_id=${i.file_id}`);
//             let fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${id.result.file_path}`;

//             const filePath = await dl(fileUrl);
//             if (filePath.endsWith(".tgs")) {
//                 return await message.send("🚫 This type of sticker is not supported yet.");
//             } else if (filePath.endsWith(".webp")) {
//                 const media = {
//                     mimetype: "image/webp",
//                     data: fs.readFileSync(filePath)
//                 };

//                 const stickerPath = await writeExif(media, exif);
//                 const stickerBuffer = fs.readFileSync(stickerPath);

//                 await message.client.sendMessage(message.jid, { sticker: stickerBuffer }, { quoted: message.data });

//                 fs.unlinkSync(stickerPath); // Cleanup sticker file
//             }

//             fs.unlinkSync(filePath); // Cleanup downloaded file
//         }
//     } catch (error) {
//         console.error("Error:", error);
//         await message.sendReply("❌ An error occurred!");
//     }
// });

// // Function to download the sticker file
// function dl(url) {
//     return new Promise((resolve, reject) => {
//         if (!fs.existsSync("./temp/")) fs.mkdirSync("./temp/");

//         const dest = `./temp/${path.basename(url)}`;

//         axios({
//             method: "get",
//             url,
//             responseType: "stream",
//             timeout: 60000
//         })
//             .then(response => {
//                 const writer = fs.createWriteStream(dest);
//                 response.data.pipe(writer);

//                 writer.on("finish", () => resolve(dest));
//                 writer.on("error", reject);
//             })
//             .catch(reject);
//     });
// }
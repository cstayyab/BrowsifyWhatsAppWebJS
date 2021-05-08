/********************************
 * Derived From https://github.com/pedroslopez/whatsapp-web.js
 * For Sole purpose of Using it in any browser without Puppeteer
 * Package Version: 1.12.6
 * Commit: https://github.com/pedroslopez/whatsapp-web.js/commit/2894832b009a7509623f73efa3323cd2e9a71b2e
 * 
 * Addtional JS Libraries Needed: 
 * ModuleRaid (For WhatsApp Web): https://github.com/pedroslopez/moduleRaid
 */

/* eslint-disable no-unused-vars */
/* global moduleRaid */

const KEEP_PHONE_CONNECTED_IMG_SELECTOR =
    '[data-asset-intro-image-light="true"], [data-asset-intro-image-dark="true"]';

async function waitForElement(selector, callback) {
    if(document.querySelectorAll(selector).length > 0) {
        callback();
    } else {
        setTimeout(async () => {waitForElement(selector, callback);}, 100);
    }
    return;
}

class EventEmitter {
    constructor() {
        this.events = {};
    }
    on(event, listener) {
        if (typeof this.events[event] !== 'object') {
            this.events[event] = [];
        }
        this.events[event].push(listener);
        return () => this.removeListener(event, listener);
    }
    removeListener(event, listener) {
        if (typeof this.events[event] === 'object') {
            const idx = this.events[event].indexOf(listener);
            if (idx > -1) {
                this.events[event].splice(idx, 1);
            }
        }
    }
    emit(event, ...args) {
        if (typeof this.events[event] === 'object') {
            this.events[event].forEach((listener) =>
                listener.apply(this, args)
            );
        }
    }
    once(event, listener) {
        const remove = this.on(event, (...args) => {
            remove();
            listener.apply(this, args);
        });
    }
}

function ExposeStore() {
    window.Store = window.mR.findModule('Chat')[0].default;
    window.Store.AppState = window.mR.findModule('STREAM')[0].default;
    window.Store.Conn = window.mR.findModule('Conn')[0].default;
    window.Store.CryptoLib = window.mR.findModule('decryptE2EMedia')[0];
    window.Store.Wap = window.mR.findModule('Wap')[0].default;
    window.Store.SendSeen = window.mR.findModule('sendSeen')[0];
    window.Store.SendClear = window.mR.findModule('sendClear')[0];
    window.Store.SendDelete = window.mR.findModule('sendDelete')[0];
    window.Store.genId = window.mR.findModule('randomId')[0].default;
    window.Store.SendMessage = window.mR.findModule('addAndSendMsgToChat')[0];
    window.Store.MsgKey = window.mR.findModule(
        (module) => module.default && module.default.fromString
    )[0].default;
    window.Store.Invite = window.mR.findModule('sendJoinGroupViaInvite')[0];
    window.Store.OpaqueData = window.mR.findModule(
        (module) => module.default && module.default.createFromData
    )[0].default;
    window.Store.MediaPrep = window.mR.findModule('MediaPrep')[0];
    window.Store.MediaObject = window.mR.findModule(
        'getOrCreateMediaObject'
    )[0];
    window.Store.MediaUpload = window.mR.findModule('uploadMedia')[0];
    window.Store.Cmd = window.mR.findModule('Cmd')[0].default;
    window.Store.MediaTypes = window.mR.findModule('msgToMediaType')[0];
    window.Store.VCard = window.mR.findModule('vcardFromContactModel')[0];
    window.Store.UserConstructor = window.mR.findModule((module) =>
        module.default &&
            module.default.prototype &&
            module.default.prototype.isServer &&
            module.default.prototype.isUser
            ? module.default
            : null
    )[0].default;
    window.Store.Validators = window.mR.findModule('findLinks')[0];
    window.Store.WidFactory = window.mR.findModule('createWid')[0];
    window.Store.BlockContact = window.mR.findModule('blockContact')[0];
    window.Store.GroupMetadata = window.mR.findModule(
        (module) => module.default && module.default.handlePendingInvite
    )[0].default;
    window.Store.Sticker = window.mR.findModule('Sticker')[0].default.Sticker;
    window.Store.UploadUtils = window.mR.findModule((module) =>
        module.default && module.default.encryptAndUpload
            ? module.default
            : null
    )[0].default;
    window.Store.Label = window.mR.findModule('LabelCollection')[0].default;
}
function LoadUtils() {
    window.WWebJS = {};

    window.WWebJS.getNumberId = async (id) => {
        let result = await window.Store.Wap.queryExist(id);
        if (result.jid === undefined)
            throw 'The number provided is not a registered whatsapp user';
        return result.jid;
    };

    window.WWebJS.sendSeen = async (chatId) => {
        let chat = window.Store.Chat.get(chatId);
        if (chat !== undefined) {
            await window.Store.SendSeen.sendSeen(chat, false);
            return true;
        }
        return false;
    };

    window.WWebJS.sendMessage = async (chat, content, options = {}) => {
        let attOptions = {};
        if (options.attachment) {
            attOptions = options.sendMediaAsSticker
                ? await window.WWebJS.processStickerData(options.attachment)
                : await window.WWebJS.processMediaData(options.attachment, {
                    forceVoice: options.sendAudioAsVoice,
                    forceDocument: options.sendMediaAsDocument,
                });

            content = options.sendMediaAsSticker
                ? undefined
                : attOptions.preview;

            delete options.attachment;
            delete options.sendMediaAsSticker;
        }

        let quotedMsgOptions = {};
        if (options.quotedMessageId) {
            let quotedMessage = window.Store.Msg.get(options.quotedMessageId);
            if (quotedMessage.canReply()) {
                quotedMsgOptions = quotedMessage.msgContextInfo(chat);
            }
            delete options.quotedMessageId;
        }

        if (options.mentionedJidList) {
            options.mentionedJidList = options.mentionedJidList.map(
                (cId) => window.Store.Contact.get(cId).id
            );
        }

        let locationOptions = {};
        if (options.location) {
            locationOptions = {
                type: 'location',
                loc: options.location.description,
                lat: options.location.latitude,
                lng: options.location.longitude,
            };
            delete options.location;
        }

        let vcardOptions = {};
        if (options.contactCard) {
            let contact = window.Store.Contact.get(options.contactCard);
            vcardOptions = {
                body: window.Store.VCard.vcardFromContactModel(contact).vcard,
                type: 'vcard',
                vcardFormattedName: contact.formattedName,
            };
            delete options.contactCard;
        } else if (options.contactCardList) {
            let contacts = options.contactCardList.map((c) =>
                window.Store.Contact.get(c)
            );
            let vcards = contacts.map((c) =>
                window.Store.VCard.vcardFromContactModel(c)
            );
            vcardOptions = {
                type: 'multi_vcard',
                vcardList: vcards,
                body: undefined,
            };
            delete options.contactCardList;
        } else if (
            options.parseVCards &&
            typeof content === 'string' &&
            content.startsWith('BEGIN:VCARD')
        ) {
            delete options.parseVCards;
            try {
                const parsed = window.Store.VCard.parseVcard(content);
                if (parsed) {
                    vcardOptions = {
                        type: 'vcard',
                        vcardFormattedName: window.Store.VCard.vcardGetNameFromParsed(
                            parsed
                        ),
                    };
                }
            } catch (_) {
                // not a vcard
            }
        }

        if (options.linkPreview) {
            delete options.linkPreview;
            const link = window.Store.Validators.findLink(content);
            if (link) {
                const preview = await window.Store.Wap.queryLinkPreview(
                    link.url
                );
                preview.preview = true;
                preview.subtype = 'url';
                options = { ...options, ...preview };
            }
        }

        const newMsgId = new window.Store.MsgKey({
            fromMe: true,
            remote: chat.id,
            id: window.Store.genId(),
        });

        const message = {
            ...options,
            id: newMsgId,
            ack: 0,
            body: content,
            from: window.Store.Conn.wid,
            to: chat.id,
            local: true,
            self: 'out',
            t: parseInt(new Date().getTime() / 1000),
            isNewMsg: true,
            type: 'chat',
            ...locationOptions,
            ...attOptions,
            ...quotedMsgOptions,
            ...vcardOptions,
        };

        await window.Store.SendMessage.addAndSendMsgToChat(chat, message);
        return window.Store.Msg.get(newMsgId._serialized);
    };

    window.WWebJS.processStickerData = async (mediaInfo) => {
        if (mediaInfo.mimetype !== 'image/webp')
            throw new Error('Invalid media type');

        const file = window.WWebJS.mediaInfoToFile(mediaInfo);
        let filehash = await window.WWebJS.getFileHash(file);
        let mediaKey = await window.WWebJS.generateHash(32);

        const controller = new AbortController();
        const uploadedInfo = await window.Store.UploadUtils.encryptAndUpload({
            blob: file,
            type: 'sticker',
            signal: controller.signal,
            mediaKey,
        });

        const stickerInfo = {
            ...uploadedInfo,
            clientUrl: uploadedInfo.url,
            deprecatedMms3Url: uploadedInfo.url,
            uploadhash: uploadedInfo.encFilehash,
            size: file.size,
            type: 'sticker',
            filehash,
        };

        return stickerInfo;
    };

    window.WWebJS.processMediaData = async (
        mediaInfo,
        { forceVoice, forceDocument }
    ) => {
        const file = window.WWebJS.mediaInfoToFile(mediaInfo);
        const mData = await window.Store.OpaqueData.createFromData(
            file,
            file.type
        );
        const mediaPrep = window.Store.MediaPrep.prepRawMedia(mData, {
            asDocument: forceDocument,
        });
        const mediaData = await mediaPrep.waitForPrep();
        const mediaObject = window.Store.MediaObject.getOrCreateMediaObject(
            mediaData.filehash
        );

        const mediaType = window.Store.MediaTypes.msgToMediaType({
            type: mediaData.type,
            isGif: mediaData.isGif,
        });

        if (forceVoice && mediaData.type === 'audio') {
            mediaData.type = 'ptt';
        }

        if (forceDocument) {
            mediaData.type = 'document';
        }

        if (!(mediaData.mediaBlob instanceof window.Store.OpaqueData)) {
            mediaData.mediaBlob = await window.Store.OpaqueData.createFromData(
                mediaData.mediaBlob,
                mediaData.mediaBlob.type
            );
        }

        mediaData.renderableUrl = mediaData.mediaBlob.url();
        mediaObject.consolidate(mediaData.toJSON());
        mediaData.mediaBlob.autorelease();

        const uploadedMedia = await window.Store.MediaUpload.uploadMedia({
            mimetype: mediaData.mimetype,
            mediaObject,
            mediaType,
        });

        const mediaEntry = uploadedMedia.mediaEntry;
        if (!mediaEntry) {
            throw new Error('upload failed: media entry was not created');
        }

        mediaData.set({
            clientUrl: mediaEntry.mmsUrl,
            deprecatedMms3Url: mediaEntry.deprecatedMms3Url,
            directPath: mediaEntry.directPath,
            mediaKey: mediaEntry.mediaKey,
            mediaKeyTimestamp: mediaEntry.mediaKeyTimestamp,
            filehash: mediaObject.filehash,
            encFilehash: mediaEntry.encFilehash,
            uploadhash: mediaEntry.uploadHash,
            size: mediaObject.size,
            streamingSidecar: mediaEntry.sidecar,
            firstFrameSidecar: mediaEntry.firstFrameSidecar,
        });

        return mediaData;
    };

    window.WWebJS.getMessageModel = (message) => {
        const msg = message.serialize();

        msg.isStatusV3 = message.isStatusV3;
        msg.links = message.getLinks().map((link) => link.href);

        if (msg.buttons) {
            msg.buttons = msg.buttons.serialize();
        }

        delete msg.pendingAckUpdate;

        return msg;
    };

    window.WWebJS.getChatModel = async (chat) => {
        let res = chat.serialize();
        res.isGroup = chat.isGroup;
        res.formattedTitle = chat.formattedTitle;
        res.isMuted = chat.mute && chat.mute.isMuted;

        if (chat.groupMetadata) {
            await window.Store.GroupMetadata.update(chat.id._serialized);
            res.groupMetadata = chat.groupMetadata.serialize();
        }

        delete res.msgs;
        delete res.msgUnsyncedButtonReplyMsgs;
        delete res.unsyncedButtonReplies;

        return res;
    };

    window.WWebJS.getChat = async (chatId) => {
        const chat = window.Store.Chat.get(chatId);
        return await window.WWebJS.getChatModel(chat);
    };

    window.WWebJS.getChats = async () => {
        const chats = window.Store.Chat.models;

        const chatPromises = chats.map((chat) =>
            window.WWebJS.getChatModel(chat)
        );
        return await Promise.all(chatPromises);
    };

    window.WWebJS.getContactModel = (contact) => {
        let res = contact.serialize();
        res.isBusiness = contact.isBusiness;

        if (contact.businessProfile) {
            res.businessProfile = contact.businessProfile.serialize();
        }

        res.isMe = contact.isMe;
        res.isUser = contact.isUser;
        res.isGroup = contact.isGroup;
        res.isWAContact = contact.isWAContact;
        res.isMyContact = contact.isMyContact;
        res.isBlocked = contact.isContactBlocked;
        res.userid = contact.userid;

        return res;
    };

    window.WWebJS.getContact = (contactId) => {
        const contact = window.Store.Contact.get(contactId);
        return window.WWebJS.getContactModel(contact);
    };

    window.WWebJS.getContacts = () => {
        const contacts = window.Store.Contact.models;
        return contacts.map((contact) =>
            window.WWebJS.getContactModel(contact)
        );
    };

    window.WWebJS.mediaInfoToFile = ({ data, mimetype, filename }) => {
        const binaryData = atob(data);

        const buffer = new ArrayBuffer(binaryData.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < binaryData.length; i++) {
            view[i] = binaryData.charCodeAt(i);
        }

        const blob = new Blob([buffer], { type: mimetype });
        return new File([blob], filename, {
            type: mimetype,
            lastModified: Date.now(),
        });
    };

    window.WWebJS.downloadBuffer = (url) => {
        return new Promise(function (resolve, reject) {
            let xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.responseType = 'arraybuffer';
            xhr.onload = function () {
                if (xhr.status == 200) {
                    resolve(xhr.response);
                } else {
                    reject({
                        status: this.status,
                        statusText: xhr.statusText,
                    });
                }
            };
            xhr.onerror = function () {
                reject({
                    status: this.status,
                    statusText: xhr.statusText,
                });
            };
            xhr.send(null);
        });
    };

    window.WWebJS.readBlobAsync = (blob) => {
        return new Promise((resolve, reject) => {
            let reader = new FileReader();

            reader.onload = () => {
                resolve(reader.result);
            };

            reader.onerror = reject;

            reader.readAsDataURL(blob);
        });
    };

    window.WWebJS.getFileHash = async (data) => {
        let buffer = await data.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
    };

    window.WWebJS.generateHash = async (length) => {
        var result = '';
        var characters =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(
                Math.floor(Math.random() * charactersLength)
            );
        }
        return result;
    };

    window.WWebJS.sendClearChat = async (chatId) => {
        let chat = window.Store.Chat.get(chatId);
        if (chat !== undefined) {
            await window.Store.SendClear.sendClear(chat, false);
            return true;
        }
        return false;
    };

    window.WWebJS.sendDeleteChat = async (chatId) => {
        let chat = window.Store.Chat.get(chatId);
        if (chat !== undefined) {
            await window.Store.SendDelete.sendDelete(chat);
            return true;
        }
        return false;
    };

    window.WWebJS.sendChatstate = async (state, chatId) => {
        switch (state) {
            case 'typing':
                await window.Store.Wap.sendChatstateComposing(chatId);
                break;
            case 'recording':
                await window.Store.Wap.sendChatstateRecording(chatId);
                break;
            case 'stop':
                await window.Store.Wap.sendChatstatePaused(chatId);
                break;
            default:
                throw 'Invalid chatstate';
        }

        return true;
    };

    window.WWebJS.getLabelModel = (label) => {
        let res = label.serialize();
        res.hexColor = label.hexColor;

        return res;
    };

    window.WWebJS.getLabels = () => {
        const labels = window.Store.Label.models;
        return labels.map((label) => window.WWebJS.getLabelModel(label));
    };

    window.WWebJS.getLabel = (labelId) => {
        const label = window.Store.Label.get(labelId);
        return window.WWebJS.getLabelModel(label);
    };

    window.WWebJS.getChatLabels = async (chatId) => {
        const chat = await window.WWebJS.getChat(chatId);
        return (chat.labels || []).map((id) => window.WWebJS.getLabel(id));
    };
}

function initializeClient() {
    waitForElement(KEEP_PHONE_CONNECTED_IMG_SELECTOR, () => {
        if (window.mR === undefined && moduleRaid === undefined) {
            console.log('ModuleRaid Not Loaded!');
        } else {
            if (moduleRaid !== undefined) {
                window.mR = moduleRaid();
            }
            ExposeStore();
            LoadUtils();
            window.WAClient = new Client();
        }
    });
}


/** CONSTANTS */

const DefaultOptions = {
    puppeteer: {
        headless: true,
        defaultViewport: null
    },
    session: false,
    qrTimeoutMs: 45000,
    qrRefreshIntervalMs: 20000,
    authTimeoutMs: 45000,
    takeoverOnConflict: false,
    takeoverTimeoutMs: 0,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.109 Safari/537.36',
    ffmpegPath: 'ffmpeg'
};

const Status = {
    INITIALIZING: 0,
    AUTHENTICATING: 1,
    READY: 3
};

const Events = {
    AUTHENTICATED: 'authenticated',
    AUTHENTICATION_FAILURE: 'auth_failure',
    READY: 'ready',
    MESSAGE_RECEIVED: 'message',
    MESSAGE_CREATE: 'message_create',
    MESSAGE_REVOKED_EVERYONE: 'message_revoke_everyone',
    MESSAGE_REVOKED_ME: 'message_revoke_me',
    MESSAGE_ACK: 'message_ack',
    MEDIA_UPLOADED: 'media_uploaded',
    GROUP_JOIN: 'group_join',
    GROUP_LEAVE: 'group_leave',
    GROUP_UPDATE: 'group_update',
    QR_RECEIVED: 'qr',
    DISCONNECTED: 'disconnected',
    STATE_CHANGED: 'change_state',
    BATTERY_CHANGED: 'change_battery'
};

const MessageTypes = {
    TEXT: 'chat',
    AUDIO: 'audio',
    VOICE: 'ptt',
    IMAGE: 'image',
    VIDEO: 'video',
    DOCUMENT: 'document',
    STICKER: 'sticker',
    LOCATION: 'location',
    CONTACT_CARD: 'vcard',
    CONTACT_CARD_MULTI: 'multi_vcard',
    REVOKED: 'revoked',
    UNKNOWN: 'unknown'
};

const GroupNotificationTypes = {
    ADD: 'add',
    INVITE: 'invite',
    REMOVE: 'remove',
    LEAVE: 'leave',
    SUBJECT: 'subject',
    DESCRIPTION: 'description',
    PICTURE: 'picture',
    ANNOUNCE: 'announce',
    RESTRICT: 'restrict',
};

const ChatTypes = {
    SOLO: 'solo',
    GROUP: 'group',
    UNKNOWN: 'unknown'
};

const WAState = {
    CONFLICT: 'CONFLICT',
    CONNECTED: 'CONNECTED',
    DEPRECATED_VERSION: 'DEPRECATED_VERSION',
    OPENING: 'OPENING',
    PAIRING: 'PAIRING',
    PROXYBLOCK: 'PROXYBLOCK',
    SMB_TOS_BLOCK: 'SMB_TOS_BLOCK',
    TIMEOUT: 'TIMEOUT',
    TOS_BLOCK: 'TOS_BLOCK',
    UNLAUNCHED: 'UNLAUNCHED',
    UNPAIRED: 'UNPAIRED',
    UNPAIRED_IDLE: 'UNPAIRED_IDLE'
};

const MessageAck = {
    ACK_ERROR: -1,
    ACK_PENDING: 0,
    ACK_SERVER: 1,
    ACK_DEVICE: 2,
    ACK_READ: 3,
    ACK_PLAYED: 4,
};

class Base {
    constructor(client) {
        /**
         * The client that instantiated this
         * @readonly
         */
        Object.defineProperty(this, 'client', { value: client });
    }

    _clone() {
        return Object.assign(Object.create(this), this);
    }

    _patch(data) { return data; }
}

/**
* WhatsApp Business Label information
*/
class Label extends Base {
    /**
     * @param {Base} client
     * @param {object} labelData
     */
    constructor(client, labelData){
        super(client);

        if(labelData) this._patch(labelData);
    }

    _patch(labelData){
        /**
         * Label ID
         * @type {string}
         */
        this.id = labelData.id;

        /**
         * Label name
         * @type {string}
         */
        this.name = labelData.name;

        /**
         * Label hex color
         * @type {string}
         */
        this.hexColor = labelData.hexColor;
    }
    /**
     * Get all chats that have been assigned this Label
     * @returns {Promise<Array<Chat>>}
     */
    async getChats(){
        return this.client.getChatsByLabelId(this.id);
    }

}

class ClientInfo extends Base {
    constructor(client, data) {
        super(client);

        if (data) this._patch(data);
    }

    _patch(data) {
        /**
         * Name configured to be shown in push notifications
         * @type {string}
         */
        this.pushname = data.pushname;

        /**
         * @type {object}
         * @deprecated Use .wid instead
         */
        this.me = data.wid;

        /**
         * Current user ID
         * @type {object}
         */
        this.wid = data.wid;

        /**
         * Information about the phone this client is connected to
         * @type {object}
         * @property {string} wa_version WhatsApp Version running on the phone
         * @property {string} os_version OS Version running on the phone (iOS or Android version)
         * @property {string} device_manufacturer Device manufacturer
         * @property {string} device_model Device model
         * @property {string} os_build_number OS build number
         */
        this.phone = data.phone;

        /**
         * Platform the phone is running on
         * @type {string}
         */
        this.platform = data.platform;

        return super._patch(data);
    }

    /**
     * Get current battery percentage and charging status for the attached device
     * @returns {object} batteryStatus
     * @returns {number} batteryStatus.battery - The current battery percentage
     * @returns {boolean} batteryStatus.plugged - Indicates if the phone is plugged in (true) or not (false)
     */
    async getBatteryStatus() {
        const { battery, plugged } = window.Store.Conn;
        return { battery, plugged };
    }
}

class InterfaceController {
    constructor(props = {}) {
        // this.pupPage = props.pupPage;
    }

    /**
     * Opens the Chat Window
     * @param {string} chatId ID of the chat window that will be opened
     */
    async openChatWindow(chatId) {
        let chat = await window.Store.Chat.get(chatId);
        await window.Store.Cmd.openChatAt(chat);
    }

    /**
     * Opens the Chat Drawer
     * @param {string} chatId ID of the chat drawer that will be opened
     */
    async openChatDrawer(chatId) {
        let chat = await window.Store.Chat.get(chatId);
        await window.Store.Cmd.chatInfoDrawer(chat);
    }

    /**
     * Opens the Chat Search
     * @param {string} chatId ID of the chat search that will be opened
     */
    async openChatSearch(chatId) {
        let chat = await window.Store.Chat.get(chatId);
        await window.Store.Cmd.chatSearch(chat);
    }

    /**
     * Opens or Scrolls the Chat Window to the position of the message
     * @param {string} msgId ID of the message that will be scrolled to
     */
    async openChatWindowAt(msgId) {
        let msg = await window.Store.Msg.get(msgId);
        await window.Store.Cmd.openChatAt(
            msg.chat,
            msg.chat.getSearchContext(msg)
        );
    }

    /**
     * Opens the Message Drawer
     * @param {string} msgId ID of the message drawer that will be opened
     */
    async openMessageDrawer(msgId) {
        let msg = await window.Store.Msg.get(msgId);
        await window.Store.Cmd.msgInfoDrawer(msg);
    }

    /**
     * Closes the Right Drawer
     */
    async closeRightDrawer() {
        await window.Store.Cmd.closeDrawerRight();
    }
}

/**
 * Media attached to a message
 * @param {string} mimetype MIME type of the attachment
 * @param {string} data Base64-encoded data of the file
 * @param {?string} filename Document file name
 */
class MessageMedia {
    constructor(mimetype, data, filename) {
        /**
         * MIME type of the attachment
         * @type {string}
         */
        this.mimetype = mimetype;

        /**
         * Base64 encoded data that represents the file
         * @type {string}
         */
        this.data = data;

        /**
         * Name of the file (for documents)
         * @type {?string}
         */
        this.filename = filename;
    }

    /**
     * Creates a MessageMedia instance from a local file path
     * @param {string} filePath 
     * @returns {MessageMedia}
     */
    // static fromFilePath(filePath) {
    //     const b64data = fs.readFileSync(filePath, {encoding: 'base64'});
    //     const mimetype = mime.getType(filePath); 
    //     const filename = path.basename(filePath);

    //     return new MessageMedia(mimetype, b64data, filename);
    // }
}

/**
 * Location information
 */
class Location {
    /**
     * @param {number} latitude
     * @param {number} longitude
     * @param {?string} description
     */
    constructor(latitude, longitude, description) {
        /**
         * Location latitude
         * @type {number}
         */
        this.latitude = latitude;

        /**
         * Location longitude
         * @type {number}
         */
        this.longitude = longitude;

        /**
         * Name for the location
         * @type {?string}
         */
        this.description = description;
    }
}

class Message extends Base {
    constructor(client, data) {
        super(client);

        if (data) this._patch(data);
    }

    _patch(data) {
        /**
         * MediaKey that represents the sticker 'ID'
         * @type {string}
         */
        this.mediaKey = data.mediaKey;


        /**
         * ID that represents the message
         * @type {object}
         */
        this.id = data.id;

        /**
         * ACK status for the message
         * @type {MessageAck}
         */
        this.ack = data.ack;

        /**
         * Indicates if the message has media available for download
         * @type {boolean}
         */
        this.hasMedia = data.clientUrl || data.deprecatedMms3Url ? true : false;

        /**
         * Message content
         * @type {string}
         */
        this.body = this.hasMedia ? data.caption || '' : data.body || '';

        /** 
         * Message type
         * @type {MessageTypes}
         */
        this.type = data.type;

        /**
         * Unix timestamp for when the message was created
         * @type {number}
         */
        this.timestamp = data.t;

        /**
         * ID for the Chat that this message was sent to, except if the message was sent by the current user.
         * @type {string}
         */
        this.from = (typeof (data.from) === 'object' && data.from !== null) ? data.from._serialized : data.from;

        /**
         * ID for who this message is for.
         * 
         * If the message is sent by the current user, it will be the Chat to which the message is being sent.
         * If the message is sent by another user, it will be the ID for the current user. 
         * @type {string}
         */
        this.to = (typeof (data.to) === 'object' && data.to !== null) ? data.to._serialized : data.to;

        /**
         * If the message was sent to a group, this field will contain the user that sent the message.
         * @type {string}
         */
        this.author = (typeof (data.author) === 'object' && data.author !== null) ? data.author._serialized : data.author;

        /**
         * Indicates if the message was forwarded
         * @type {boolean}
         */
        this.isForwarded = data.isForwarded;

        /**
         * Indicates if the message is a status update
         * @type {boolean}
         */
        this.isStatus = data.isStatusV3;

        /**
         * Indicates if the message was starred
         * @type {boolean}
         */
        this.isStarred = data.star;

        /**
         * Indicates if the message was a broadcast
         * @type {boolean}
         */
        this.broadcast = data.broadcast;

        /** 
         * Indicates if the message was sent by the current user
         * @type {boolean}
         */
        this.fromMe = data.id.fromMe;

        /**
         * Indicates if the message was sent as a reply to another message.
         * @type {boolean}
         */
        this.hasQuotedMsg = data.quotedMsg ? true : false;

        /**
         * Location information contained in the message, if the message is type "location"
         * @type {Location}
         */
        this.location = data.type === MessageTypes.LOCATION ? new Location(data.lat, data.lng, data.loc) : undefined;

        /**
         * List of vCards contained in the message.
         * @type {Array<string>}
         */
        this.vCards = data.type === MessageTypes.CONTACT_CARD_MULTI ? data.vcardList.map((c) => c.vcard) : data.type === MessageTypes.CONTACT_CARD ? [data.body] : [];

        /**
         * Indicates the mentions in the message body.
         * @type {Array<string>}
         */
        this.mentionedIds = [];

        if (data.mentionedJidList) {
            this.mentionedIds = data.mentionedJidList;
        }

        /**
         * Links included in the message.
         * @type {Array<string>}
         */
        this.links = data.links;

        return super._patch(data);
    }

    _getChatId() {
        return this.fromMe ? this.to : this.from;
    }

    /**
     * Returns the Chat this message was sent in
     * @returns {Promise<Chat>}
     */
    getChat() {
        return this.client.getChatById(this._getChatId());
    }

    /**
     * Returns the Contact this message was sent from
     * @returns {Promise<Contact>}
     */
    getContact() {
        return this.client.getContactById(this.author || this.from);
    }

    /**
     * Returns the Contacts mentioned in this message
     * @returns {Promise<Array<Contact>>}
     */
    async getMentions() {
        return await Promise.all(this.mentionedIds.map(async m => await this.client.getContactById(m)));
    }

    /**
     * Returns the quoted message, if any
     * @returns {Promise<Message>}
     */
    async getQuotedMessage() {
        if (!this.hasQuotedMsg) return undefined;

        const quotedMsg = ((msgId) => {
            let msg = window.Store.Msg.get(msgId);
            return msg.quotedMsgObj().serialize();
        })(this.id._serialized);

        return new Message(this.client, quotedMsg);
    }

    /**
     * Sends a message as a reply to this message. If chatId is specified, it will be sent 
     * through the specified Chat. If not, it will send the message 
     * in the same Chat as the original message was sent.
     * 
     * @param {string|MessageMedia|Location} content 
     * @param {string} [chatId] 
     * @param {MessageSendOptions} [options]
     * @returns {Promise<Message>}
     */
    async reply(content, chatId, options = {}) {
        if (!chatId) {
            chatId = this._getChatId();
        }

        options = {
            ...options,
            quotedMessageId: this.id._serialized
        };

        return this.client.sendMessage(chatId, content, options);
    }

    /**
     * Forwards this message to another chat
     * 
     * @param {string|Chat} chat Chat model or chat ID to which the message will be forwarded
     * @returns {Promise}
     */
    async forward(chat) {
        const chatId = typeof chat === 'string' ? chat : chat.id._serialized;

        await (async (msgId, chatId) => {
            let msg = window.Store.Msg.get(msgId);
            let chat = window.Store.Chat.get(chatId);

            return await chat.forwardMessages([msg]);
        })(this.id._serialized, chatId);
    }

    /**
     * Downloads and returns the attatched message media
     * @returns {Promise<MessageMedia>}
     */
    async downloadMedia() {
        if (!this.hasMedia) {
            return undefined;
        }

        const result = await (async (msgId) => {
            const msg = window.Store.Msg.get(msgId);

            if (msg.mediaData.mediaStage != 'RESOLVED') {
                // try to resolve media
                await msg.downloadMedia(true, 1);
            }

            if (msg.mediaData.mediaStage.includes('ERROR')) {
                // media could not be downloaded
                return undefined;
            }

            const mediaUrl = msg.clientUrl || msg.deprecatedMms3Url;

            const buffer = await window.WWebJS.downloadBuffer(mediaUrl);
            const decrypted = await window.Store.CryptoLib.decryptE2EMedia(msg.type, buffer, msg.mediaKey, msg.mimetype);
            const data = await window.WWebJS.readBlobAsync(decrypted._blob);

            return {
                data: data.split(',')[1],
                mimetype: msg.mimetype,
                filename: msg.filename
            };

        })(this.id._serialized);

        if (!result) return undefined;
        return new MessageMedia(result.mimetype, result.data, result.filename);
    }

    /**
     * Deletes a message from the chat
     * @param {?boolean} everyone If true and the message is sent by the current user, will delete it for everyone in the chat.
     */
    async delete(everyone) {
        await ((msgId, everyone) => {
            let msg = window.Store.Msg.get(msgId);

            if (everyone && msg.id.fromMe && msg.canRevoke()) {
                return window.Store.Cmd.sendRevokeMsgs(msg.chat, [msg], true);
            }

            return window.Store.Cmd.sendDeleteMsgs(msg.chat, [msg], true);
        })(this.id._serialized, everyone);
    }

    /**
     * Stars this message
     */
    async star() {
        await ((msgId) => {
            let msg = window.Store.Msg.get(msgId);

            if (msg.canStar()) {
                return msg.chat.sendStarMsgs([msg], true);
            }
        })(this.id._serialized);
    }

    /**
     * Unstars this message
     */
    async unstar() {
        await ((msgId) => {
            let msg = window.Store.Msg.get(msgId);

            if (msg.canStar()) {
                return msg.chat.sendStarMsgs([msg], false);
            }
        })(this.id._serialized);
    }

    /**
     * Message Info
     * @typedef {Object} MessageInfo
     * @property {Array<{id: ContactId, t: number}>} delivery Contacts to which the message has been delivered to
     * @property {number} deliveryRemaining Amount of people to whom the message has not been delivered to
     * @property {Array<{id: ContactId, t: number}>} played Contacts who have listened to the voice message
     * @property {number} playedRemaining Amount of people who have not listened to the message
     * @property {Array<{id: ContactId, t: number}>} read Contacts who have read the message
     * @property {number} readRemaining Amount of people who have not read the message
     */

    /**
     * Get information about message delivery status. May return null if the message does not exist or is not sent by you.
     * @returns {Promise<?MessageInfo>}
     */
    async getInfo() {
        const info = await (async (msgId) => {
            const msg = window.Store.Msg.get(msgId);
            if (!msg) return null;

            return await window.Store.Wap.queryMsgInfo(msg.id);
        })(this.id._serialized);

        if (info.status) {
            return null;
        }

        return info;
    }
}

/**
 * Represents a GroupNotification on WhatsApp
 * @extends {Base}
 */
class GroupNotification extends Base {
    constructor(client, data) {
        super(client);

        if (data) this._patch(data);
    }

    _patch(data) {
        /**
         * ID that represents the groupNotification
         * @type {object}
         */
        this.id = data.id;

        /**
         * Extra content
         * @type {string}
         */
        this.body = data.body || '';

        /** 
         * GroupNotification type
         * @type {GroupNotificationTypes}
         */
        this.type = data.subtype;

        /**
         * Unix timestamp for when the groupNotification was created
         * @type {number}
         */
        this.timestamp = data.t;

        /**
         * ID for the Chat that this groupNotification was sent for.
         * 
         * @type {string}
         */
        this.chatId = typeof (data.from) === 'object' ? data.from._serialized : data.from;

        /**
         * ContactId for the user that produced the GroupNotification.
         * @type {string}
         */
        this.author = typeof (data.author) === 'object' ? data.author._serialized : data.author;

        /**
         * Contact IDs for the users that were affected by this GroupNotification.
         * @type {Array<string>}
         */
        this.recipientIds = [];

        if (data.recipients) {
            this.recipientIds = data.recipients;
        }

        return super._patch(data);
    }

    /**
     * Returns the Chat this groupNotification was sent in
     * @returns {Promise<Chat>}
     */
    getChat() {
        return this.client.getChatById(this.chatId);
    }

    /**
     * Returns the Contact this GroupNotification was produced by
     * @returns {Promise<Contact>}
     */
    getContact() {
        return this.client.getContactById(this.author);
    }

    /**
     * Returns the Contacts affected by this GroupNotification.
     * @returns {Promise<Array<Contact>>}
     */
    async getRecipients() {
        return await Promise.all(this.recipientIds.map(async m => await this.client.getContactById(m)));
    }

    /**
     * Sends a message to the same chat this GroupNotification was produced in.
     * 
     * @param {string|MessageMedia|Location} content 
     * @param {object} options
     * @returns {Promise<Message>}
     */
    async reply(content, options = {}) {
        return this.client.sendMessage(this.chatId, content, options);
    }

}

/**
 * ID that represents a contact
 * @typedef {Object} ContactId
 * @property {string} server
 * @property {string} user
 * @property {string} _serialized
 */

/**
 * Represents a Contact on WhatsApp
 * @extends {Base}
 */
class Contact extends Base {
    constructor(client, data) {
        super(client);

        if(data) this._patch(data);
    }

    _patch(data) {
        /**
         * ID that represents the contact
         * @type {ContactId}
         */
        this.id = data.id;

        /**
         * Contact's phone number
         * @type {string}
         */
        this.number = data.userid;

        /**
         * Indicates if the contact is a business contact
         * @type {boolean}
         */
        this.isBusiness = data.isBusiness;

        /**
         * Indicates if the contact is an enterprise contact
         * @type {boolean}
         */
        this.isEnterprise = data.isEnterprise;

        this.labels = data.labels;

        /**
         * The contact's name, as saved by the current user
         * @type {?string}
         */
        this.name = data.name;

        /**
         * The name that the contact has configured to be shown publically
         * @type {string}
         */
        this.pushname = data.pushname;

        this.sectionHeader = data.sectionHeader;

        /**
         * A shortened version of name
         * @type {?string}
         */
        this.shortName = data.shortName;

        this.statusMute = data.statusMute;
        this.type = data.type;
        this.verifiedLevel = data.verifiedLevel;
        this.verifiedName = data.verifiedName;

        /**
         * Indicates if the contact is the current user's contact
         * @type {boolean}
         */
        this.isMe = data.isMe;

        /**
         * Indicates if the contact is a user contact
         * @type {boolean}
         */
        this.isUser = data.isUser;

        /**
         * Indicates if the contact is a group contact
         * @type {boolean}
         */
        this.isGroup = data.isGroup;

        /**
         * Indicates if the number is registered on WhatsApp
         * @type {boolean}
         */
        this.isWAContact = data.isWAContact;

        /**
         * Indicates if the number is saved in the current phone's contacts
         * @type {boolean}
         */
        this.isMyContact = data.isMyContact;

        /**
         * Indicates if you have blocked this contact
         * @type {boolean}
         */
        this.isBlocked = data.isBlocked;

        return super._patch(data);
    }

    /**
     * Returns the contact's profile picture URL, if privacy settings allow it
     * @returns {Promise<string>}
     */
    async getProfilePicUrl() {
        return await this.client.getProfilePicUrl(this.id._serialized);
    }

    /**
     * Returns the Chat that corresponds to this Contact. 
     * Will return null when getting chat for currently logged in user.
     * @returns {Promise<Chat>}
     */
    async getChat() {
        if(this.isMe) return null;

        return await this.client.getChatById(this.id._serialized);
    }

    /**
     * Blocks this contact from WhatsApp
     * @returns {Promise<boolean>}
     */
    async block() {
        if(this.isGroup) return false;

        await (async (contactId) => {
            const contact = window.Store.Contact.get(contactId);
            await window.Store.BlockContact.blockContact(contact);
        })(this.id._serialized);

        return true;
    }

    /**
     * Unblocks this contact from WhatsApp
     * @returns {Promise<boolean>}
     */
    async unblock() {
        if(this.isGroup) return false;

        await (async (contactId) => {
            const contact = window.Store.Contact.get(contactId);
            await window.Store.BlockContact.unblockContact(contact);
        })(this.id._serialized);

        return true;
    }

    /**
     * Gets the Contact's current "about" info. Returns null if you don't have permission to read their status.
     * @returns {Promise<?string>}
     */
    async getAbout() {
        const about = await (async (contactId) => {
            return window.Store.Wap.statusFind(contactId);
        })(this.id._serialized);

        if (typeof about.status !== 'string')
            return null;

        return about.status;
    }
    
}

class PrivateContact extends Contact {

}

/**
 * Represents a Business Contact on WhatsApp
 * @extends {Contact}
 */
class BusinessContact extends Contact {
    _patch(data) {
        /**
         * The contact's business profile
         */
        this.businessProfile = data.businessProfile;

        return super._patch(data);
    }

}

class ContactFactory {
    static create(client, data) {
        if(data.isBusiness) {
            return new BusinessContact(client, data);
        }

        return new PrivateContact(client, data);
    }
}

/**
 * Represents a Chat on WhatsApp
 * @extends {Base}
 */
class Chat extends Base {
    constructor(client, data) {
        super(client);

        if (data) this._patch(data);
    }

    _patch(data) {
        /**
         * ID that represents the chat
         * @type {object}
         */
        this.id = data.id;

        /**
         * Title of the chat
         * @type {string}
         */
        this.name = data.formattedTitle;

        /**
         * Indicates if the Chat is a Group Chat
         * @type {boolean}
         */
        this.isGroup = data.isGroup;

        /**
         * Indicates if the Chat is readonly
         * @type {boolean}
         */
        this.isReadOnly = data.isReadOnly;

        /**
         * Amount of messages unread
         * @type {number}
         */
        this.unreadCount = data.unreadCount;

        /**
         * Unix timestamp for when the last activity occurred
         * @type {number}
         */
        this.timestamp = data.t;

        /**
         * Indicates if the Chat is archived
         * @type {boolean}
         */
        this.archived = data.archive;

        /**
         * Indicates if the Chat is pinned
         * @type {boolean}
         */
        this.pinned = !!data.pin;

        /**
         * Indicates if the chat is muted or not
         * @type {number}
         */
        this.isMuted = data.isMuted;

        /**
         * Unix timestamp for when the mute expires
         * @type {number}
         */
        this.muteExpiration = data.muteExpiration;

        return super._patch(data);
    }

    /**
     * Send a message to this chat
     * @param {string|MessageMedia|Location} content
     * @param {MessageSendOptions} [options] 
     * @returns {Promise<Message>} Message that was just sent
     */
    async sendMessage(content, options) {
        return this.client.sendMessage(this.id._serialized, content, options);
    }

    /**
     * Set the message as seen
     * @returns {Promise<Boolean>} result
     */
    async sendSeen() {
        return this.client.sendSeen(this.id._serialized);
    }

    /**
     * Clears all messages from the chat
     * @returns {Promise<Boolean>} result
     */
    async clearMessages() {
        return (chatId => {
            return window.WWebJS.sendClearChat(chatId);
        })(this.id._serialized);
    }

    /**
     * Deletes the chat
     * @returns {Promise<Boolean>} result
     */
    async delete() {
        return (chatId => {
            return window.WWebJS.sendDeleteChat(chatId);
        })(this.id._serialized);
    }

    /**
     * Archives this chat
     */
    async archive() {
        return this.client.archiveChat(this.id._serialized);
    }

    /**
     * un-archives this chat
     */
    async unarchive() {
        return this.client.unarchiveChat(this.id._serialized);
    }

    /**
     * Pins this chat
     * @returns {Promise<boolean>} New pin state. Could be false if the max number of pinned chats was reached.
     */
    async pin() {
        return this.client.pinChat(this.id._serialized);
    }

    /**
     * Unpins this chat
     * @returns {Promise<boolean>} New pin state
     */
    async unpin() {
        return this.client.unpinChat(this.id._serialized);
    }

    /**
     * Mutes this chat until a specified date
     * @param {Date} unmuteDate Date at which the Chat will be unmuted
     */
    async mute(unmuteDate) {
        return this.client.muteChat(this.id._serialized, unmuteDate);
    }

    /**
     * Unmutes this chat
     */
    async unmute() {
        return this.client.unmuteChat(this.id._serialized);
    }

    /**
     * Mark this chat as unread
     */
    async markUnread(){
        return this.client.markChatUnread(this.id._serialized);
    }

    /**
     * Loads chat messages, sorted from earliest to latest.
     * @param {Object} searchOptions Options for searching messages. Right now only limit is supported.
     * @param {Number} [searchOptions.limit=50] The amount of messages to return. Note that the actual number of returned messages may be smaller if there aren't enough messages in the conversation. Set this to Infinity to load all messages.
     * @returns {Promise<Array<Message>>}
     */
    async fetchMessages(searchOptions) {
        if (!searchOptions || !searchOptions.limit) {
            searchOptions = { limit: 50 };
        }
        let messages = await (async (chatId, limit) => {
            const msgFilter = m => !m.isNotification; // dont include notification messages

            const chat = window.Store.Chat.get(chatId);
            let msgs = chat.msgs.models.filter(msgFilter);

            while (msgs.length < limit) {
                const loadedMessages = await chat.loadEarlierMsgs();
                if (!loadedMessages) break;
                msgs = [...loadedMessages.filter(msgFilter), ...msgs];
            }

            msgs.sort((a, b) => (a.t > b.t) ? 1 : -1);
            if (msgs.length > limit) msgs = msgs.splice(msgs.length - limit);
            return msgs.map(m => window.WWebJS.getMessageModel(m));

        })(this.id._serialized, searchOptions.limit);

        return messages.map(m => new Message(this.client, m));
    }

    /**
     * Simulate typing in chat. This will last for 25 seconds.
     */
    async sendStateTyping() {
        return (chatId => {
            window.WWebJS.sendChatstate('typing', chatId);
            return true;
        })(this.id._serialized);
    }

    /**
     * Simulate recording audio in chat. This will last for 25 seconds.
     */
    async sendStateRecording() {
        return (chatId => {
            window.WWebJS.sendChatstate('recording', chatId);
            return true;
        })(this.id._serialized);
    }

    /**
     * Stops typing or recording in chat immediately.
     */
    async clearState() {
        return (chatId => {
            window.WWebJS.sendChatstate('stop', chatId);
            return true;
        })(this.id._serialized);
    }

    /**
     * Returns the Contact that corresponds to this Chat.
     * @returns {Promise<Contact>}
     */
    async getContact() {
        return await this.client.getContactById(this.id._serialized);
    }

    /**
     * Returns array of all Labels assigned to this Chat
     * @returns {Promise<Array<Label>>}
     */
    async getLabels() {
        return this.client.getChatLabels(this.id._serialized);
    }
}

/**
 * Represents a Private Chat on WhatsApp
 * @extends {Chat}
 */
class PrivateChat extends Chat {

}

/**
 * Group participant information
 * @typedef {Object} GroupParticipant
 * @property {ContactId} id
 * @property {boolean} isAdmin
 * @property {boolean} isSuperAdmin
 */

/**
 * Represents a Group Chat on WhatsApp
 * @extends {Chat}
 */
class GroupChat extends Chat {
    _patch(data) {
        this.groupMetadata = data.groupMetadata;

        return super._patch(data);
    }

    /**
     * Gets the group owner
     * @type {ContactId}
     */
    get owner() {
        return this.groupMetadata.owner;
    }
    
    /**
     * Gets the date at which the group was created
     * @type {date}
     */
    get createdAt() {
        return new Date(this.groupMetadata.creation * 1000);
    }

    /** 
     * Gets the group description
     * @type {string}
     */
    get description() {
        return this.groupMetadata.desc;
    }

    /**
     * Gets the group participants
     * @type {Array<GroupParticipant>}
     */
    get participants() {
        return this.groupMetadata.participants;
    }

    /**
     * Adds a list of participants by ID to the group
     * @param {Array<string>} participantIds 
     * @returns {Promise<Object>}
     */
    async addParticipants(participantIds) {
        return await ((chatId, participantIds) => {
            return window.Store.Wap.addParticipants(chatId, participantIds);
        })(this.id._serialized, participantIds);
    }

    /**
     * Removes a list of participants by ID to the group
     * @param {Array<string>} participantIds 
     * @returns {Promise<Object>}
     */
    async removeParticipants(participantIds) {
        return await ((chatId, participantIds) => {
            return window.Store.Wap.removeParticipants(chatId, participantIds);
        })(this.id._serialized, participantIds);
    }

    /**
     * Promotes participants by IDs to admins
     * @param {Array<string>} participantIds 
     * @returns {Promise<{ status: number }>} Object with status code indicating if the operation was successful
     */
    async promoteParticipants(participantIds) {
        return ((chatId, participantIds) => {
            return window.Store.Wap.promoteParticipants(chatId, participantIds);
        })(this.id._serialized, participantIds);
    }

    /**
     * Demotes participants by IDs to regular users
     * @param {Array<string>} participantIds 
     * @returns {Promise<{ status: number }>} Object with status code indicating if the operation was successful
     */
    async demoteParticipants(participantIds) {
        return ((chatId, participantIds) => {
            return window.Store.Wap.demoteParticipants(chatId, participantIds);
        })(this.id._serialized, participantIds);
    }

    /**
     * Updates the group subject
     * @param {string} subject 
     * @returns {Promise} 
     */
    async setSubject(subject) {
        let res = ((chatId, subject) => {
            return window.Store.Wap.changeSubject(chatId, subject);
        })(this.id._serialized, subject);

        if(res.status == 200) {
            this.name = subject;
        }
    }

    /**
     * Updates the group description
     * @param {string} description 
     * @returns {Promise} 
     */
    async setDescription(description) {
        let res = ((chatId, description) => {
            let descId = window.Store.GroupMetadata.get(chatId).descId;
            return window.Store.Wap.setGroupDescription(chatId, description, window.Store.genId(), descId);
        })(this.id._serialized, description);

        if (res.status == 200) {
            this.groupMetadata.desc = description;
        }
    }

    /**
     * Updates the group settings to only allow admins to send messages.
     * @param {boolean} [adminsOnly=true] Enable or disable this option 
     * @returns {Promise<boolean>} Returns true if the setting was properly updated. This can return false if the user does not have the necessary permissions.
     */
    async setMessagesAdminsOnly(adminsOnly=true) {
        let res = ((chatId, value) => {
            return window.Store.Wap.setGroupProperty(chatId, 'announcement', value);
        })(this.id._serialized, adminsOnly);

        if (res.status !== 200) return false;
        
        this.groupMetadata.announce = adminsOnly;
        return true;
    }

    /**
     * Updates the group settings to only allow admins to edit group info (title, description, photo).
     * @param {boolean} [adminsOnly=true] Enable or disable this option 
     * @returns {Promise<boolean>} Returns true if the setting was properly updated. This can return false if the user does not have the necessary permissions.
     */
    async setInfoAdminsOnly(adminsOnly=true) {
        let res = ((chatId, value) => {
            return window.Store.Wap.setGroupProperty(chatId, 'restrict', value);
        })(this.id._serialized, adminsOnly);

        if (res.status !== 200) return false;
        
        this.groupMetadata.restrict = adminsOnly;
        return true;
    }

    /**
     * Gets the invite code for a specific group
     * @returns {Promise<string>} Group's invite code
     */
    async getInviteCode() {
        let res = (chatId => {
            return window.Store.Wap.groupInviteCode(chatId);
        })(this.id._serialized);

        if (res.status == 200) {
            return res.code;
        } 

        throw new Error('Not authorized');
    }
    
    /**
     * Invalidates the current group invite code and generates a new one
     * @returns {Promise}
     */
    async revokeInvite() {
        return (chatId => {
            return window.Store.Wap.revokeGroupInvite(chatId);
        })(this.id._serialized);
    }

    /**
     * Makes the bot leave the group
     * @returns {Promise}
     */
    async leave() {
        return (chatId => {
            return window.Store.Wap.leaveGroup(chatId);
        })(this.id._serialized);
    }

}

class ChatFactory {
    static create(client, data) {
        if(data.isGroup) {
            return new GroupChat(client, data);
        }

        return new PrivateChat(client, data);
    }
}

class Client extends EventEmitter {
    constructor() {
        super();
        this.info = new ClientInfo(this, window.Store.Conn.serialize());
        console.log(this.info);
        this.interface = new InterfaceController(this);

        // Register Events
        window.onAddMessageEvent = (msg) => {
            if (!msg.isNewMsg) return;

            if (msg.type === 'gp2') {
                const notification = new GroupNotification(this, msg);
                if (msg.subtype === 'add' || msg.subtype === 'invite') {
                    /**
                     * Emitted when a user joins the chat via invite link or is added by an admin.
                     * @event Client#group_join
                     * @param {GroupNotification} notification GroupNotification with more information about the action
                     */
                    this.emit(Events.GROUP_JOIN, notification);
                } else if (
                    msg.subtype === 'remove' ||
                    msg.subtype === 'leave'
                ) {
                    /**
                     * Emitted when a user leaves the chat or is removed by an admin.
                     * @event Client#group_leave
                     * @param {GroupNotification} notification GroupNotification with more information about the action
                     */
                    this.emit(Events.GROUP_LEAVE, notification);
                } else {
                    /**
                     * Emitted when group settings are updated, such as subject, description or picture.
                     * @event Client#group_update
                     * @param {GroupNotification} notification GroupNotification with more information about the action
                     */
                    this.emit(Events.GROUP_UPDATE, notification);
                }
                return;
            }

            const message = new Message(this, msg);

            /**
             * Emitted when a new message is created, which may include the current user's own messages.
             * @event Client#message_create
             * @param {Message} message The message that was created
             */
            this.emit(Events.MESSAGE_CREATE, message);

            if (msg.id.fromMe) return;

            /**
             * Emitted when a new message is received.
             * @event Client#message
             * @param {Message} message The message that was received
             */
            this.emit(Events.MESSAGE_RECEIVED, message);
        };

        let last_message;

        window.onChangeMessageTypeEvent = (msg) => {
            if (msg.type === 'revoked') {
                const message = new Message(this, msg);
                let revoked_msg;
                if (last_message && msg.id.id === last_message.id.id) {
                    revoked_msg = new Message(this, last_message);
                }

                /**
                 * Emitted when a message is deleted for everyone in the chat.
                 * @event Client#message_revoke_everyone
                 * @param {Message} message The message that was revoked, in its current state. It will not contain the original message's data.
                 * @param {?Message} revoked_msg The message that was revoked, before it was revoked. It will contain the message's original data.
                 * Note that due to the way this data is captured, it may be possible that this param will be undefined.
                 */
                this.emit(
                    Events.MESSAGE_REVOKED_EVERYONE,
                    message,
                    revoked_msg
                );
            }
        };

        window.onChangeMessageEvent = (msg) => {
            if (msg.type !== 'revoked') {
                last_message = msg;
            }
        };

        window.onRemoveMessageEvent = (msg) => {
            if (!msg.isNewMsg) return;

            const message = new Message(this, msg);

            /**
             * Emitted when a message is deleted by the current user.
             * @event Client#message_revoke_me
             * @param {Message} message The message that was revoked
             */
            this.emit(Events.MESSAGE_REVOKED_ME, message);
        };

        window.onMessageAckEvent = (msg, ack) => {
            const message = new Message(this, msg);

            /**
             * Emitted when an ack event occurrs on message type.
             * @event Client#message_ack
             * @param {Message} message The message that was affected
             * @param {MessageAck} ack The new ACK value
             */
            this.emit(Events.MESSAGE_ACK, message, ack);
        };

        window.onMessageMediaUploadedEvent = (msg) => {
            const message = new Message(this, msg);

            /**
             * Emitted when media has been uploaded for a message sent by the client.
             * @event Client#media_uploaded
             * @param {Message} message The message with media that was uploaded
             */
            this.emit(Events.MEDIA_UPLOADED, message);
        };

        window.onAppStateChangedEvent = (state) => {
            /**
             * Emitted when the connection state changes
             * @event Client#change_state
             * @param {WAState} state the new connection state
             */
            this.emit(Events.STATE_CHANGED, state);

            const ACCEPTED_STATES = [
                WAState.CONNECTED,
                WAState.OPENING,
                WAState.PAIRING,
                WAState.TIMEOUT,
            ];

            if (this.options.takeoverOnConflict) {
                ACCEPTED_STATES.push(WAState.CONFLICT);

                if (state === WAState.CONFLICT) {
                    setTimeout(() => {
                        window.Store.AppState.takeover();
                    }, this.options.takeoverTimeoutMs);
                }
            }

            if (!ACCEPTED_STATES.includes(state)) {
                /**
                 * Emitted when the client has been disconnected
                 * @event Client#disconnected
                 * @param {WAState|"NAVIGATION"} reason reason that caused the disconnect
                 */
                this.emit(Events.DISCONNECTED, state);
                this.destroy();
            }
        };

        window.onBatteryStateChangedEvent = (state) => {
            const { battery, plugged } = state;

            if (battery === undefined) return;

            /**
             * Emitted when the battery percentage for the attached device changes
             * @event Client#change_battery
             * @param {object} batteryInfo
             * @param {number} batteryInfo.battery - The current battery percentage
             * @param {boolean} batteryInfo.plugged - Indicates if the phone is plugged in (true) or not (false)
             */
            this.emit(Events.BATTERY_CHANGED, { battery, plugged });
        };

        // Attach Event Listeners
        window.Store.Msg.on('add', (msg) => {
            if (msg.isNewMsg)
                window.onAddMessageEvent(
                    window.WWebJS.getMessageModel(msg)
                );
        });

        window.Store.Msg.on('change', (msg) => {
            window.onChangeMessageEvent(window.WWebJS.getMessageModel(msg));
        });

        window.Store.Msg.on('change:type', (msg) => {
            window.onChangeMessageTypeEvent(
                window.WWebJS.getMessageModel(msg)
            );
        });

        window.Store.Msg.on('change:ack', (msg, ack) => {
            window.onMessageAckEvent(
                window.WWebJS.getMessageModel(msg),
                ack
            );
        });

        window.Store.Msg.on('change:isUnsentMedia', (msg, unsent) => {
            if (msg.id.fromMe && !unsent)
                window.onMessageMediaUploadedEvent(
                    window.WWebJS.getMessageModel(msg)
                );
        });

        window.Store.Msg.on('remove', (msg) => {
            if (msg.isNewMsg)
                window.onRemoveMessageEvent(
                    window.WWebJS.getMessageModel(msg)
                );
        });

        window.Store.AppState.on('change:state', (_AppState, state) => {
            window.onAppStateChangedEvent(state);
        });

        window.Store.Conn.on('change:battery', (state) => {
            window.onBatteryStateChangedEvent(state);
        });

        /**
         * Emitted when the client has initialized and is ready to receive messages.
         * @event Client#ready
         */
        this.emit(Events.READY);

        // Disconnect when navigating away
        // Because WhatsApp Web now reloads when logging out from the device, this also covers that case
        window.addEventListener('beforeunload', async () => {
            this.emit(Events.DISCONNECTED, 'NAVIGATION');
            await this.destroy();
        });

    }

    /**
     * Closes the client
     */
    async destroy() {
        // Does nothing for now
        // await this.pupBrowser.close();
    }

    /**
     * Logs out the client, closing the current session
     */
    async logout() {
        return window.Store.AppState.logout();
    }

    /**
     * Returns the version of WhatsApp Web currently being run
     * @returns {Promise<string>}
     */
    async getWWebVersion() {
        return window.Debug.VERSION;
    }

    /**
     * Mark as seen for the Chat
     *  @param {string} chatId
     *  @returns {Promise<boolean>} result
     *
     */
    async sendSeen(chatId) {
        return await window.WWebJS.sendSeen(chatId);
    }

    /**
     * Message options.
     * @typedef {Object} MessageSendOptions
     * @property {boolean} [linkPreview=true] - Show links preview
     * @property {boolean} [sendAudioAsVoice=false] - Send audio as voice message
     * @property {boolean} [sendMediaAsSticker=false] - Send media as a sticker
     * @property {boolean} [sendMediaAsDocument=false] - Send media as a document
     * @property {boolean} [parseVCards=true] - Automatically parse vCards and send them as contacts
     * @property {string} [caption] - Image or video caption
     * @property {string} [quotedMessageId] - Id of the message that is being quoted (or replied to)
     * @property {Contact[]} [mentions] - Contacts that are being mentioned in the message
     * @property {boolean} [sendSeen=true] - Mark the conversation as seen after sending the message
     * @property {MessageMedia} [media] - Media to be sent
     */

    /**
     * Send a message to a specific chatId
     * @param {string} chatId
     * @param {string|MessageMedia|Location|Contact|Array<Contact>} content
     * @param {MessageSendOptions} [options] - Options used when sending the message
     *
     * @returns {Promise<Message>} Message that was just sent
     */
    async sendMessage(chatId, content, options = {}) {
        let internalOptions = {
            linkPreview: options.linkPreview === false ? undefined : true,
            sendAudioAsVoice: options.sendAudioAsVoice,
            sendMediaAsSticker: options.sendMediaAsSticker,
            sendMediaAsDocument: options.sendMediaAsDocument,
            caption: options.caption,
            quotedMessageId: options.quotedMessageId,
            parseVCards: options.parseVCards === false ? false : true,
            mentionedJidList: Array.isArray(options.mentions)
                ? options.mentions.map((contact) => contact.id._serialized)
                : [],
        };

        const sendSeen =
            typeof options.sendSeen === 'undefined' ? true : options.sendSeen;

        if (content instanceof MessageMedia) {
            internalOptions.attachment = content;
            content = '';
        } else if (options.media instanceof MessageMedia) {
            internalOptions.attachment = options.media;
            internalOptions.caption = content;
            content = '';
        } else if (content instanceof Location) {
            internalOptions.location = content;
            content = '';
        } else if (content instanceof Contact) {
            internalOptions.contactCard = content.id._serialized;
            content = '';
        } else if (
            Array.isArray(content) &&
            content.length > 0 &&
            content[0] instanceof Contact
        ) {
            internalOptions.contactCardList = content.map(
                (contact) => contact.id._serialized
            );
            content = '';
        }

        if (internalOptions.sendMediaAsSticker && internalOptions.attachment) {
            throw new Error('Cannot Send Media as Sticker');
            // internalOptions.attachment = await Util.formatToWebpSticker(
            //     internalOptions.attachment
            // );
        }

        const newMessage = await (async (
            chatId,
            message,
            options,
            sendSeen
        ) => {
            const chatWid = window.Store.WidFactory.createWid(chatId);
            const chat = await window.Store.Chat.find(chatWid);

            if (sendSeen) {
                window.WWebJS.sendSeen(chatId);
            }

            const msg = await window.WWebJS.sendMessage(
                chat,
                message,
                options,
                sendSeen
            );
            return msg.serialize();
        })(chatId, content, internalOptions, sendSeen);

        return new Message(this, newMessage);
    }

    /**
     * Get all current chat instances
     * @returns {Promise<Array<Chat>>}
     */
    async getChats() {
        let chats = await window.WWebJS.getChats();
        return chats.map((chat) => ChatFactory.create(this, chat));
    }

    /**
     * Get chat instance by ID
     * @param {string} chatId
     * @returns {Promise<Chat>}
     */
    async getChatById(chatId) {
        let chat = await window.WWebJS.getChat(chatId);
        return ChatFactory.create(this, chat);
    }

    /**
     * Get all current contact instances
     * @returns {Promise<Array<Contact>>}
     */
    async getContacts() {
        let contacts = window.WWebJS.getContacts();
        return contacts.map((contact) => ContactFactory.create(this, contact));
    }

    /**
     * Get contact instance by ID
     * @param {string} contactId
     * @returns {Promise<Contact>}
     */
    async getContactById(contactId) {
        let contact = window.WWebJS.getContact(contactId);
        return ContactFactory.create(this, contact);
    }

    /**
     * Returns an object with information about the invite code's group
     * @param {string} inviteCode
     * @returns {Promise<object>} Invite information
     */
    async getInviteInfo(inviteCode) {
        return window.Store.Wap.groupInviteInfo(inviteCode);
    }

    /**
     * Accepts an invitation to join a group
     * @param {string} inviteCode Invitation code
     * @returns {Promise<string>} Id of the joined Chat
     */
    async acceptInvite(inviteCode) {
        const chatId = await window.Store.Invite.sendJoinGroupViaInvite(
            inviteCode
        );
        return chatId._serialized;
    }

    /**
     * Sets the current user's status message
     * @param {string} status New status message
     */
    async setStatus(status) {
        await window.Store.Wap.sendSetStatus(status);
    }

    /**
     * Sets the current user's display name.
     * This is the name shown to WhatsApp users that have not added you as a contact beside your number in groups and in your profile.
     * @param {string} displayName New display name
     */
    async setDisplayName(displayName) {
        await window.Store.Wap.setPushname(displayName);
    }

    /**
     * Gets the current connection state for the client
     * @returns {WAState}
     */
    async getState() {
        return window.Store.AppState.state;
    }

    /**
     * Marks the client as online
     */
    async sendPresenceAvailable() {
        return window.Store.Wap.sendPresenceAvailable();
    }

    /**
     * Enables and returns the archive state of the Chat
     * @returns {boolean}
     */
    async archiveChat(chatId) {
        let chat = await window.Store.Chat.get(chatId);
        await window.Store.Cmd.archiveChat(chat, true);
        return chat.archive;
    }

    /**
     * Changes and returns the archive state of the Chat
     * @returns {boolean}
     */
    async unarchiveChat(chatId) {
        let chat = await window.Store.Chat.get(chatId);
        await window.Store.Cmd.archiveChat(chat, false);
        return chat.archive;
    }

    /**
     * Pins the Chat
     * @returns {Promise<boolean>} New pin state. Could be false if the max number of pinned chats was reached.
     */
    async pinChat(chatId) {
        let chat = window.Store.Chat.get(chatId);
        if (chat.pin) {
            return true;
        }
        const MAX_PIN_COUNT = 3;
        if (window.Store.Chat.models.length > MAX_PIN_COUNT) {
            let maxPinned = window.Store.Chat.models[MAX_PIN_COUNT - 1].pin;
            if (maxPinned) {
                return false;
            }
        }
        await window.Store.Cmd.pinChat(chat, true);
        return true;
    }

    /**
     * Unpins the Chat
     * @returns {Promise<boolean>} New pin state
     */
    async unpinChat(chatId) {
        let chat = window.Store.Chat.get(chatId);
        if (!chat.pin) {
            return false;
        }
        await window.Store.Cmd.pinChat(chat, false);
        return false;
    }

    /**
     * Mutes the Chat until a specified date
     * @param {string} chatId ID of the chat that will be muted
     * @param {Date} unmuteDate Date when the chat will be unmuted
     */
    async muteChat(chatId, unmuteDate) {
        var timestamp = unmuteDate.getTime() / 1000;
        let chat = await window.Store.Chat.get(chatId);
        await chat.mute.mute(timestamp, !0);
    }

    /**
     * Unmutes the Chat
     * @param {string} chatId ID of the chat that will be unmuted
     */
    async unmuteChat(chatId) {
        let chat = await window.Store.Chat.get(chatId);
        await window.Store.Cmd.muteChat(chat, false);
    }

    /**
     * Mark the Chat as unread
     * @param {string} chatId ID of the chat that will be marked as unread
     */
    async markChatUnread(chatId) {
        let chat = await window.Store.Chat.get(chatId);
        await window.Store.Cmd.markChatUnread(chat, true);
    }

    /**
     * Returns the contact ID's profile picture URL, if privacy settings allow it
     * @param {string} contactId the whatsapp user's ID
     * @returns {Promise<string>}
     */
    async getProfilePicUrl(contactId) {
        const profilePic = await window.Store.Wap.profilePicFind(contactId);
        return profilePic ? profilePic.eurl : undefined;
    }

    /**
     * Force reset of connection state for the client
     */
    async resetState() {
        window.Store.AppState.phoneWatchdog.shiftTimer.forceRunNow();
    }

    /**
     * Check if a given ID is registered in whatsapp
     * @param {string} id the whatsapp user's ID
     * @returns {Promise<Boolean>}
     */
    async isRegisteredUser(id) {
        let result = await window.Store.Wap.queryExist(id);
        return result.jid !== undefined;
    }

    /**
     * Get the registered WhatsApp ID for a number.
     * Will return null if the number is not registered on WhatsApp.
     * @param {string} number Number or ID ("@c.us" will be automatically appended if not specified)
     * @returns {Promise<Object|null>}
     */
    async getNumberId(number) {
        if (!number.endsWith('@c.us')) {
            number += '@c.us';
        }

        try {
            return await window.WWebJS.getNumberId(number);
        } catch (_) {
            return null;
        }
    }

    /**
     * Create a new group
     * @param {string} name group title
     * @param {Array<Contact|string>} participants an array of Contacts or contact IDs to add to the group
     * @returns {Object} createRes
     * @returns {string} createRes.gid - ID for the group that was just created
     * @returns {Object.<string,string>} createRes.missingParticipants - participants that were not added to the group. Keys represent the ID for participant that was not added and its value is a status code that represents the reason why participant could not be added. This is usually 403 if the user's privacy settings don't allow you to add them to groups.
     */
    async createGroup(name, participants) {
        if (!Array.isArray(participants) || participants.length == 0) {
            throw 'You need to add at least one other participant to the group';
        }

        if (participants.every((c) => c instanceof Contact)) {
            participants = participants.map((c) => c.id._serialized);
        }

        const createRes = await (async (name, participantIds) => {
            const res = await window.Store.Wap.createGroup(
                name,
                participantIds
            );
            console.log(res);
            if (!res.status === 200) {
                throw 'An error occurred while creating the group!';
            }
            return res;
        })(name, participants);

        const missingParticipants = createRes.participants.reduce(
            (missing, c) => {
                const id = Object.keys(c)[0];
                const statusCode = c[id].code;
                if (statusCode != 200)
                    return Object.assign(missing, { [id]: statusCode });
                return missing;
            },
            {}
        );

        return { gid: createRes.gid, missingParticipants };
    }

    /**
     * Get all current Labels
     * @returns {Promise<Array<Label>>}
     */
    async getLabels() {
        const labels = window.WWebJS.getLabels();
        return labels.map((data) => new Label(this, data));
    }

    /**
    * Get Label instance by ID
    * @param {string} labelId
    * @returns {Promise<Label>}
    */
    async getLabelById(labelId) {
        const label = window.WWebJS.getLabel(labelId);
        return new Label(this, label);
    }

    /**
    * Get all Labels assigned to a chat
    * @param {string} chatId
    * @returns {Promise<Array<Label>>}
    */
    async getChatLabels(chatId) {
        const labels = await window.WWebJS.getChatLabels(chatId);
        return labels.map((data) => new Label(this, data));
    }

    /**
    * Get all Chats for a specific Label
    * @param {string} labelId
    * @returns {Promise<Array<Chat>>}
    */
    async getChatsByLabelId(labelId) {
        const chatIds = await (async (labelId) => {
            const label = window.Store.Label.get(labelId);
            const labelItems = label.labelItemCollection.models;
            return labelItems.reduce((result, item) => {
                if (item.parentType === 'Chat') {
                    result.push(item.parentId);
                }
                return result;
            }, []);
        })(labelId);
        return Promise.all(chatIds.map((id) => this.getChatById(id)));
    }

}

initializeClient();

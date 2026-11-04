import { localize } from "./libs/functions.js";

export class ChatMessagePublisher {
    postMessage(chatData, flavor, text, inCharacter, flags = null) {
        const generation = game.data.release.generation;
        const messageStyle = generation < 12
            ? CONST.CHAT_MESSAGE_TYPES.OOC
            : inCharacter ? CONST.CHAT_MESSAGE_STYLES.IC : CONST.CHAT_MESSAGE_STYLES.OOC;
        const messageData = {
            flavor,
            user: chatData.user,
            speaker: chatData.speaker,
            content: text,
        };
        if (flags) messageData.flags = flags;

        if (generation < 14) {
            messageData.type = messageStyle;
        } else {
            messageData.style = messageStyle;
        }

        return ChatMessage.create(messageData, { chatBubble: true });
    }

    async addReplayControl(chatMessage, historyItemId, hasDirection = false) {
        const replayControl = historyItemId
            ? `<span class="acd-ta-replay" data-item-id="${historyItemId}"${hasDirection ? ' data-direction="true"' : ""}><i class="fa-solid fa-repeat"></i></span>`
            : "";
        const flavor = `${localize("acd.ta.chat.textTalked")}${replayControl}`;

        await chatMessage.update({ flavor });
        return chatMessage;
    }
}
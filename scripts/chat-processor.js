import TalkingActorsConstants from "./constants.js";
import { localize } from "./libs/functions.js";
import { CHAT_COMMANDS, parseChatCommand } from "./chat-command-parser.js";
import { ChatVoiceResolver } from "./chat-voice-resolver.js";
import { ChatMessagePublisher } from "./chat-message-publisher.js";

/** Coordinates chat command handling with voice resolution, TTS, and message publication. */
export class ChatProcessor {
    static talkCommand = CHAT_COMMANDS.TALK;
    static talkSilentCommand = CHAT_COMMANDS.TALK_SILENT;
    static icCommand = CHAT_COMMANDS.IN_CHARACTER;
    static oocCommand = CHAT_COMMANDS.OUT_OF_CHARACTER;
    static narrateCommand = CHAT_COMMANDS.NARRATE;

    constructor(ttsConnector, logger, dependencies = {}) {
        this.ttsConnector = ttsConnector;
        this.logger = logger;
        this.voiceResolver = dependencies.voiceResolver ?? new ChatVoiceResolver(ttsConnector, logger);
        this.messagePublisher = dependencies.messagePublisher ?? new ChatMessagePublisher();
        this.speechStatus = dependencies.speechStatus ?? null;
    }

    /** Returns true when Foundry should continue handling the message. */
    processChatMessage(chatlog, originalMessageText, chatData, postToChat = true) {
        const isAutoInCharacterTalkEnabled = game.settings.get(TalkingActorsConstants.MODULE, TalkingActorsConstants.SETTINGS.AUTO_IN_CHARACTER_TALK);
        const commandData = parseChatCommand(originalMessageText, isAutoInCharacterTalkEnabled);
        if (!commandData) return true;

        if (commandData.command === ChatProcessor.talkSilentCommand) {
            postToChat = false;
        }

        const voiceResolution = this.voiceResolver.resolve({
            command: commandData.command,
            voiceName: commandData.voiceName,
            actorIdentifier: commandData.actorIdentifier,
            chatData,
        });

        this.logger.debug(`Voice ID: ${voiceResolution.voiceId}`);
        this.processAndPostMessage({
            ...voiceResolution,
            postToChat,
            chatData,
            messageText: commandData.text,
            chatlog,
        });

        return false;
    }

    async processAndPostMessage({ voiceId, speakerActor, postToChat, chatData, messageText, inCharacter, settings, chatlog }) {
        if (!voiceId) {
            return this.messagePublisher.postMessage(chatData, "", messageText, inCharacter);
        }

        const shouldPost = postToChat && game.settings.get(
            TalkingActorsConstants.MODULE,
            TalkingActorsConstants.SETTINGS.POST_TO_CHAT,
        );
        const status = shouldPost && !this.ttsConnector.isMuted ? this.startStatus() : null;
        const chatMessagePromise = shouldPost
            ? this.messagePublisher.postMessage(
                chatData,
                localize("acd.ta.chat.textTalked"),
                `<span class="acd-ta-talked">${messageText}</span>`,
                inCharacter,
                status ? { [TalkingActorsConstants.MODULE]: { speechStatus: status.snapshot() } } : null,
            ).then(message => {
                status?.attach(message);
                return message;
            })
            : null;
        const speechPromise = this.ttsConnector.textToSpeech(voiceId, speakerActor, messageText, settings, {
            onProgress: stage => (stage === "playing" ? status?.finish() : status?.update(stage)),
        }).then(
            id => {
                status?.finish(id === null ? "skipped" : "complete");
                return id;
            },
            error => {
                status?.finish("failed");
                throw error;
            },
        );

        if (chatMessagePromise) {
            const chatMessage = await chatMessagePromise;
            const historyItemId = await speechPromise;
            await this.messagePublisher.addReplayControl(chatMessage, historyItemId);
            chatlog.updateMessage(chatMessage);
        }
    }

    startStatus() {
        try {
            return this.speechStatus?.start() ?? null;
        } catch (error) {
            this.logger.warn("Unable to display speech status:", error);
            return null;
        }
    }
}


import TalkingActorsConstants from "./constants.js";
import { localize } from "./libs/functions.js";
import { SpeakerResolver } from "./speaker-resolver.js";

/**
 * ChatProcessor
 *
 * Orchestrates parsing of chat messages, resolving a speaking actor/voice, optionally posting a chat
 * message, and invoking a TTS connector to speak the message. Designed for use with Foundry VTT and
 * the Talking Actors module; it reads module and game settings, updates chat speaker/alias information,
 * integrates with optional dependencies (Conversation HUD, Yendor's Scene Actors), and updates chat
 * messages with playback metadata returned from the TTS system.
 *
 * Static properties:
 * - talkCommand: the primary command that triggers audible speech (e.g. "talk").
 * - talkSilentCommand: a variant that triggers speech without posting chat (e.g. "talk-s").
 * - icCommand: in-character command name (e.g. "ic").
 * - oocCommand: out-of-character command name (e.g. "ooc").
 *
 * Side effects:
 * - Reads game/module settings to determine automatic in-character behavior and post-to-chat settings.
 * - May modify chatData.speaker and chatData.speaker.alias to reflect resolved actor/narrator info.
 * - Posts chat messages and updates those messages' flavor to include "replay" metadata when TTS is used.
 * - Invokes the ttsConnector to produce speech and waits for an identifier used to attach playback controls.
 * - Emits UI notifications on error (e.g. unknown voice) and writes log messages via the logger.
 *
 * Notes / behavior considerations:
 * - This class relies on the surrounding Foundry environment (global game, ui, ChatMessage, CONST, etc.).
 * - It integrates with optional modules if they are active and exposes safe fallbacks when integrations are absent.
 * - Methods may mutate provided chatData (speaker/alias) to keep the posted chat consistent with the TTS output.
 */
export class ChatProcessor {

    /* static properties */
    static talkCommand = "talk";
    static talkSilentCommand = "talk-s";
    static icCommand = "ic";
    static oocCommand = "ooc";
    static narrateCommand = "narrate";

    /* constructor */
    constructor(ttsConnector, logger) {
        this.ttsConnector = ttsConnector;
        this.logger = logger;
    }

    /* main method */
    /**
     * Process an incoming chat message and, if it matches a Talking Actors command,
     * prepare and dispatch text-to-speech (TTS) output and optionally post a chat message.
     *
     * This method:
     * - Parses the original message text via prepareMessageData to detect a Talking Actors command.
     * - If no Talking Actors command is present, returns true so normal chat processing continues.
     * - Extracts command parts (command token, optional voice name, optional actor identifier, and message text).
     * - Determines whether the message should be treated as in-character (compares command to ChatProcessor.icCommand).
     * - Honors a "silent" command (ChatProcessor.talkSilentCommand) by forcing postToChat = false.
     * - Resolves a voice id either from an explicitly named voice or from the resolved speaker actor.
     * - Resolves the speaker actor using resolveSpeakerActor and, if applicable, updates chatData.speaker (actor id and alias).
     * - Obtains per-actor voice id and settings via this.ttsConnector when a speaker actor is present.
     * - Calls processAndPostMessage(...) to perform TTS and optional chat posting.
     *
     * Side effects:
     * - Reads module settings (game.settings) to determine auto in-character talk behavior.
     * - May mutate chatData.speaker when a non-narrator actor is resolved.
     * - Logs information via this.logger.
     *
     * @returns {boolean} Returns true if the message was NOT handled by Talking Actors and normal chat processing
     *                    should continue. Returns false if Talking Actors handled the message and normal chat posting
     *                    should be suppressed.
     */
    processChatMessage(chatlog, originalMessageText, chatData, postToChat = true) {
        const isAutoInCharacterTalkEnabled = game.settings.get(TalkingActorsConstants.MODULE, TalkingActorsConstants.SETTINGS.AUTO_IN_CHARACTER_TALK);

        let messageData= this.prepareMessageData(originalMessageText, isAutoInCharacterTalkEnabled);

        if (!messageData) {
            // no chat command or wrong chat command found. Return for further processing
            return true;
        }

        const command = messageData[1];
        const messageVoiceName = messageData[2];
        const messageVoiceActor = messageData[3];
        const messageText = messageData[4];

        let inCharacter = command == ChatProcessor.icCommand;

        if (command === ChatProcessor.talkSilentCommand) {
            postToChat = false;
        }

        let voice_id;
        let settings;

        // do we have a voicename specified (e.g. "/talk [Dave] ...")?
        // This will override the voice configured for the talking actor
        if (messageVoiceName) {
            voice_id = this.getVoiceIdByName(voice_id, messageVoiceName);
        }

        let speakerActor;

        if (!voice_id) {
            if (command === ChatProcessor.narrateCommand) {
                this.logger.debug("Narrate command detected; resolving narrator actor.");
                speakerActor = SpeakerResolver.tryGetSpeakerActorForNarratingActor();
                speakerActor.isNarrator = true;
            } else {
                speakerActor = SpeakerResolver.resolveSpeakerActor(messageVoiceActor,  chatData) ;
            }
        }

        if (speakerActor) {
            this.logger.info(`Speaking actor: ${speakerActor.name} (${speakerActor._id})`);

            inCharacter = !speakerActor.isNarrator;

            voice_id = this.ttsConnector.getVoiceIdFromActor(speakerActor);
            settings = this.ttsConnector.getVoiceSettingsFromActor(speakerActor);
            
            if (!voice_id || !settings) {
                this.logger.info(`No voice configured for actor "${speakerActor.name}". Using voice of narrator actor.`);

                let defaultSpeaker = SpeakerResolver.tryGetSpeakerActorForNarratingActor();
                if (defaultSpeaker) {
                    voice_id = this.ttsConnector.getVoiceIdFromActor(defaultSpeaker);
                    settings = this.ttsConnector.getVoiceSettingsFromActor(defaultSpeaker);
                    
                    if (voice_id === null) {
                        this.logger.warn(`No voice configured for default narrator actor "${defaultSpeaker.name}". Please configure a voice for this actor. Skipping TTS for message.`);
                        voice_id = null;
                        settings = null;
                    }
                }
                else {
                    this.logger.warn(`No default narrator actor found, please configure a narrator actor in the module settings. Skipping TTS for message.`);
                    voice_id = null;
                    settings = null;
                }
            }


            if ( !speakerActor.isNarrator ) {
                chatData.speaker.actor = speakerActor._id;
                if (SpeakerResolver.isActorNameRevealed(speakerActor)) {
                    chatData.speaker.alias = speakerActor.name;
                }   
                else {
                    chatData.speaker.alias = localize("acd.ta.chat.unknownSpeaker");   
                } 
            }
            else {
                chatData.speaker.alias = null;
                chatData.speaker.actor = null; 
            }
        }
    
        this.logger.debug(`Voice ID: ${voice_id}`);

        this.processAndPostMessage(voice_id, speakerActor, postToChat, chatData, messageText, inCharacter, settings, chatlog);

        return false; //suppress normal chat message posting
    }

    /* helper methods */
    async processAndPostMessage(voice_id, speakerActor, postToChat, chatData, messageText, inCharacter, settings, chatlog) {
        if (voice_id) {
            let chatMessagePromise;

            if (postToChat && game.settings.get(TalkingActorsConstants.MODULE, TalkingActorsConstants.SETTINGS.POST_TO_CHAT)) {
                chatMessagePromise = this.postToChat(chatData, `${localize("acd.ta.chat.textTalked")}`, `<span class="acd-ta-talked">${messageText}</span>`, inCharacter);
            }

            let speakPromise = this.ttsConnector.textToSpeech(voice_id, speakerActor, messageText, settings);

            if (chatMessagePromise) {
                let chatMessage = await chatMessagePromise;
                let itemId = await speakPromise;

                await this.updateChatMessageFlavor(itemId, chatMessage, { showPlay: true });
                
                chatlog.updateMessage(chatMessage)
            }
        } else {
            this.postToChat(chatData, ``, messageText, inCharacter);
        }
    }

    /**
     * Parse a chat message for a slash-command and optional modifiers, then verify whether the parsed
     * message is relevant for read-aloud processing.
     *
     * The function matches `messageText` against the pattern:
     *   ^\/(.+?)(?:[ ]+\[(.+?)\])?(?:[ ]+\{(.+?)\})?[ ]+(.*)$
     *
     * Capturing groups (match result indices):
     *   1: command (text immediately following the leading '/')
     *   2: optional bracketed voiceName (content inside [...])
     *   3: optional braced actorName (content inside {...})
     *   4: message body (the remainder of the string after required whitespace)
     *
     * If the input does not match the expected pattern or if the parsed data is deemed not relevant
     * by isMessageReadAloudRelevant(...), the function returns null.
     *
     * @param {string} messageText - The raw chat message to parse (expected to begin with a '/').
     * @param {boolean} isAutoInCharacterTalkEnabled - Whether automatic in-character talk handling is enabled;
     *        this flag is forwarded to the relevance check.
     * @returns {?RegExpMatchArray} The RegExp match array (see capturing groups above) when the message
     *          is relevant, or null when the input does not match or is not relevant for read-aloud.
     */
    prepareMessageData(messageText, isAutoInCharacterTalkEnabled) {
        let messageData = messageText.match(`^\/(.+?)(?:[ ]+\\[(.+?)\\])?(?:[ ]+\\{(.+?)\\})?[ ]+(.*)$`);

        if (!this.isMessageReadAloudRelevant(messageData, isAutoInCharacterTalkEnabled)) {
            return null;
        }

        return messageData;
    }

    /**
     * Determine whether a chat message should be considered for read-aloud processing.
     *
     * Returns false if no message data is provided. Otherwise, returns true when the message
     * matches one of the recognized talk commands handled by this object:
     * - a normal talk command,
     * - a silent talk command, or
     * - an in-character talk command (only when `isAutoInCharacterTalkEnabled` is true).
     *
     * @param {Object|null|undefined} messageData - The chat message data to evaluate.
     * @param {boolean} isAutoInCharacterTalkEnabled - Whether in-character talk commands should be treated as relevant.
     * @returns {boolean} True if the message is relevant for read-aloud; otherwise false.
     */
    isMessageReadAloudRelevant(messageData, isAutoInCharacterTalkEnabled) {
        if (!messageData) return false;

        const command = messageData[1];

        switch (command) {
            case ChatProcessor.talkCommand:
            case ChatProcessor.talkSilentCommand:
            case ChatProcessor.narrateCommand:
                return true;
            case ChatProcessor.icCommand:
                return isAutoInCharacterTalkEnabled;
            default:
                return false;
        }
    }

    getVoiceIdByName(voice_id, voiceName) {
        voice_id = this.ttsConnector.getVoiceId(voiceName);
        if (!voice_id) {
            this.logger.warn(`Voice name "${voiceName}" not found. Using actor's configured voice.`);
        }
        return voice_id;
    }

    postToChat(chatData, flavor, messageText, inCharacter) {
        // Ensure compatibility to Foundry prior generation 12
        let chatMessageType;
        if (game.data.release.generation < 12) {
            chatMessageType = CONST.CHAT_MESSAGE_TYPES.OOC;
        } else {
            if (inCharacter) {
                chatMessageType = CONST.CHAT_MESSAGE_STYLES.IC;
            } else {
                chatMessageType = CONST.CHAT_MESSAGE_STYLES.OOC;
            }
        }

        let messageData = {
            flavor: flavor,
            user: chatData.user,
            speaker: chatData.speaker,
            type: chatMessageType,
            content: messageText,
        };
        return ChatMessage.create(messageData, { chatBubble: true });
    }

    async updateChatMessageFlavor(itemId, chatMessage, options = {}) {
        let newflavor = `${localize("acd.ta.chat.textTalked")}`;

        if (options.showPlay) {
            newflavor = newflavor.concat(`<span class="acd-ta-replay" data-item-id="${itemId}"><i class="fa-solid fa-repeat"></i></span>`);
        }

        await chatMessage.update({ 'flavor': newflavor });
        chatMessage;
    }

}


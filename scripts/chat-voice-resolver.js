import TalkingActorsConstants from "./constants.js";
import { localize } from "./libs/functions.js";
import { SpeakerResolver } from "./speaker-resolver.js";
import { CHAT_COMMANDS } from "./chat-command-parser.js";

export class ChatVoiceResolver {
    constructor(ttsConnector, logger) {
        this.ttsConnector = ttsConnector;
        this.logger = logger;
    }

    resolve({ command, voiceName, actorIdentifier, chatData }) {
        let voiceId = null;
        let settings = null;
        let speakerActor = null;
        let inCharacter = command === CHAT_COMMANDS.IN_CHARACTER;

        if (voiceName) {
            voiceId = this.ttsConnector.getVoiceId(voiceName);
            if (!voiceId) {
                this.logger.warn(`Voice name "${voiceName}" not found. Using actor's configured voice.`);
            }
        }

        if (!voiceId) {
            if (command === CHAT_COMMANDS.NARRATE) {
                this.logger.debug("Narrate command detected; resolving narrator actor.");
                speakerActor = SpeakerResolver.tryGetSpeakerActorForNarratingActor();
                if (speakerActor) speakerActor.isNarrator = true;
            } else {
                speakerActor = SpeakerResolver.resolveSpeakerActor(actorIdentifier, chatData);
            }
        }

        if (speakerActor) {
            this.logger.info(`Speaking actor: ${speakerActor.name} (${speakerActor._id})`);
            inCharacter = !speakerActor.isNarrator;
            voiceId = this.ttsConnector.getVoiceIdFromActor(speakerActor);
            settings = this.ttsConnector.getVoiceSettingsFromActor(speakerActor);

            if (!voiceId || !settings) {
                ({ voiceId, settings } = this.resolveNarratorFallback(speakerActor));
            }

            this.updateChatSpeaker(chatData, speakerActor);
        }

        if (!voiceId) {
            const availableVoices = this.ttsConnector.getAvailableVoices();
            const configuredVoiceId = game.settings.get(
                TalkingActorsConstants.MODULE,
                TalkingActorsConstants.SETTINGS.FALLBACK_VOICE,
            );
            const configuredVoice = availableVoices.find(voice => (voice.id ?? voice.voice_id) === configuredVoiceId);
            const fallbackVoice = configuredVoice ?? availableVoices[0];
            voiceId = fallbackVoice?.id ?? fallbackVoice?.voice_id ?? null;
        }

        return { voiceId, settings, speakerActor, inCharacter };
    }

    resolveNarratorFallback(speakerActor) {
        this.logger.info(`No voice configured for actor "${speakerActor.name}". Using voice of narrator actor.`);

        const narratorActor = SpeakerResolver.tryGetSpeakerActorForNarratingActor();
        if (!narratorActor) {
            this.logger.warn("No default narrator actor found. Configure one in module settings; skipping TTS for message.");
            return { voiceId: null, settings: null };
        }

        const voiceId = this.ttsConnector.getVoiceIdFromActor(narratorActor);
        const settings = this.ttsConnector.getVoiceSettingsFromActor(narratorActor);
        if (!voiceId || !settings) {
            this.logger.warn(`No voice configured for default narrator actor "${narratorActor.name}". Skipping TTS for message.`);
            return { voiceId: null, settings: null };
        }

        return { voiceId, settings };
    }

    updateChatSpeaker(chatData, speakerActor) {
        if (speakerActor.isNarrator) {
            chatData.speaker.alias = null;
            chatData.speaker.actor = null;
            return;
        }

        chatData.speaker.actor = speakerActor._id;
        chatData.speaker.alias = SpeakerResolver.isActorNameRevealed(speakerActor)
            ? speakerActor.name
            : localize("acd.ta.chat.unknownSpeaker");
    }
}
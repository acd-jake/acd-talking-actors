import TalkingActorsConstants from "./constants.js";

export class TalkingActorsSettings {
    constructor(module) {
        this.module = module;
    }

    register() {
        if (!game?.settings) return;

        const reinitializeConnector = () => this.module.ttsConnector?.init();

        try {
            game.settings.register(TalkingActorsConstants.MODULE, TalkingActorsConstants.SETTINGS.DEBUG, {
                name: "ACD Talking Actors | Debug",
                hint: "Enable debug logging for the module",
                scope: "client",
                config: false,
                default: false,
                type: Boolean,
                onChange: reinitializeConnector,
            });

            game.settings.register(TalkingActorsConstants.MODULE, TalkingActorsConstants.SETTINGS.ACTIVE_CONNECTOR, {
                name: "Active TTS Connector",
                hint: "Select the active Text-to-Speech connector",
                scope: "client",
                config: true,
                default: false,
                type: String,
                choices: this.module.connectorChoices,
                requiresReload: true,
            });

            game.settings.register(TalkingActorsConstants.MODULE, TalkingActorsConstants.SETTINGS.ALLOW_USERS, {
                name: "acd.ta.settings.AllowUsers",
                hint: "acd.ta.settings.AllowUsersHint",
                config: true,
                scope: "world",
                type: Boolean,
                default: true,
                onChange: reinitializeConnector,
            });

            game.settings.register(TalkingActorsConstants.MODULE, TalkingActorsConstants.SETTINGS.NARRATORACTOR, {
                name: "acd.ta.settings.NarratorActor",
                hint: "acd.ta.settings.NarratorActorHint",
                scope: "world",
                config: true,
                type: String,
                onChange: reinitializeConnector,
                default: "",
            });

            game.settings.register(TalkingActorsConstants.MODULE, TalkingActorsConstants.SETTINGS.FALLBACK_VOICE, {
                name: "acd.ta.settings.FallbackVoice",
                hint: "acd.ta.settings.FallbackVoiceHint",
                scope: "world",
                config: true,
                type: String,
                default: "",
                choices: {},
            });

            game.settings.register(TalkingActorsConstants.MODULE, TalkingActorsConstants.SETTINGS.ENABLE_SELECTION_CONTEXT_MENU, {
                name: "acd.ta.settings.EnableSelectionContextMenu",
                hint: "acd.ta.settings.EnableSelectionContextMenuHint",
                config: true,
                scope: "world",
                type: Boolean,
                default: false,
            });

            game.settings.register(TalkingActorsConstants.MODULE, TalkingActorsConstants.SETTINGS.POST_TO_CHAT, {
                name: "acd.ta.settings.PostTextToChat",
                hint: "acd.ta.settings.PostTextToChatHint",
                config: true,
                scope: "world",
                type: Boolean,
                default: true,
            });

            game.settings.register(TalkingActorsConstants.MODULE, TalkingActorsConstants.SETTINGS.AUTO_IN_CHARACTER_TALK, {
                name: "acd.ta.settings.AutoInCharacterTalk",
                hint: "acd.ta.settings.AutoInCharacterTalkHint",
                config: true,
                scope: "world",
                type: Boolean,
                default: true,
            });
        } catch (error) {
            this.module.logger.error("Settings registration skipped or failed:", error);
        }
    }

    async refreshFallbackVoiceChoices() {
        const voices = this.module.ttsConnector?.getAvailableVoices?.() ?? [];
        const choices = Object.fromEntries(voices
            .filter(voice => voice?.id ?? voice?.voice_id)
            .map(voice => [voice.id ?? voice.voice_id, voice.name ?? voice.id ?? voice.voice_id]));
        const settingKey = TalkingActorsConstants.SETTINGS.FALLBACK_VOICE;
        const setting = game.settings.settings.get(`${TalkingActorsConstants.MODULE}.${settingKey}`);
        const firstVoiceId = Object.keys(choices)[0];

        if (!setting) return;

        setting.choices = choices;
        setting.default = firstVoiceId ?? "";

        const selectedVoiceId = game.settings.get(TalkingActorsConstants.MODULE, settingKey);
        if (firstVoiceId && !choices[selectedVoiceId] && game.user?.isGM) {
            try {
                await game.settings.set(TalkingActorsConstants.MODULE, settingKey, firstVoiceId);
            } catch (error) {
                this.module.logger.warn("Could not set the default fallback voice:", error);
            }
        }
    }
}
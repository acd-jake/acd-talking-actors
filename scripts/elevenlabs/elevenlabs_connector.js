import TTSConnectorInterface from "../tts-connector-interface.js";
import { ELEVENLABS_CONSTANTS, ELEVENLABS_FLAGS } from "./constants.js";
import { VoiceSettingsApp } from "./apps/voice_settings_app.js";
import { GetVoicesRequest, GetVoiceSettingsRequest } from "./api/voice-requests.js";
import { GetUserSubscriptionInfoRequest } from "./api/user-requests.js";
import { TextToSpeechRequest } from "./api/text-to-speech-requests.js";
import { GetAudioFromHistoryItemRequest } from "./api/history-requests.js";
import Logger from "../libs/logger.js";
import { Mp3Utils } from "./libs/mp3-utils.js";
import { ListModelsRequest } from "./api/listmodels-request.js";
import { GenerateSoundEffectsApp } from "./apps/generate_sound_effects_app.js";

export default class ElevenlabsConnector extends TTSConnectorInterface {

    availableVoices = [];
    subscriptionInfo = {};
    playedSounds = [];
    contextMenu;
    logger = null;
    _speaking = false;

    models = [];

    constructor() {
        super();
        this.logger = new Logger(this);
    }
    get id() {
        return ELEVENLABS_CONSTANTS.ID;
    }

    get label() {
        return "Elevenlabs Connector";
    }

    getSettingsSchema() {
        return [
            { key: ELEVENLABS_CONSTANTS.APIKEY, name: "acd.ta.settings.ApiKey", hint: "acd.ta.settings.ApiKeyHint", scope: "client", config: true, type: String, default: "" },
            { key: ELEVENLABS_CONSTANTS.MASTERAPIKEY, name: "acd.ta.settings.MasterApiKey", hint: "acd.ta.settings.MasterApiKeyHint", scope: "world", config: true, type: String, default: "" },
            { key: ELEVENLABS_CONSTANTS.DEFAULT_LANGUAGE, name: "acd.ta.settings.DefaultLanguage", hint: "acd.ta.settings.DefaultLanguageHint", scope: "world", config: true, type: String, default: "" },
            { key: ELEVENLABS_CONSTANTS.SOUNDEFFECTFOLDER, name: "acd.ta.settings.SoundEffectFolder", hint: "acd.ta.settings.SoundEffectFolderHint", scope: "world", config: true, type: String, filePicker: 'folder' },
            { key: ELEVENLABS_CONSTANTS.SOUNDEFFECTPLAYLIST, name: "acd.ta.settings.SoundEffectPlaylist", hint: "acd.ta.settings.SoundEffectPlaylistHint", scope: "world", config: true, type: String, default: "" }
        ];
    }

    registerAdditionalSettings() {
        // Register any additional settings specific to this connector that are dependent on the module being initialized

        let modelChoices = {};
        this.models.forEach(m => {
            modelChoices[m.model_id] = m.name;
        });

        if (!game.settings.settings.has(`${this.id}.${ELEVENLABS_CONSTANTS.DEFAULT_MODEL}`)) {
            game.settings.register(this.id, ELEVENLABS_CONSTANTS.DEFAULT_MODEL, {
                name: "acd.ta.settings.DefaultModel",
                hint: "acd.ta.settings.DefaultModelHint",
                scope: "client",
                config: true,
                default: "",
                type: String,
                choices: modelChoices,
            });
        }
    }

    /**
     * Initialize connector (read settings, prepare SDKs, etc).
     * @param {object} [settings] - optionally pass current settings object
     * @returns {Promise<void>|void}
     */
    async init(settings = {}) {
        // Custom initialization logic for ElevenlabsConnector
        this.logger.debug("Initializing with settings:", settings);
        // You can add more setup here as needed

        Mp3Utils.init();

        await this.initializeAvailableVoices();
        await this.initializeUserdata();

        await this.initializeModels();

        this.registerAdditionalSettings();
        this.logger.debug("Initialization complete.");

        Hooks.on("changeSidebarTab", (app) => {
            if (!(app instanceof PlaylistDirectory)) {
                return;
            }

            if ($('#ta-create-soundeffect').length == 0) {
                this.injectCreateSoundEffectButton(app);
            }
        });
    }

    async injectCreateSoundEffectButton(app) {
        $('#playlists').find('footer.directory-footer').append(
            `<a class="ta-create-soundeffect" id="ta-create-soundeffect" data-tooltip="${game.i18n.localize("acd.ta.SoundEffects.createbuttonHint")}">` +
            game.i18n.localize('acd.ta.SoundEffects.createbutton') +
            '</a>'
        );

        $('#ta-create-soundeffect').click(async (event) => {
            event.preventDefault();
            event.stopPropagation();

            new GenerateSoundEffectsApp(this.logger).render(true);
        });
    }
    async initializeModels() {
        if (!this.hasApiKey("API key not set. Cannot fetch available models.")) {
            return;
        }
        this.models = [];
        this.logger.debug("Fetching available models...");
        try {
            const remoteModels = await new ListModelsRequest().fetch();
            this.models = remoteModels;
            this.logger.debug("Available models:", this.models);
        } catch (err) {
            this.logger.error("Error fetching available models:", err);
        }
    }

    async initializeAvailableVoices() {
        if (!this.hasApiKey("API key not set. Cannot fetch available voices.")) {
            return;
        }

        this.availableVoices = [];

        this.logger.debug("Fetching available voices...");
        try {
            const remoteVoices = await new GetVoicesRequest().fetch();
            this.availableVoices = remoteVoices;

            this.logger.debug("Available voices:", this.availableVoices);
        } catch (err) {
            this.logger.error("Error fetching available voices:", err);
        }
    }

    async initializeUserdata() {
        if (!this.hasApiKey("API key not set. Cannot fetch user data.")) {
            return;
        }

        this.logger.debug("Fetching user subscription info...");
        try {
            this.subscriptionInfo = await new GetUserSubscriptionInfoRequest()
                .fetch();
        } catch (err) {
            this.logger.error("Error fetching user subscription info:", err);
        }
        this.logger.debug("User subscription info:", this.subscriptionInfo);
    }

    hasApiKey(warn) {
        const hasKey = (game.settings.get(this.id, ELEVENLABS_CONSTANTS.APIKEY)?.length > 1)
            || (game.settings.get(this.id, ELEVENLABS_CONSTANTS.MASTERAPIKEY)?.length > 1);
        if (!hasKey && warn) {
            this.logger.warn(warn);
        }
        return hasKey;
    }

    async openVoiceSettingsApp(actors) {
        const app = new VoiceSettingsApp(actors, this.availableVoices, this.models);
        app.render(true);
    }

    getAvailableVoices() {
        return this.availableVoices;
    }

    getVoiceId(voiceName) {
        const voices = this.getAvailableVoices();
        const voice = voices.find(v => v.name === voiceName);
        return voice ? voice.id : null;
    }

    getVoiceIdAndSettingsFromActor(actor) {
        const voiceId = this.getStringFlagFromActor(actor, ELEVENLABS_FLAGS.VOICE_ID);
        const settings = this.getObjectFlagFromActor(actor, ELEVENLABS_FLAGS.VOICE_SETTINGS);
        return { voice_id: voiceId, settings: settings };
    }

    getVoiceIdFromActor(actor) {
        const voiceId = this.getStringFlagFromActor(actor, ELEVENLABS_FLAGS.VOICE_ID);
        return voiceId;
    }

    getModelIdFromActor(actor) {
        const modelId = this.getStringFlagFromActor(actor, ELEVENLABS_FLAGS.VOICE_MODEL_ID);
        return modelId;
    }

    getLanguageIdFromActor(actor) {
        const languageId = this.getStringFlagFromActor(actor, ELEVENLABS_FLAGS.LANGUAGE_ID);
        return languageId;
    }

    getVoiceSettingsFromActor(actor) {
        const settings = this.getObjectFlagFromActor(actor, ELEVENLABS_FLAGS.VOICE_SETTINGS);
        return settings;
    }

    async getVoiceSettings(voiceId) {
        return new GetVoiceSettingsRequest(voiceId).fetch();
    }

    async textToSpeech(voiceId, actor, text, settings) {
        if (!this.hasApiKey("API key not set. Cannot perform text-to-speech.")) {
            return null;
        }

        // Convert text to speech using the elevenlabs API
        this.logger.info(`Speaking:`, text,);
        this._speaking = true;

        // check if voiceId is valid
        if (voiceId == null || !this.availableVoices.find(v => v.voice_id === voiceId)) {
            this.logger.error("Invalid voice ID:", voiceId);
            this._speaking = false;
            return null;
        }

        const modelId = this.retrieveModelId(actor);
        const languageId = this.retrieveLanguageId(actor, modelId);

        let container;
        try {
            container = await new TextToSpeechRequest(voiceId, modelId, languageId, text, settings).fetch();

            if (!container || !container.body || typeof container.body.getReader !== "function") {
                throw new Error("Invalid stream container received from TextToSpeechRequest.");
            }
        } catch (error) {
            this.logger.error("Failed to fetch TTS stream:", error);
            this._speaking = false;
            return null;
        }

        if (container.status !== 200) {
            this.logger.error(`TTS request failed with status ${container.status}`);
            this._speaking = false;
            return null;
        }

        let historyItemId = container.headers.get("history-item-id");

        this.logger.debug("TTS history item ID:", historyItemId);

        let chunks = await this.readChunks(container);

        // Emit audio chunks to socket for playback or further processing
        game.socket.emit('module.' + ELEVENLABS_CONSTANTS.ID, {
            container: chunks,
            historyItemId: historyItemId,
            text: text
        })

        this.playSound(chunks);

        return historyItemId;
    }

    retrieveLanguageId(actor, modelId) {
        if (!actor) {
            let defaultLanguage = game.settings.get(this.id, ELEVENLABS_CONSTANTS.DEFAULT_LANGUAGE) || null;
            return defaultLanguage;
        }

        let languageId = this.getStringFlagFromActor(actor, ELEVENLABS_FLAGS.LANGUAGE_ID);

        if (languageId == null || !this.models.find(m => m.languages.find(l => l.language_id === languageId))) {
            this.logger.debug("Invalid language ID:", languageId);
            languageId = game.settings.get(this.id, ELEVENLABS_CONSTANTS.DEFAULT_LANGUAGE) || null;

            if (languageId == null || !this.models.find(m => m.languages.find(l => l.language_id === languageId))) {
                this.logger.debug("No valid default language ID set:", languageId);
                languageId = this.models.find(m => m.model_id === modelId).languages[0].language_id;
                this.logger.info("Falling back to default language ID:", this.languageId);
            }
        }
        return languageId;
    }

    retrieveModelId(actor) {
        if (!actor) {
            let defaultModel = game.settings.get(this.id, ELEVENLABS_CONSTANTS.DEFAULT_MODEL) || null;
            return defaultModel;
        }

        let modelId = this.getStringFlagFromActor(actor, ELEVENLABS_FLAGS.VOICE_MODEL_ID);

        if (modelId == null || !this.models.find(m => m.model_id === modelId)) {
            this.logger.debug("Invalid model ID:", modelId);
            modelId = game.settings.get(this.id, ELEVENLABS_CONSTANTS.DEFAULT_MODEL) || null;

            if (modelId == null || !this.models.find(m => m.model_id === modelId)) {
                this.logger.debug("No valid default model ID set:", modelId);
                modelId = this.models[0].model_id;
                this.logger.info("Falling back to first available model ID:", this.models[0].model_id);
            }
        }
        return modelId;
    }

    async stop() {
        this._speaking = false;
    }

    async generateAudioData(text, options = {}) {
        // Example: return null
        return null;
    }

    async readChunks(container) {
        let reader = container.body.getReader();
        let chunks = [];
        while (true) {
            let { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }
        return chunks;
    }

    async playSound(chunks) {
        let blob = new Blob(chunks, { type: 'audio/mpeg' })
        let url = window.URL.createObjectURL(blob)
        let sound = this.playAudio(url);
        let resolvedSound = Promise.resolve(sound);
        resolvedSound.then((soundInfo) => {
            console.log(soundInfo);
            this._speaking = false;
            this.logger.info("Finished playing sound.");
        })
    }

    async playAudio(url) {
        if (game.data.release.generation < 12) {
            return AudioHelper.play({ src: url, volume: 1.0, loop: false }, false);
        } else {
            return foundry.audio.AudioHelper.play({ src: url, volume: 1.0, loop: false }, false);
        }
    }

    async playSample(voiceId) {
        let voice = this.availableVoices.find(t => t.voice_id === voiceId);

        if (voice) {
            this.playAudio(voice.preview_url);
        }
    }

    async replaySpeech(itemId) {
        let container = await new GetAudioFromHistoryItemRequest(itemId).fetch();

        let chunks = await this.readChunks(container);
        game.socket.emit('module.' + this.id, { testarg: "Hello World", container: chunks })
        this.playSound(chunks);

    }
}
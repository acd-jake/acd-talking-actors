/**
 * TTS Connector Interface
 * An abstract base class describing the surface a connector must implement
 * to register settings with Foundry VTT and to handle calls to a TTS provider.
 *
 * Implementers should extend this class and override the abstract methods.
 *
 * Usage:
 *   import TTSConnectorInterface from "./interfaces.js";
 *   class MyConnector extends TTSConnectorInterface { ... }
 */

import { localize } from "./libs/functions.js";
import Logger from "./libs/logger.js";

/* eslint-disable no-unused-vars */
export default class TTSConnectorInterface {
    logger = null;
    mainModule = null;
    muted = false;

    /**
     * Create a connector instance.
     * @param {object} [options] - connector-specific options
     */
    constructor(mainModule, logger, options = {}) {
        if (!mainModule) {
            throw new Error("TTSConnectorInterface requires a reference to the main module.");
        }
        if (!logger) {
            throw new Error("TTSConnectorInterface requires a logger instance.");
        }

        this.mainModule = mainModule;
        this.logger = logger;
        this.options = options;
        this._selectedVoice = null;
        this._volume = 1.0;
        this._speaking = false;
        this.logger = new Logger(this);
    }

    get isMuted() {
        return this.muted;
    }
    
    set isMuted(value) {
        this.muted = value;
    }

    /* -------------------------
     * Identification
     * ------------------------- */

    /**
     * Unique identifier for this connector (e.g. "acme-tts").
     * Must be overridden.
     * @returns {string}
     */
    get id() {
        throw new Error("TTSConnectorInterface.id must be implemented by subclass");
    }

    /**
     * Human-readable label for UI.
     * Must be overridden.
     * @returns {string}
     */
    get label() {
        throw new Error("TTSConnectorInterface.label must be implemented by subclass");
    }

    /* -------------------------
     * Settings registration
     * ------------------------- */

    /**
     * Return a settings schema array describing settings to register.
     * Each entry should be compatible with game.settings.register signature.
     * Example entry:
     *   { key: "apiKey", name: "API Key", hint: "Key for the service", scope: "world", config: true, type: String, default: "" }
     *
     * @returns {Array<object>}
     */
    getSettingsSchema() {
        return [];
    }

    get mainSettingsId() {
        return this.mainModule.id;
    }
    /**
     * Register settings with Foundry VTT.
     * Default implementation uses getSettingsSchema() and calls game.settings.register.
     * Subclasses may override for custom registration behavior.
     */
    registerSettings() {
        if (typeof game === "undefined" || !game.settings) return;

        const ns = `${this.mainSettingsId}`;
        const schema = this.tryGetSettingSchema();

        for (const def of schema) {
            const key = def.key || def.name;
            const regOpts = this.prepareRegistrationOptions(def);
            // Avoid accidental double-registration
            try {
                if (!game.settings.settings.has(`${ns}.${key}`)) {
                    game.settings.register(ns, key, regOpts);
                }
            } catch (err) {
                // ignore or log
                // Use id for clarity in instance context
                this.logger.warn(`${this.id} | Could not register setting ${key}`, err);
            }
        }
    }

    tryGetSettingSchema() {
        return (typeof this.getSettingsSchema === "function")
            ? this.getSettingsSchema()
            : [];
    }

    prepareRegistrationOptions(def) {
        const regOpts = Object.assign({}, def);
        delete regOpts.key;
        regOpts.name = localize(regOpts.name);
        regOpts.hint = localize(regOpts.hint);
        return regOpts;
    }

    getStringFlagFromActor(actor, flagName) {
        const value = actor.getFlag(this.mainSettingsId, flagName) || null;
        return value;
    }

    getObjectFlagFromActor(actor, flagName) {
        const value = actor.getFlag(this.mainSettingsId, flagName) || {};
        return value;
    }

    /* -------------------------
     * Lifecycle
     * ------------------------- */

    /**
     * Initialize connector (read settings, prepare SDKs, etc).
     * Called after settings are available. Override as needed.
     * @param {object} [settings] - optionally pass current settings object
     * @returns {Promise<void>|void}
     */
    async init(settings = {}) {
        // default: no-op
    }

    /**
     * Clean up any resources (abort requests, revoke URLs, etc).
     * @returns {Promise<void>|void}
     */
    async dispose() {
        // default: no-op
    }

    /* -------------------------
     * Voice & capabilities
     * ------------------------- */

    /**
     * Return available voices from the provider.
     * @returns {Promise<Array<{ id: string, name?: string, lang?: string, gender?: string }>>}
     */
    async getAvailableVoices() {
        throw new Error("getAvailableVoices must be implemented by subclass");
    }

    /**
     * Retrieve the provider-specific voice identifier for a given voice name.
     *
     * This method is intended to be overridden by subclasses. Implementations
     * should perform any asynchronous lookup or mapping necessary and return the
     * underlying voice ID string used by the TTS provider.
     *
     *  @returns {Promise<string>} A promise that resolves to the provider-specific voice identifier.
     */
    async getVoiceId(voiceName) {
        throw new Error("getVoiceId must be implemented by subclass");
    }

    getVoiceIdAndSettingsFromActor(actor) {
        // default: no-op
        return { voice_id: null, settings: {} };
    }

    getVoiceIdFromActor(actor) {
        // default: no-op
        return null;
    }

    getVoiceSettingsFromActor(actor) {
        // default: no-op
        return {};
    }

    async getVoiceSettings(voiceId) {
        throw new Error("getVoiceSettings must be implemented by subclass");
    }

    async playSound(chunks) {
        throw new Error("playSound must be implemented by subclass");
    }

    /**
     * Optionally open a UI for configuring voice settings for a specific token.
     * Subclasses may override to provide a custom settings interface.
     * @param {*} _token - The token for which to open voice settings (unused in base class)
     * @returns {Promise<void>|void}
     */
    async openVoiceSettingsApp(_token) {
        // default: no-op
    }

     /**
     * Does the connector currently have an active playback?
     * @returns {boolean}
     */
    isSpeaking() {
        return !!this._speaking;
    }


    /* -------------------------
     * Core TTS operations
     * ------------------------- */

    /**
     * Generate audio from text and play it (or return a handle, depending on implementation).
     * Implementations should set this._speaking true/false accordingly.
     *
     */
    async textToSpeech(voiceId, actor, text, settings) {
        throw new Error("textToSpeech must be implemented by subclass");
    }

    /**
     * Stop current speech playback if any.
     * @returns {Promise<void>|void}
     */
    async stop() {
        throw new Error("stop must be implemented by subclass");
    }

    /**
     * Generate audio data for the given text without playing it.
     * Useful for caching or preview.
     * @param {string} text
     * @param {object} [settings]
     * @returns {Promise<ArrayBuffer|Blob|AudioBuffer|URL>}
     */
    async generateSoundEffect(text, settings = {}) {
        throw new Error("generateSoundEffect must be implemented by subclass");
    }


    async playSample(voiceId) {
        throw new Error("playSample must be implemented by subclass");
    }

    async replaySpeech(itemId) {
        throw new Error("replaySpeech must be implemented by subclass");
    }

    /* -------------------------
     * Optional hooks
     * ------------------------- */

    /**
     * Called when a relevant setting changes. Subclasses may override.
     * @param {string} settingKey
     * @param {*} newValue
     * @param {*} oldValue
     */
    onSettingChanged(settingKey, newValue, oldValue) {
        // default: no-op
    }
}
    
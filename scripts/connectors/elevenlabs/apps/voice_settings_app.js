// /c:/Users/mheil/AppData/Local/FoundryVTT/Data/modules/acd-talking-actors/scripts/elevenlabs/apps/voice_settings_app.js
//
// A lightweight Foundry Application to edit voice / TTS settings for an Actor or a Token.
// Stores settings as a flag on the Actor or the Token document under the module key:
//   module: "acd-talking-actors", flag: "voiceSettings"
//
// Usage:
//   // for an Actor document
//   new VoiceSettingsApp({ actor: actor }).render(true);
//   // for a Token or TokenDocument
//   new VoiceSettingsApp({ token: token }).render(true);

import { ELEVENLABS_CONSTANTS, ELEVENLABS_FLAGS } from "../constants.js";

export class VoiceSettingsApp extends Application {

    static flag = "elevenlabs-voiceSettings";
    static moduleKey = "acd-talking-actors";

    constructor(connector, actors, options = {}) {
        super(options);

        this.opts = options;
        this.connector = connector;
        this.actors = actors;
        this.voices = connector.getAvailableVoices();
        this.voiceId = this.getCurrentVoiceId();
        this.voiceSettings = this.getCurrentVoiceSettings();
        this.models = connector.getAvailableModels();
        this.modelId = this.getCurrentVoiceModelId() || "";
        this.currentModel = this.getCurrentVoiceModel();
        this.languageId = this.getCurrentLanguageId() || "";
    }

    getCurrentVoiceId() {
        if (this.actors.length == 0)
            return undefined;

        // Safely read nested flags using optional chaining and computed property access
        let voice_id = this.actors[0].flags?.[VoiceSettingsApp.moduleKey]?.[ELEVENLABS_FLAGS.VOICE_ID];

        return voice_id;
    }

    getCurrentVoiceModelId() {
        if (this.actors.length == 0)
            return undefined;

        // Safely read nested flags using optional chaining and computed property access
        let voice_model_id = this.actors[0].flags?.[VoiceSettingsApp.moduleKey]?.[ELEVENLABS_FLAGS.VOICE_MODEL_ID] || this.connector.getDefaultModelId();
        
        return voice_model_id;
    }

    getCurrentVoiceModel() {
        if (this.actors.length == 0)
            return undefined;

        let voice_model_id = this.getCurrentVoiceModelId();

        let currentModel = this.models.find(m => m.model_id === voice_model_id);
        return currentModel;
    }

    getCurrentLanguageId() {
        if (this.actors.length == 0)
            return undefined;

        let currentModel = this.getCurrentVoiceModel();

        if (!currentModel) return "";

        // Safely read nested flags using optional chaining and computed property access
        let language_id = this.actors[0].flags?.[VoiceSettingsApp.moduleKey]?.[ELEVENLABS_FLAGS.LANGUAGE_ID] || this.connector.getDefaultLanguageId();
        
        let foundLanguage = currentModel.languages.find(l => l.language_id === language_id);
        
        if (foundLanguage && foundLanguage.language_id) {
            return foundLanguage.language_id;
        }
        
        return currentModel.languages[0]?.language_id || "";
    }

    getCurrentVoiceSettings() {
        if (this.actors.length == 0)
            return {};

        let settings = this.actors[0].flags?.[VoiceSettingsApp.moduleKey]?.[ELEVENLABS_FLAGS.VOICE_SETTINGS];
        if (settings == undefined) {
            settings = {};
            if (this.voiceId != undefined) {
                this.updateVoiceSettings();
            }
        }
        return settings;
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "changeVoiceSettings",
            title: game.i18n.localize("acd.ta.VoiceSettings.Title"),
            template: ELEVENLABS_CONSTANTS.TEMPLATEDIR + "voice_settings.hbs",
            width: 800,
            popOut: true
        });
    }

    getData(options) {
        let dispOptions = this.requestoptions = this.baseoptions;
        let currentSettings = this.getCurrentVoiceSettings();
        
        return {
            actors: this.actors,
            voices: this.voices,
            models: this.models,
            voiceId: this.getCurrentVoiceId(),
            modelId: this.getCurrentVoiceModelId() || "",
            currentModel: this.getCurrentVoiceModel() || {},
            languageId: this.getCurrentLanguageId() || "",
            voiceSettings: currentSettings,
            currentStability: currentSettings.stability ? Math.round(currentSettings.stability*100) : 0,
            currentSimilarityBoost: currentSettings.similarity_boost ? Math.round(currentSettings.similarity_boost*100) : 0,
            currentStyle: currentSettings.style ? Math.round(currentSettings.style*100) : 0,

        };
    }

    activateListeners(html) {
        super.activateListeners(html);
        var that = this;

        $('.items-header .item-controls', html).click($.proxy(this.changeActors, this));

        $('.item-list .item', html).each(function (elem) {
            $('.item-delete', this).click($.proxy(that.removeActor, that, this.dataset.itemId));
        });

        $('.dialog-button.accept-data', html).click(this.acceptData.bind(this));

        $('.dialog-button.close', html).click(this.close.bind(this));

        $('#voice-id', html).change($.proxy(async function (e) {
            that.voiceId = $(e.currentTarget).val();
            await that.updateVoiceSettings();
        }, this));

        $('#model-id', html).change($.proxy(async function (e) {
            that.modelId = $(e.currentTarget).val();
            that.currentModel = that.models.find(m => m.model_id === that.modelId);
        }, this));

        $('#language-id', html).change($.proxy(async function (e) {
            that.languageId = $(e.currentTarget).val();
        }, this));

        $('#similarity_boost', html).change($.proxy(async function (e) {
            that.voiceSettings.similarity_boost = $(e.currentTarget).val();
            that.setTextValue($('.ta-voice-settings #similarity_boost_label'), this.voiceSettings.similarity_boost);
        }, this));

        $('#stability', html).change($.proxy(async function (e) {
            that.voiceSettings.stability = $(e.currentTarget).val();
            that.setTextValue($('.ta-voice-settings #stability_label'), this.voiceSettings.stability);
        }, this));

        $('#style', html).change($.proxy(async function (e) {
            that.voiceSettings.style = $(e.currentTarget).val();
            that.setTextValue($('.ta-voice-settings #style_label'), this.voiceSettings.style);
        }, this));

        $('#play-sample', html).click($.proxy(this.playSample, this));

    }

    setTextValue(element, value) {
        element.text(Math.round(value * 100) + " %");
    }

    async updateVoiceSettings() {

        let settings = this.actors[0].flags?.[VoiceSettingsApp.moduleKey]?.[ELEVENLABS_FLAGS.VOICE_SETTINGS];

        if (settings != undefined && this.voiceId == this.getCurrentVoiceId) {
            this.voiceSettings = settings;
        }
        else if (this.voiceId != undefined) {
            this.voiceSettings = await game.acdTalkingActors.ttsConnector.getVoiceSettings(this.voiceId);
        }

        $('.ta-voice-settings #similarity_boost').val(this.voiceSettings.similarity_boost);
        this.setTextValue($('.ta-voice-settings #similarity_boost_label'), this.voiceSettings.similarity_boost);
        $('.ta-voice-settings #stability').val(this.voiceSettings.stability);
        this.setTextValue($('.ta-voice-settings #stability_label'), this.voiceSettings.stability);
        $('.ta-voice-settings #style').val(this.voiceSettings.style);
        this.setTextValue($('.ta-voice-settings #style_label'), this.voiceSettings.style);
    }

    async acceptData() {
        for (let actor of this.actors) {
            await actor.setFlag(VoiceSettingsApp.moduleKey, ELEVENLABS_FLAGS.VOICE_ID, this.voiceId);
            await actor.setFlag(VoiceSettingsApp.moduleKey, ELEVENLABS_FLAGS.VOICE_MODEL_ID, this.modelId);
            await actor.setFlag(VoiceSettingsApp.moduleKey, ELEVENLABS_FLAGS.LANGUAGE_ID, this.languageId);
            await actor.setFlag(VoiceSettingsApp.moduleKey, ELEVENLABS_FLAGS.VOICE_SETTINGS, this.voiceSettings);
        }
        this.close();
    }

    async playSample() {
        this.connector.playSample($('#voice-id').find(":selected").val());
    }

    changeActors(e) {
        let type = e.target.dataset.type;
        switch (type) {
            case 'actor':
                let linkedActors = canvas.tokens.controlled.filter(token => token.actor.prototypeToken.actorLink).map(x => x.actor);
                if (linkedActors.length == 0)
                    ui.notifications.error(localize("acd.ta.errors.noLinkedActor"));
                else
                    this.addActors(linkedActors);
                break;
            case 'clear':
                this.actors = [];
                this.render(true);
                break;
        }
    }

    removeActor(id) {
        let idx = this.actors.findIndex(t => t.id === id);
        if (idx > -1) {
            this.actors.splice(idx, 1);
        }
        $(`li[data-item-id="${id}"]`, this.element).remove();
        this.render(true); // Need this in case the token has tools
        window.setTimeout(() => { this.setPosition({ height: 'auto' }); }, 100);
    }

    addActors(actors) {
        if (!$.isArray(actors))
            actors = [actors];

        let failed = [];
        actors = actors.filter(t => {
            //don't add this actor a second time
            if (this.actors.find(e => e._id == t._id)) {
                failed.push(t.name);
                return false;
            }
            return true;
        });

        if (failed.length > 0)
            ui.notifications.warn(localize("acd.ta.errors.tokensAlreadyAdded"));

        if (actors.length > 0)
            this.actors = this.actors.concat(actors);

        this.render(true);
        window.setTimeout(() => { this.setPosition({ height: 'auto' }); }, 100);
    }
}

// Expose to global so other modules/scripts can open it easily
window.VoiceSettingsApp = VoiceSettingsApp;



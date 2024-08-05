import { MODULE, FLAGS } from '../constants.js';
import { localize } from '../init.js';

export class VoiceSettingsApp extends Application {

    constructor(actors, options = {}) {
        super(options);

        this.opts = options;
        this.actors = actors;
        this.voices = game.talkingactors.connector.allVoices;
        this.voiceId = this.getCurrentVoiceId();
        this.voiceSettings = this.getCurrentVoiceSettings();
    }

    getCurrentVoiceId() {
        if (this.actors.length == 0)
            return undefined;

        let voice_id = this.actors[0].flags[MODULE.ID] ? this.actors[0].flags[MODULE.ID][FLAGS.VOICE_ID] : undefined;

        return voice_id;
    }

    getCurrentVoiceSettings() {
        if (this.actors.length == 0)
            return {};

        let settings = this.actors[0].flags[MODULE.ID] ? this.actors[0].flags[MODULE.ID][FLAGS.VOICE_SETTINGS] : {};
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
            title: localize("acd.ta.VoiceSettings.Title"),
            template: MODULE.TEMPLATEDIR + "ta-voice-settings.hbs",
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
            voiceId: this.getCurrentVoiceId(),
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

        let settings = this.actors[0].flags[MODULE.ID] ? this.actors[0].flags[MODULE.ID][FLAGS.VOICE_SETTINGS] : {};

        if (settings != undefined && this.voiceId == this.getCurrentVoiceId) {
            this.voiceSettings = settings;
        }
        else if (this.voiceId != undefined) {
            this.voiceSettings = await game.talkingactors.connector.getVoiceSettings(this.voiceId);
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
            await actor.setFlag(MODULE.ID, FLAGS.VOICE_ID, this.voiceId);
            await actor.setFlag(MODULE.ID, FLAGS.VOICE_SETTINGS, this.voiceSettings);
        }
        this.close();
    }

    async playSample() {
        game.talkingactors.connector.playSample($('#voice-id').find(":selected").val());
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

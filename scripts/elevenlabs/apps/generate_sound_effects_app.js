import { ELEVENLABS_CONSTANTS, ELEVENLABS_FLAGS } from "../constants.js";
import { isModuleActive } from "../../libs/functions.js";
import { Mp3Utils } from "../libs/mp3-utils.js";
import { SoundGenerationRequest } from "../api/sound-generation-request.js";

export class GenerateSoundEffectsApp extends Application {
    text;
    durationSeconds;
    promptInfluence;

    constructor(options = {}) {
        super(options);

        this.durationSeconds = 0;
        this.promptInfluence = 0.3;
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "generateSoundEffects",
            title: game.i18n.localize("acd.ta.SoundEffects.dialog.title"),
            template: ELEVENLABS_CONSTANTS.TEMPLATEDIR + "create_soundeffects_dialog.hbs",
            width: 1000,
            popOut: true,
            resizable: true,
            minimizable: true
        });
    }

    getData(options) {
        let dispOptions = this.requestoptions = this.baseoptions;

        return {
            text: this.text,
            durationSeconds: this.durationSeconds,
            currentSeconds: game.i18n.localize('acd.ta.SoundEffects.automatic'),
            promptInfluence: this.promptInfluence,
            currentPromptInfluence: this.promptInfluence,
            filename: this.filename
        };
    }

    activateListeners(html) {
        super.activateListeners(html);
        var that = this;

        $('[name=ta_sf_effectdescription]').change($.proxy(async function (e) {
            that.text = $(e.currentTarget).val();
        }, this));

        $('#ta_sf_duration_seconds', html).change($.proxy(async function (e) {
            that.durationSeconds = $(e.currentTarget).val();
            if (that.durationSeconds == 0) {
                that.setTextValue($('#ta_sf_duration_seconds_label'), game.i18n.localize('acd.ta.SoundEffects.automatic'));
            } else {
                that.setTextValue($('#ta_sf_duration_seconds_label'), that.durationSeconds + "  " + game.i18n.localize('acd.ta.SoundEffects.secondsUnit'));
            }
        }, this));

        $('#ta_sf_promptInfluence', html).change($.proxy(async function (e) {
            that.promptInfluence = $(e.currentTarget).val();
            that.setTextValue($('#ta_sf_promptInfluence_label'), that.promptInfluence);
        }, this));

        $('#ta_sf_filename').change($.proxy(async function (e) {
            that.filename = $(e.currentTarget).val();
        }, this));

        $('.dialog-button.generate', html).click(this.generateEffect.bind(this));
        $('.dialog-button.generate-and-place', html).click(this.generateEffectAndPlace.bind(this));

        $('.dialog-button.close', html).click(this.close.bind(this));

        // $('#ta_sf_generate', html).click(this.generateEffect.bind(this));
    }

    async acceptData() {

        this.close();
    }

    setTextValue(element, value) {
        element.text(value + "");
    }

    convertToValidFilename(string) {
        return string.replace(/[\/|\\:*?"<>]/g, " ").replace(/[ ]/g, "_");
    }

    async generateEffectInternal() {
        const savePath = game.settings.get(ELEVENLABS_CONSTANTS.ID, ELEVENLABS_CONSTANTS.SOUNDEFFECTFOLDER);

        const randomSuffix = Math.random().toString(36).slice(2);
        const filenameWithExtension = this.convertToValidFilename(this.filename) + "_" + randomSuffix + ".mp3";
        const effectFilenameWithPath = `${savePath}/${filenameWithExtension}`;

        let response;
        try {
            response = await this.generateSoundEffect(this.text, { durationSeconds: this.durationSeconds, promptInfluence: this.promptInfluence });
        } catch (error) {
            ui.notifications.error("Failed to generate sound effect: " + error.message);
            console.error("Sound effect generation error:", error);
            return;
        }

        if (!response || typeof response.blob !== "function") {
            ui.notifications.error("Invalid response received from sound effect API.");
            console.error("Invalid response:", response);
            return;
        }

        // Read the response as a blob and convert to ArrayBuffer for manipulation
        let buffer = await (await response.blob()).arrayBuffer();

        let mp3Buffer = await Mp3Utils.initTags(buffer, `Effect: ${this.filename}`);

        Mp3Utils.saveFile(new Uint8Array(mp3Buffer), effectFilenameWithPath);

        const playListName = game.settings.get(ELEVENLABS_CONSTANTS.ID, ELEVENLABS_CONSTANTS.SOUNDEFFECTPLAYLIST);

        if (!game.playlists.find(t=> t.name ===playListName)) {
            await Playlist.create({ name: playListName, channel: "environment", mode: -1 });
        }

        let playlist = game.playlists.find(t=> t.name ===playListName);

        let playlistSound = new PlaylistSound({ name: this.filename, description: this.text, path: effectFilenameWithPath, channel: "environment" });

        await playlist.createEmbeddedDocuments("PlaylistSound", [playlistSound]);

        ui.notifications.info(`Sound ${playlistSound.name} added to playlist ${playlist.name}`);

        console.log(`Sound ${playlistSound.name} added to playlist ${playlist.name}`);

        return playlistSound;
    }

        async generateSoundEffect(text, settings = {}) {
        let response = await new SoundGenerationRequest(text, settings).fetch();

        if (!response.ok) {
            console.error(`Error: ${response.statusText}`);
            return;
        }

        return response;
    }

    async generateEffect() {
        this.showOverlay();

        await this.generateEffectInternal();

        this.hideOverlay();
    }

    async generateEffectAndPlace() {

        const moduleName = ELEVENLABS_CONSTANTS.DEPENDENCY_PORTALLIB;
        if (!isModuleActive(moduleName)) {
            ui.notifications.error(`Modul: ${moduleName} is not active. Placement of ambient sound effect is not available.`);
            return;
        }

        this.showOverlay();

        let sound = await this.generateEffectInternal();

        const radius = parseInt($('input[name="ta_sf_radius"]').val(), 10);
        const volume = parseFloat($('input[name="ta_sf_volume"]').val());
        const flags = $('input[name="ta_sf_flags"]').val();
        const repeat = $('input[name="ta_sf_repeat"]').is(':checked');
        const walls = $('input[name="ta_sf_walls"]').is(':checked');
        const easing = $('input[name="ta_sf_easing"]').is(':checked');
        const hidden = $('input[name="ta_sf_hidden"]').is(':checked');

        let options = { path: sound.path, radius: radius, volume: volume, flags: flags, repeat: repeat, walls: walls, easing: easing, hidden: hidden };

        let portal = new Portal()
            .range(options.radius);

        const location = await portal.pick();

        options.x = location.x;
        options.y = location.y;

        canvas.scene.createEmbeddedDocuments("AmbientSound", [options]);

        this.hideOverlay();
    }

    hideOverlay() {
        $('.ta-se-overlay').hide();
    }

    showOverlay() {
        $('.ta-se-overlay').show();
    }
}

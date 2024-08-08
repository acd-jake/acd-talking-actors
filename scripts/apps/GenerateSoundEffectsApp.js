import { MODULE } from '../constants.js';
import { localize, isModuleActive } from '../functions.js';
import { Mp3Utils } from '../Mp3Utils.js';


export class GenerateSoundEffectsApp extends Application {
    text;
    playlistApp;
    durationSeconds;
    promptInfluence;

    constructor(playlistApp, options = {}) {
        super(options);

        this.playlistApp = playlistApp;
        this.durationSeconds = 0;
        this.promptInfluence = 0.3;
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "generateSoundEffects",
            title: localize("acd.ta.SoundEffects.dialog.title"),
            template: MODULE.TEMPLATEDIR + "ta-create-soundeffects-dialog.hbs",
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
            currentSeconds: localize ('acd.ta.SoundEffects.automatic'),
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
                that.setTextValue($('#ta_sf_duration_seconds_label'), localize ('acd.ta.SoundEffects.automatic'));
            } else {
                that.setTextValue($('#ta_sf_duration_seconds_label'), that.durationSeconds + "  " + localize ('acd.ta.SoundEffects.secondsUnit'));
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
        let response = await game.talkingactors.connector.generateSoundEffect(this.text, { durationSeconds: this.durationSeconds, promptInfluence: this.promptInfluence }, this.filename);

        const savePath = game.settings.get(MODULE.ID, MODULE.SOUNDEFFECTFOLDER);

        const filenameWithExtension = this.convertToValidFilename(this.filename) + ".mp3";
        const effectFilenameWithPath = `${savePath}/${filenameWithExtension}`;

        // Read the response as a blob and convert to ArrayBuffer for manipulation
        let buffer = await (await response.blob()).arrayBuffer();

        let mp3Buffer = await Mp3Utils.initTags(buffer, `Effect: ${this.filename}`);

        Mp3Utils.saveFile(new Uint8Array(mp3Buffer), effectFilenameWithPath);

        const playListName = game.settings.get(MODULE.ID, MODULE.SOUNDEFFECTPLAYLIST);

        if (!this.playlistApp.documents.find(doc => doc.name == playListName)) {
            await Playlist.create({ name: playListName, channel: "environment", mode: -1 });
        }

        let playlist = this.playlistApp.documents.find(doc => doc.name == playListName);

        let playlistSound = new PlaylistSound({ name: this.filename, description: this.text, path: effectFilenameWithPath, channel: "environment" });

        await playlist.createEmbeddedDocuments("PlaylistSound", [playlistSound])

        ui.notifications.info(`Sound ${playlistSound.name} added to playlist ${playlist.name}`);

        console.log(`Sound ${playlistSound.name} added to playlist ${playlist.name}`);

        return playlistSound;
    }

    async generateEffect() {
        this.showOverlay();
       
        await this.generateEffectInternal();
       
        this.hideOverlay();
    }

    async generateEffectAndPlace() {

        const moduleName = MODULE.DEPENDENCY_PORTALLIB;
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

        let options = {path: sound.path, radius: radius, volume: volume, flags: flags, repeat: repeat, walls: walls, easing: easing, hidden: hidden};

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


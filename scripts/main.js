/**
 * Entry point class for the acd-talking-actors FoundryVTT module.
 */

import { localize } from "./libs/functions.js";
import TalkingActorsConstants from "./constants.js";
import Logger from "./libs/logger.js";
import { ChatProcessor } from "./chat-processor.js";
import { SpeechStatus } from "./speech-status.js";
import { AudioReceiver } from "./libs/audio-transfer.js";
import { TalkingActorsSettings } from "./module-settings.js";
import { ReadAloudController } from "./read-aloud-controller.js";

class ACDTalkingActors {
    static MODULE_ID = "acd-talking-actors";
    static instance = null;
    static talkCommand = "talk";
    static talkSilentCommand = "talk-s";
    static talkInCharacterCommand = "ic";
    static icCommand = "ic";

    /**
     * Instance of TTSConnectorInterface (for demonstration; should be subclassed in real use)
     */
    ttsConnector = null;
    logger = null;
    chatProcessor = null;
    settingsManager = null;
    readAloudController = null;

    ttsConnectorCollection = [];

    get id() {
        return ACDTalkingActors.MODULE_ID;
    }

    constructor() {
        if (ACDTalkingActors.instance) return ACDTalkingActors.instance;
        ACDTalkingActors.instance = this;
        this._prefix = `[${ACDTalkingActors.MODULE_ID}]`;

        this.logger = new Logger(this);
        this.settingsManager = new TalkingActorsSettings(this);
        this.readAloudController = new ReadAloudController(this);

        Hooks.once("ready", () => {
            const receiver = new AudioReceiver(chunks => this.ttsConnector.playSound(chunks));
            game.socket.on('module.' + ACDTalkingActors.MODULE_ID, packet => receiver.receive(packet));

            this.ready();
        });

    }

    registerTtsConnector(connector) {
        if (!connector || !connector.id) {
            this.logger.error("Invalid TTS Connector registration attempt:", connector);
            return;
        }

        if (this.ttsConnectorCollection.find(c => c.id === connector.id)) {
            this.logger.warn(`TTS Connector with id ${connector.id} is already registered. Skipping duplicate registration.`);
            return;
        }

        this.ttsConnectorCollection.push(connector);
        this.logger.info(`Registered ${connector.label} as TTS Connector.`);

    }

    init() {

        this.logger.info("Initializing");

        Hooks.callAll(`acdTalkingActors.registerTtsConnector`, this, this.logger);

        if (this.ttsConnectorCollection.length === 0) {
            this.logger.warn("No TTS connectors registered.");
            return;
        }   
        

        this.settingsManager.register();

        const activeConnectorId = game.settings.get(TalkingActorsConstants.MODULE, TalkingActorsConstants.SETTINGS.ACTIVE_CONNECTOR);

        this.ttsConnector = this.ttsConnectorCollection.find(c => c.id === activeConnectorId) || this.ttsConnectorCollection[0];

        this.logger.info(`Using ${this.ttsConnector.label} as active TTS Connector.`);

        if (!this.ttsConnector) {
            return;
        }

        if (this.ttsConnector && typeof this.ttsConnector.registerSettings === "function") {
            this.ttsConnector.registerSettings();
        }

        // register any other initialization behavior here

        this.settingsManager.refreshFallbackVoiceChoices();
        Promise.resolve(this.ttsConnector.init())
            .then(() => this.settingsManager.refreshFallbackVoiceChoices())
            .catch(error => this.logger.error("TTS connector initialization failed:", error));

        this.speechStatus = new SpeechStatus(this.logger);
        this.speechStatus.registerHooks();
        this.chatProcessor = new ChatProcessor(this.ttsConnector, this.logger, { speechStatus: this.speechStatus });

        //add generic enrichers to TextEditor
        this.readAloudController.registerTextEditorEnrichers();

        Hooks.on("chatMessage", (chatlog, messageText, chatData) => {

            let chatContent = messageText.match(`^<p>(.+)</p>$`)
            let result = this.chatProcessor.processChatMessage(chatlog, chatContent ? chatContent[1] : messageText, chatData);
            return result;
        });

        $(document).on('click', '.acd-ta-replay', async event => {
            await this.ttsConnector.replaySpeech($(event.currentTarget).data('item-id'), { hasDirection: $(event.currentTarget).data('direction') === true });
        });

        Hooks.on("getSceneControlButtons", (controls) => this.injectControlToolButtons(controls));
        Hooks.on('renderSettingsConfig', app => this.injectSettingsHeaderLabel(app));
        Hooks.on('getActorContextOptions', (app, entries) => this.injectActorContextOptions(app, entries));
    }
        

    injectSettingsHeaderLabel(app) {
        const moduleTab = app.form.querySelector('.tab[data-tab=acd-talking-actors]');
        moduleTab.querySelector('input[name=acd-talking-actors\\.autoInCharacterTalk]').closest('div.form-group').after(this.createTitleNode(`${this.ttsConnector.label} Settings`));
    }

    createTitleNode (text) {
        const title = document.createElement('h2');
        title.classList.add('setting-header');
        title.innerText = game.i18n.localize(text);
        return title;
    }

    injectControlToolButtons(controls) {
        const soundsControl = Array.isArray(controls)
            ? controls.find(control => control.name === 'sounds')
            : controls?.sounds;
        const tools = soundsControl?.tools;
        if (!tools) {
            this.logger.warn("No sound controls found to inject mute button");
            return;
        }

        const audioHistoryTool = {
            name: 'acdTaAudioHistory',
            title: game.i18n.localize('acd.ta.AudioHistory.open'),
            icon: 'fa-solid fa-clock-rotate-left',
            button: true,
            visible: true,
            onChange: (_event, active) => active && this.openAudioHistory(),
            onClick: () => this.openAudioHistory(),
        };

        if (Array.isArray(tools)) {
            if (!tools.some(tool => tool.name === audioHistoryTool.name)) tools.push(audioHistoryTool);
            return;
        }

        if (typeof tools !== 'object') return;

        tools['acdTaMute'] = {
            name: "acdTaMute",
            title: game.i18n.localize("acd.ta.controls.mute"),
            icon: "fas fa-comment-slash",
            order: Object.keys(tools).length,
            toggle: true,
            visible: game.user.isGM,
            onChange: (event, active) => {
                game.acdTalkingActors.ttsConnector.isMuted = active;
            }
        };
        tools[audioHistoryTool.name] = {
            ...audioHistoryTool,
            order: Object.keys(tools).length,
        };
        
    }

    injectActorContextOptions(application, entries) {
        if (!application || !entries ) return;

        if (application.id !== 'actors') {
            this.logger.warn('Application is not Actors:', { application });
            return;
        }

        const voiceSettingsContextOption = {
            label: 'acd.ta.controls.button.title',
            icon: '<i class="fas fa-comment"></i>',
            visible: () => this.isModuleAccessible(),
            onClick: async (event, target) => {
                const el = target ?? event?.currentTarget ?? event?.target;
                this.onActorContextOptionClick(el?.closest?.('[data-entry-id]') ?? el);
            }
        };

        const audioHistoryContextOption = {
            label: 'acd.ta.AudioHistory.open',
            icon: '<i class="fas fa-clock-rotate-left"></i>',
            visible: () => this.isModuleAccessible(),
            onClick: (event, target) => {
                const el = target ?? event?.currentTarget ?? event?.target;
                const entry = el?.closest?.('[data-entry-id]') ?? el;
                const actorId = entry?.dataset?.entryId;
                if (actorId) this.openAudioHistory({ actorId });
            }
        };

        for (const option of [voiceSettingsContextOption, audioHistoryContextOption]) {
            if (!entries.find(entry => (entry.label ?? entry.name) === option.label)) {
                entries.push(option);
            }
        }
    }

    onActorContextOptionClick(entry) {
        const documentId = entry.dataset.entryId;
        if (!documentId) {
            this.logger.warn('No documentId found in context menu entry:', { entry });
            return;
        }

        const actor = game.actors.get(documentId);

        if (!actor) {
            this.logger.warn('Actor not found:', { documentId });
            return;
        }

        this.openVoiceEditor([actor]);
    }

    isModuleAccessible() {
        let moduleAccessible = false;
        const allowUsers = game.settings.get(TalkingActorsConstants.MODULE, TalkingActorsConstants.SETTINGS.ALLOW_USERS);
        moduleAccessible = (allowUsers || game.user.isGM);
        return moduleAccessible;
    }

    registerTextEditorEnrichers() {
        this.readAloudController.registerTextEditorEnrichers();
    }

    ready() {
        this.logger.info("Ready");
        // perform runtime setup that requires other systems to be ready

        if (!this.ttsConnector) {
            this.logger.error("No TTS Connector registered! Please check the module installation.");
            ui.errors.show(`ACD Talking Actors module error: No TTS Connector registered! Please check the module installation.`);
            return;
        }

        this.readAloudController.registerJournalSelectionContextMenu();

        if (game.user.isGM) {
            Hooks.on("renderTokenHUD", (app, hudHtml, data) => {
                this.readAloudController.injectTokenHudButtons(app, hudHtml, data);
            });
        }

        if (this.isModuleAccessible()) {
            Hooks.on('getActorSheetHeaderButtons', this.injectActorSheetHeaderButton.bind(this));
        }

        this.readAloudController.createJournalContextMenu();

    }

    injectActorSheetHeaderButton(sheet, buttons) {
        if (!this.isModuleAccessible()) {
            return;
        }

        buttons.unshift({
            class: 'edit-voicesetting',
            icon: 'fas fa-comments',
            label: localize("acd.ta.controls.headerbutton.title"),
            onclick: _ => this.openVoiceEditor([sheet.document]),
        });
    }

    registerSettings() {
        this.settingsManager.register();
    }

    get connectorChoices() {
        let connectorChoices = {};
        this.ttsConnectorCollection.forEach(m => {
            connectorChoices[m.id] = m.label;
        });
        return connectorChoices;
    }

    openVoiceEditor(actors) {
        if (!actors || actors.length == 0) return;

        this.ttsConnector.openVoiceSettingsApp(actors);
    }

    openAudioHistory(options = {}) {
        this.ttsConnector.openAudioHistory?.(options);
    }

    showTokenHudReadAloudDialog(_event, data) {
        return this.readAloudController.showTokenHudReadAloudDialog(data);
    }

    readAloudCurrentActor(...args) {
        return this.readAloudController.readAloudCurrentActor(...args);
    }

    readAloudNarrator(...args) {
        return this.readAloudController.readAloudNarrator(...args);
    }

    readAloud(...args) {
        return this.readAloudController.readAloud(...args);
    }

}

/* Expose the constructor for other modules/dev tools if desired */
window.ACDTalkingActors = ACDTalkingActors;

/* Wire the class into Foundry's lifecycle */
Hooks.once("init", async function () {
    game.acdTalkingActors = new ACDTalkingActors();
    game.acdTalkingActors.init();
});


Handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
    return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});

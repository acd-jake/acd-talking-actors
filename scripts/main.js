/**
 * Entry point class for the acd-talking-actors FoundryVTT module.
 */

import { localize } from "./libs/functions.js";
import TalkingActorsConstants from "./constants.js";
import { ReadAloudEnricher } from "./enrichers/read-aloud-enricher.js";
import { ReadAloudNarratorEnricher } from "./enrichers/read-aloud-narrator-enricher.js";
import { ReadAloudActorEnricher } from "./enrichers/read-aloud-actor-enricher.js";
import Logger from "./libs/logger.js";
import { ChatProcessor } from "./chat-processor.js";

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
    contextMenu = null;

    ttsConnectorCollection = [];

    get id() {
        return ACDTalkingActors.MODULE_ID;
    }

    constructor() {
        if (ACDTalkingActors.instance) return ACDTalkingActors.instance;
        ACDTalkingActors.instance = this;
        this._prefix = `[${ACDTalkingActors.MODULE_ID}]`;

        this.logger = new Logger(this);



        Hooks.once("ready", () => {
            game.socket.on('module.' + ACDTalkingActors.MODULE_ID, ({ container, historyItemId, text }) => {
                this.ttsConnector.playSound(container)
            });

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
        

        this.registerSettings();

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


        this.ttsConnector.init();

        this.chatProcessor = new ChatProcessor(this.ttsConnector, this.logger);

        //add generic enrichers to TextEditor
        this.registerTextEditorEnrichers();

        Hooks.on("chatMessage", (chatlog, messageText, chatData) => {
            let result = this.chatProcessor.processChatMessage(chatlog, messageText, chatData);
            return result;
        });
        let that = this;

        $(document).on('click', '.acd-ta-replay', async function () { await that.ttsConnector.replaySpeech($(this).data('item-id')); })

        Hooks.on("getSceneControlButtons", (controls) => this.injectControlToolButtons(controls));
        
        Hooks.on('getActorContextOptions', (app, entries) => this.injectActorContextOptions(app, entries));

        Hooks.on('renderSettingsConfig', (app, html) => {
            const moduleTab = app.form.querySelector('.tab[data-tab=acd-talking-actors]');
            moduleTab.querySelector('input[name=acd-talking-actors\\.autoInCharacterTalk]').closest('div.form-group').after(this.createTitleNode(`${that.ttsConnector.label} Settings`));
        });

    }

    createTitleNode (text) {
        const title = document.createElement('h2');
        title.classList.add('setting-header');
        title.innerText = game.i18n.localize(text);
        return title;
    }

    injectControlToolButtons(controls) {
        if (!controls?.sounds?.tools) {
            this.logger.warn("No sound controls found to inject mute button");
            return;
        }

        controls.sounds.tools['acdTaMute'] = {
            name: "acdTaMute",
            title: game.i18n.localize("acd.ta.controls.mute"),
            icon: "fas fa-comment-slash",
            order: Object.keys(controls.sounds.tools).length,
            toggle: true,
            visible: game.user.isGM,
            onChange: (event, active) => {
                game.acdTalkingActors.ttsConnector.isMuted = active;
            }
        }
        
    }

    injectActorContextOptions(application, entries) {
        if (!application || !entries ) return;

        if (application.id !== 'actors') {
            this.logger.warn('Application is not Actors:', { application });
            return;
        }

        const voiceSettingsContextOption = {
            name: 'acd.ta.controls.button.title',
            icon: '<i class="fas fa-comment"></i>',
            condition: () => this.isModuleAccessible(),
            callback: async (entry) => {
                this.onActorContextOptionClick(entry);
            }
        };

        if (!entries.find(e => e.name === voiceSettingsContextOption.name)) {
            entries.push(voiceSettingsContextOption);
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
        try {
            CONFIG.TextEditor.enrichers.push(
                new ReadAloudEnricher(),
                new ReadAloudActorEnricher(),
                new ReadAloudNarratorEnricher()
            );
        } catch (error) {
            this.logger.error("Failed to initialize generic enrichers\n", error);
        }
        loadTemplates([TalkingActorsConstants.PATHS.TEMPLATES + 'readaloud-table.hbs']);
    }

    ready() {
        this.logger.info("Ready");
        // perform runtime setup that requires other systems to be ready

        if (!this.ttsConnector) {
            this.logger.error("No TTS Connector registered! Please check the module installation.");
            ui.errors.show(`ACD Talking Actors module error: No TTS Connector registered! Please check the module installation.`);
            return;
        }

        if (game.settings.get(TalkingActorsConstants.MODULE, TalkingActorsConstants.SETTINGS.ENABLE_SELECTION_CONTEXT_MENU)) {
            document.addEventListener('contextmenu', (ev) => {
                if (ev.target.classList.contains('journal-entry-pages') ||
                    $(ev.target).parents('div.journal-entry-pages').length ||
                    ev.target.classList.contains('editor-content') ||
                    $(ev.target).parents('div.editor-content').length) {
                    this.showContextMenu(ev);
                }
            });
        }


        if (game.user.isGM) {
            Hooks.on("renderTokenHUD", this.injectTokenHudButtons.bind(this));
            //this.hookOnRenderTokenHUD();
        }

        if (this.isModuleAccessible()) {
            Hooks.on('getActorSheetHeaderButtons', this.injectActorSheetHeaderButton.bind(this));
        }

        this.createJournalContextMenu();

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

    injectTokenHudButtons(app, hudHtml, data) {
        if (!app.object.document.actorLink) {
            return;
        }

        let button = $(`<div class="control-icon talkingactors" data-tooltip="${localize("acd.ta.TokenHud.dialog.title")}"><i class="fas fa-comments"></i></div>`);

        // Find all elements with the class name '.col.left' in hudHtml and append the button after the last one
        const leftCols = hudHtml.getElementsByClassName ? hudHtml.getElementsByClassName('col left') : [];
        if (leftCols.length > 0) {
            const lastCol = leftCols[leftCols.length - 1];
            if (lastCol && lastCol.parentNode) {
                lastCol.append(button[0] || button);
            }
        } else {
            // fallback: append to firstChild as before
            hudHtml.firstChild.append(button[0] || button);
        }
        button.click(async (event) => { // getElementsByClassName("i.fa-comments").click(async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await this.showTokenHudReadAloudDialog(event, data);
        });
    }

    registerSettings() {
        if (!game?.settings) return;
        try {

            game.settings.register(TalkingActorsConstants.MODULE, "debug", {
                name: "ACD Talking Actors | Debug",
                hint: "Enable debug logging for the module",
                scope: "client",
                config: false,
                default: false,
                type: Boolean,
                onChange: value => { game.acdTalkingActors.ttsConnector.init(); },
            });

            game.settings.register(TalkingActorsConstants.MODULE, TalkingActorsConstants.SETTINGS.ACTIVE_CONNECTOR, {
                name: "Active TTS Connector",
                hint: "Select the active Text-to-Speech connector",
                scope: "client",
                config: true,
                default: false,
                type: String,
                choices: this.connectorChoices,
                requiresReload: true,
            });

            game.settings.register(TalkingActorsConstants.MODULE, TalkingActorsConstants.SETTINGS.ALLOW_USERS, {
                name: 'acd.ta.settings.AllowUsers',
                hint: 'acd.ta.settings.AllowUsersHint',
                config: true,
                scope: 'world',
                type: Boolean,
                default: true,
                onChange: value => { game.acdTalkingActors.ttsConnector.init(); },
            });

            game.settings.register(TalkingActorsConstants.MODULE, TalkingActorsConstants.SETTINGS.NARRATORACTOR, {
                name: 'acd.ta.settings.NarratorActor',
                hint: 'acd.ta.settings.NarratorActorHint',
                scope: "world",
                config: true,
                type: String,
                onChange: value => { game.acdTalkingActors.ttsConnector.init(); },
                default: "",
            });

            game.settings.register(TalkingActorsConstants.MODULE, TalkingActorsConstants.SETTINGS.ENABLE_SELECTION_CONTEXT_MENU, {
                name: 'acd.ta.settings.EnableSelectionContextMenu',
                hint: 'acd.ta.settings.EnableSelectionContextMenuHint',
                config: true,
                scope: 'world',
                type: Boolean,
                default: false,
            });


            game.settings.register(TalkingActorsConstants.MODULE, TalkingActorsConstants.SETTINGS.POST_TO_CHAT, {
                name: 'acd.ta.settings.PostTextToChat',
                hint: 'acd.ta.settings.PostTextToChatHint',
                config: true,
                scope: 'world',
                type: Boolean,
                default: true,
            });

            game.settings.register(TalkingActorsConstants.MODULE, TalkingActorsConstants.SETTINGS.AUTO_IN_CHARACTER_TALK, {
                name: 'acd.ta.settings.AutoInCharacterTalk',
                hint: 'acd.ta.settings.AutoInCharacterTalkHint',
                config: true,
                scope: 'world',
                type: Boolean,
                default: true,
            });

        } catch (err) {
            this.logger.error("Settings registration skipped or failed:", err);
        }
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

    async showTokenHudReadAloudDialog(event, data) {
        const myContent = await renderTemplate(TalkingActorsConstants.PATHS.TEMPLATES + "tokenhud-dialog.hbs", data);

        new Dialog({
            title: game.i18n.localize("acd.ta.TokenHud.dialog.title"),
            content: myContent,
            buttons: {
                readaloud: {
                    icon: '<i class="fas fa-comments"></i>',
                    label: localize("acd.ta.TokenHud.withChat"),
                    callback: (html) => this.readAloudCallback(html, true)
                },
                readAloudWithoutChat: {
                    icon: '<i class="fas fa-comments"></i>',
                    label: localize("acd.ta.TokenHud.withoutChat"),
                    callback: (html) => this.readAloudCallback(html, false)
                },
                close: {
                    icon: '<i class="fas fa-cancel"></i>',
                    label: game.i18n.localize("Cancel"),
                },
            },
            default: "close",
        }).render(true);
    }
    async readAloudCurrentActor(content, postToChat = true, options = {}) {
        // Implementation for reading aloud content with the current actor's voice
        let command = this.createChatCommand(postToChat);

        content = `/${command} ${content.replace(/\\n/g, '<br>')}`;

        ui.chat.processMessage(content);
    }

    async readAloudNarrator(content, options = {}) {
        // Implementation for reading aloud content with the current actor's voice
        let command = "narrate";

        content = `/${command} ${content.replace(/\\n/g, '<br>')}`;

        ui.chat.processMessage(content);
    }

    async readAloud(content, postToChat = true, options = {}) {
        // Implementation for reading aloud content with the given actors voice
        let narrator = options.narrator;
        if (!narrator) {
            //TODO: change to method in connector, or better yet, implement a /narrate command
            narrator = this.tryGetSpeakerActorForNarratingActor()?._id;
        }

        let command = this.createChatCommand(postToChat);
        content = `/${command} {${narrator}} ${content.replace(/\\n/g, '<br>')}`;

        ui.chat.processMessage(content);
    }

    async readAloudCallback(html, postToChat) {
        let message = html.find("[name='readaloadtext']").first().val();
        let speaker = html.find("input[name='speaker']:checked").val();
        if (speaker == "narrator") {
            this.readAloud(message, postToChat, { inCharacter: false });
        } else {
            this.readAloudCurrentActor(message, postToChat);
        }
    }

    createChatCommand(postToChat) {
        return postToChat ? "talk" : "talk-s";
    }

    async showContextMenu(event) {
        const time = this.contextMenu.isOpen() ? 100 : 0;
        this.contextMenu.hide();
        setTimeout(() => {
            this.contextMenu.show(event.pageX, event.pageY);
        }, time);
    }

    createJournalContextMenu() {
        this.contextMenu = new ContextMenuNT({
            theme: 'default',
            items: [
                {
                    icon: 'comment',
                    name: game.i18n.localize("acd.ta.controls.readAloud"),
                    action: () => {
                        const selection = this.getSelectionText();
                        if (selection)
                            this.readAloud(selection, true);
                        this.contextMenu.hide();
                    },
                },
                {
                    icon: 'comment',
                    name: game.i18n.localize("acd.ta.controls.readAloudWithoutChat"),
                    action: () => {
                        const selection = this.getSelectionText();
                        if (selection)
                            this.readAloud(selection, false);
                        this.contextMenu.hide();
                    },
                },
                {
                    icon: 'comment',
                    name: game.i18n.localize("acd.ta.controls.readAloudCurrentActor"),
                    action: () => {
                        const selection = this.getSelectionText();
                        if (selection)
                            this.readAloudCurrentActor(selection, true);
                        this.contextMenu.hide();
                    },
                },
                {
                    icon: 'comment',
                    name: game.i18n.localize("acd.ta.controls.readAloudCurrentActorWithoutChat"),
                    action: () => {
                        const selection = this.getSelectionText();
                        if (selection)
                            this.readAloudCurrentActor(selection, false);
                        this.contextMenu.hide();
                    },
                },
                {
                    icon: 'cancel',
                    name: game.i18n.localize("acd.ta.controls.cancel"),
                    action: () => {
                        this.contextMenu.hide();
                    },
                },
            ],
        });
    }

    getSelectionText() {
        let html = '';
        const selection = window.getSelection();
        if (selection?.rangeCount && !selection.isCollapsed) {
            const fragments = selection.getRangeAt(0).cloneContents();
            const size = fragments.childNodes.length;
            for (let i = 0; i < size; i++) {
                if (fragments.childNodes[i].nodeType == fragments.TEXT_NODE)
                    html += fragments.childNodes[i].wholeText;
                else
                    html += fragments.childNodes[i].outerHTML;
            }
        }
        if (!html) {
        }
        return html;
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

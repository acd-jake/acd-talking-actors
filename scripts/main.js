/**
 * Entry point class for the acd-talking-actors FoundryVTT module.
 */

import ElevenlabsConnector from "./elevenlabs/elevenlabs_connector.js";
import ExampleTTSConnector from "./example_tts_connector.js";
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
    
    constructor() {
        if (ACDTalkingActors.instance) return ACDTalkingActors.instance;
        ACDTalkingActors.instance = this;
        this._prefix = `[${ACDTalkingActors.MODULE_ID}]`;
        
        this.logger = new Logger(this);

        // Create an instance of the TTSConnectorInterface (abstract, for demonstration only)
        // In real usage, use a subclass instead
        this.ttsConnector = new ElevenlabsConnector();

        this.chatProcessor = new ChatProcessor(this.ttsConnector, this.logger);

        //TODO: remove this example connector
        //this.ttsConnector = new ExampleTTSConnector();

        Hooks.once("ready", () => {
            game.socket.on('module.' + ACDTalkingActors.MODULE_ID, ({ container, historyItemId, text }) => {
                this.ttsConnector.playSound(container)
            });

            this.ready();
        });

    }

    init() {

        this.logger.info("Initializing");
        //this.log("Initializing");
        this.registerSettings();
        if (this.ttsConnector && typeof this.ttsConnector.registerSettings === "function") {
            this.ttsConnector.registerSettings();
        }

        // register any other initialization behavior here

        this.ttsConnector.init();

        //add generic enrichers to TextEditor
        this.registerTextEditorEnrichers();

        Hooks.on("chatMessage", (chatlog, messageText, chatData) => {
            //let result = this.processChatMessage(chatlog, messageText, chatData);
            let result = this.chatProcessor.processChatMessage(chatlog, messageText, chatData);
            return result;
        });
        let that = this;

        $(document).on('click', '.acd-ta-replay', async function () { await that.ttsConnector.replaySpeech($(this).data('item-id')); })
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

        if (game.user.isGM) {
            Hooks.on("renderTokenHUD", this.injectTokenHudButtons.bind(this));
            //this.hookOnRenderTokenHUD();
        }

        if (this.isModuleAccessible()) {
            Hooks.on('getActorSheetHeaderButtons', this.injectActorSheetHeaderButton.bind(this));
        }
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

    injectTokenHudButtons (app, hudHtml, data)
    {
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

    async readAloud(content, postToChat = true, options = {}) {
        // Implementation for reading aloud content with the given actors voice
        let narrator = options.narrator;
        if (!narrator) {
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
            this.readAloud(message, postToChat, {inCharacter: false});
        } else {
            this.readAloudCurrentActor(message, postToChat);
        }
    }

    createChatCommand(postToChat) {
        return postToChat ? "talk" : "talk-s";
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

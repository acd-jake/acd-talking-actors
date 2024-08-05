import { ElevenlabsConnector } from './ElevenlabsConnector.js';
import { MODULE } from './constants.js'
import { VoiceSettingsApp } from './VoiceSettings.js';
import { ReadAloudEnricher, ReadAloudActorEnricher, ReadAloudNarratorEnricher } from './ReadAloudEnricher.js';
import { TalkingActorsApi } from './TalkingActorsApi.js';

export let localize = key => {
    return game.i18n.localize(key);
};


function registerSettings() {
    game.settings.register(MODULE.ID, MODULE.MASTERAPIKEY, {
        name: localize("acd.ta.settings.MasterApiKey"),
        hint: localize("acd.ta.settings.MasterApiKeyHint"),
        scope: "world",
        config: true,
        type: String,
        onChange: value => { game.talkingactors.connector.initializeMain(); },
        requiresReload: true
    });

    game.settings.register(MODULE.ID, MODULE.APIKEY, {
        name: localize("acd.ta.settings.ApiKey"),
        hint: localize("acd.ta.settings.ApiKeyHint"),
        scope: "client",
        config: true,
        type: String,
        onChange: value => { game.talkingactors.connector.initializeMain(); }
    });

    game.settings.register(MODULE.ID, MODULE.NARRATORACTOR, {
        name: localize("acd.ta.settings.NarratorActor"),
        hint: localize("acd.ta.settings.NarratorActorHint"),
        scope: "world",
        config: true,
        type: String,
        onChange: value => { game.talkingactors.connector.initializeMain(); }
    });

    game.settings.register(MODULE.ID, MODULE.ALLOWUSERS, {
        name: 'acd.ta.settings.AllowUsers',
        hint: 'acd.ta.settings.AllowUsersHint',
        config: true,
        scope: 'world',
        type: Boolean,
        default: true,
    });

    game.settings.register(MODULE.ID, MODULE.ENABLESELECTIONCONTEXTMENU, {
        name: 'acd.ta.settings.EnableSelectionContextMenu',
        hint: 'acd.ta.settings.EnableSelectionContextMenuHint',
        config: true,
        scope: 'world',
        type: Boolean,
        default: false,
    });

    
    game.settings.register(MODULE.ID, MODULE.POSTTOCHAT, {
        name: 'acd.ta.settings.PostTextToChat',
        hint: 'acd.ta.settings.PostTextToChatHint',
        config: true,
        scope: 'world',
        type: Boolean,
        default: true,
    });

}

function isModuleAccessible() {
    let moduleAccessible = false;
    const allowUsers = game.settings.get(MODULE.ID, MODULE.ALLOWUSERS);
    moduleAccessible = (allowUsers || game.user.isGM);
    return moduleAccessible;
}

function openVoiceEditor(actors) {
    if (!actors || actors.length == 0) return;

    new VoiceSettingsApp(actors).render(true);
}


function injectActorSheetHeaderButton(sheet, buttons) {
    if (!isModuleAccessible()) {
        return;
    }

    buttons.unshift({
        class: 'edit-voicesetting',
        icon: 'fas fa-comments',
        label: localize("acd.ta.controls.headerbutton.title"),
        onclick: _ => openVoiceEditor([sheet.document]),
    });
}

function injectActorDirectoryEntryContextButton(application, entries) {
    entries.push({
        name: 'acd.ta.controls.button.title',
        icon: '<i class="fas fa-comment"></i>',
        condition: () => {
            return isModuleAccessible();
        },
        callback: async ([entry]) => {
            const documentId = entry.dataset.documentId;
            let actor;

            if (application.id === 'actors') {
                actor = game.actors.get(documentId);
            }
            else {
                ui.notifications.warn('Only Actors are supported:', { directory, entry })
            }

            if (actor) {
                openVoiceEditor([actor]);
            }
            else {
                ui.notifications.warn('Actor not found:', { documentId, directoryId })
            }
        }
    });
}



Hooks.once("init", async function () {

    registerSettings();


    game.talkingactors = {
        connector: new ElevenlabsConnector()
    };

    await game.talkingactors.connector.initializeMain();

    game.modules.get(MODULE.ID).api = new TalkingActorsApi();
    
    //add generic enrichers to TextEditor
    try {
        CONFIG.TextEditor.enrichers.push(
            new ReadAloudEnricher(),
            new ReadAloudActorEnricher(),
            new ReadAloudNarratorEnricher()
        );

    } catch (error) {
        console.error("LMJE | Failed to initialize generic enrichers\n", error);
    }
    loadTemplates([MODULE.TEMPLATEDIR + 'ta-readaloud-table.hbs']);

});

Hooks.on("getSceneControlButtons", (controls, b, c) => {
    // Button in token controls is not needed anymore since Talking Actor Voice Settings UI is now  accessible
    // via context menu in actor tab and in header of the character sheets

    /*    if (!isModuleAccessible()) {
        return;
    }

    controls
        .find((x) => x.name == "token")
        .tools.push({
            icon: "fa-solid fa-comments",
            name: "elfa-button",
            title: localize("acd.ta.controls.button.title"),
            onClick: function (toggle) {
                let linkedActors = canvas.tokens.controlled.filter(token => token.actor.prototypeToken.actorLink).map(x => x.actor);

                if (linkedActors.length != canvas.tokens.controlled.length) {
                    ui.notifications.warn(localize("acd.ta.errors.notAllLinkedActors"));
                }

                openVoiceEditor(linkedActors);
            },
            button: true,
        });
*/
});


Hooks.on('getActorSheetHeaderButtons', injectActorSheetHeaderButton);
Hooks.on('getActorDirectoryEntryContext', injectActorDirectoryEntryContextButton);

Hooks.on("chatMessage", (chatlog, messageText, chatData) => {
    return game.talkingactors.connector.processChatMessage(chatlog, messageText, chatData);
});

Hooks.on("ready", () => {
    game.socket.on('module.' + MODULE.ID, ({ testarg, container }) => {
        game.talkingactors.connector.playSound(container)
    });

    if (game.settings.get(MODULE.ID, MODULE.ENABLESELECTIONCONTEXTMENU)) {
        document.addEventListener('contextmenu', (ev) => {
            if (ev.target.classList.contains('journal-entry-pages') ||
                $(ev.target).parents('div.journal-entry-pages').length ||
                ev.target.classList.contains('editor-content') ||
                $(ev.target).parents('div.editor-content').length) {
                game.talkingactors.connector.showContextMenu(ev);
            }
        });
    }

    Hooks.on("renderTokenHUD", (app, hudHtml, data) => {
        if ( !app.object.document.actorLink ) {
            return;
        }
        
        let button = $(`<div class="control-icon talkingactors" data-tooltip="${localize("acd.ta.TokenHud.dialog.title")}"><i class="fas fa-comments"></i></div>`);
        let actor = game.actors.get(app.object.document.actorId);

        hudHtml.find(".col.left").append(button);
        button.find("i.fa-comments").click(async (event) => {
            event.preventDefault();
            event.stopPropagation();
            const myContent = await renderTemplate(MODULE.TEMPLATEDIR + "ta-tokenhud-dialog.hbs", data);
            
            new Dialog({
              title: game.i18n.localize("acd.ta.TokenHud.dialog.title"),
              content: myContent,
              buttons: {
                readaloud:  {
                    icon: '<i class="fas fa-comments"></i>',
                    label: localize("acd.ta.TokenHud.withChat"),
                    callback: (html) => readAloudCallback(html, true)
                },
                readAloudWithoutChat:  {
                    icon: '<i class="fas fa-comments"></i>',
                    label: localize("acd.ta.TokenHud.withoutChat"),
                    callback: (html) => readAloudCallback(html, false)
                },
                cancel: {
                  icon: '<i class="fas fa-cancel"></i>',
                  label: game.i18n.localize("Cancel"),
                },
              },
              default: "cancel",
            }).render(true);
          });
      });
})

function readAloudCallback(html, postToChat) {
    let message = html.find("[name='readaloadtext']").first().val();
    let speaker = html.find("input[name='speaker']:checked").val();
    if (speaker == "narrator") {
        game.talkingactors.connector.readAloud(message,postToChat);
    } else {
        game.talkingactors.connector.readAloudCurrentActor(message,postToChat);
    }
}

Handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
    return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});


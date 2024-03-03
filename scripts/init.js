import { ElevenlabsConnector } from './ElevenlabsConnector.js';
import { MODULE } from './constants.js'
import { VoiceSettingsApp } from './VoiceSettings.js';

export let localize = key => {
    return game.i18n.localize(key);
};

Hooks.once("init", async function () {

    game.settings.register(MODULE.ID, MODULE.MASTERAPIKEY, {
        name: localize("acd.ta.settings.MasterApiKey"),
        hint: localize("acd.ta.settings.MasterApiKeyHint"),
        scope: "world",
        config: true,
        type: String,
        onChange: value => { game.talkingactors.connector.initializeMain() },
        requiresReload: true 
    });

    game.settings.register(MODULE.ID, MODULE.APIKEY, {
        name: localize("acd.ta.settings.ApiKey"),
        hint: localize("acd.ta.settings.ApiKeyHint"),
        scope: "client",
        config: true,
        type: String,
        onChange: value => { game.talkingactors.connector.initializeMain() }
    });

    game.settings.register(MODULE.ID, MODULE.NARRATORACTOR, {
        name: localize("acd.ta.settings.NarratorActor"),
        hint: localize("acd.ta.settings.NarratorActorHint"),
        scope: "client",
        config: true,
        type: String,
        onChange: value => { game.talkingactors.connector.initializeMain() }
    });

    game.settings.register(MODULE.ID, MODULE.ALLOWUSERS, {
		name: 'acd.ta.settings.AllowUsers',
		hint: 'acd.ta.settings.AllowUsersHint',
		config: true,
		scope: 'world',
		type: Boolean,
		default: true,
	});


    game.talkingactors = {
        connector: new ElevenlabsConnector()
    };

    await game.talkingactors.connector.initializeMain();
});

function isModuleAccessible() {
    let moduleAccessible = false;
    const allowUsers = game.settings.get(MODULE.ID, MODULE.ALLOWUSERS);
    moduleAccessible = (allowUsers || game.user.isGM);
    return moduleAccessible;
}

Hooks.on("getSceneControlButtons", (controls, b, c) => {
    if (!isModuleAccessible()) {
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

                new VoiceSettingsApp(linkedActors).render(true);
            },
            button: true,
        });
});

Handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
    return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});

Hooks.on("chatMessage", (chatlog, messageText, chatData) => {
    return game.talkingactors.connector.processChatMessage(chatlog, messageText, chatData);
});


Hooks.on("ready", () => {
    game.socket.on('module.' + MODULE.ID, ({ testarg, container }) => {
        game.talkingactors.connector.playSound(container)
    });

    document.addEventListener('contextmenu', (ev) => {
        if (ev.target.classList.contains('journal-entry-pages') ||
                $(ev.target).parents('div.journal-entry-pages').length ||
                ev.target.classList.contains('editor-content') ||
                $(ev.target).parents('div.editor-content').length) {
                    game.talkingactors.connector.showContextMenu(ev);
                }
    });
})



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


    game.talkingactors = {
        connector: new ElevenlabsConnector()
    };

    await game.talkingactors.connector.initializeMain();
});

Hooks.on("getSceneControlButtons", (controls, b, c) => {
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
})



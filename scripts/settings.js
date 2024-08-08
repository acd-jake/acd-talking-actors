import { MODULE } from "./constants.js";
import { localize } from "./functions.js";

export function registerSettings() {
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

    game.settings.register(MODULE.ID, MODULE.SOUNDEFFECTFOLDER, {
        name: 'acd.ta.settings.SoundEffectFolder',
        hint: 'acd.ta.settings.SoundEffectFolderHint',
        config: true,
        scope: 'world',
        type: String,
        filePicker: 'folder',
    });

    game.settings.register(MODULE.ID, MODULE.SOUNDEFFECTPLAYLIST, {
        name: localize("acd.ta.settings.SoundEffectPlaylist"),
        hint: localize("acd.ta.settings.SoundEffectPlaylistHint"),
        scope: "world",
        config: true,
        type: String,
    });

}

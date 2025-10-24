export default class TalkingActorsConstants {
    // Module identity
    static MODULE = 'acd-talking-actors';
    static MODULE_TITLE = 'ACD Talking Actors';
    static APIKEY = "xi-api-key";
    static MASTERAPIKEY= "xi-master-api-key";

    // Socket channel
    static SOCKET = `${TalkingActorsConstants.MODULE}.socket`;

    // Flag namespace helpers
    static flagScope(scope, key) {
        return `${TalkingActorsConstants.MODULE}.${scope}.${key}`;
    }
    static FLAGS = {
        MODULE: TalkingActorsConstants.MODULE,
        ACTOR: 'actor',
        TOKEN: 'token',
        ITEM: 'item',
        SCENE: 'scene'
    };

    static DEPENDENCIES = {
        SCENEACTORS: "yendors-scene-actors",
        CONVERSATIONHUD: "conversation-hud"
    };

    // Settings keys (use ACDConstants.setting('name') to produce full key)
    static settingKey(key) {
        return `${TalkingActorsConstants.MODULE}.${key}`;
    }
    static SETTINGS = {
        ALLOW_USERS: 'allow-users',
        ENABLE_SELECTION_CONTEXT_MENU: 'enableContextMenuOnSelection',
        POST_TO_CHAT: 'postSpokenTextToChat',
        AUTO_IN_CHARACTER_TALK: 'autoInCharacterTalk',
        DEBUG: 'debug',
        NARRATORACTOR: 'narrating-actor'
    };

    // Hook names that the module will emit/consume
    static HOOKS = {
        SPEECH_START: `${TalkingActorsConstants.MODULE}.speechStart`,
        SPEECH_END: `${TalkingActorsConstants.MODULE}.speechEnd`,
        SPEECH_CREATE: `${TalkingActorsConstants.MODULE}.speechCreate`,
        SPEECH_CANCEL: `${TalkingActorsConstants.MODULE}.speechCancel`
    };

    // Template and assets paths
    static PATHS = {
        ROOT: `modules/${TalkingActorsConstants.MODULE}`,
        SCRIPTS: `modules/${TalkingActorsConstants.MODULE}/scripts/`,
        TEMPLATES: `modules/${TalkingActorsConstants.MODULE}/templates/`,
        STYLES: `modules/${TalkingActorsConstants.MODULE}/styles/`,
        CHAT_CARD: `modules/${TalkingActorsConstants.MODULE}/templates/chat-card.html`,
        SETTINGS: `modules/${TalkingActorsConstants.MODULE}/templates/settings.html`
    };

    // Default values used across the module
    static DEFAULTS = {
        VOLUME: 1.0,
        VOICE: 'default',
        ENABLED: true,
        DEBUG: false
    };

    // Utility helpers for consuming constants
    static fullSetting(key) {
        return TalkingActorsConstants.settingKey(key);
    }
    static fullFlag(scope, key) {
        return TalkingActorsConstants.flagScope(scope, key);
    }
}
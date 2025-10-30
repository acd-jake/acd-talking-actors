import TTSConnectorInterface from "./tts-connector-interface.js";

export default class ExampleTTSConnector extends TTSConnectorInterface {
    get id() {
        return "example-tts";
    }

    get label() {
        return "Example TTS Connector";
    }

    getSettingsSchema() {
        return [
            { key: "api-key", name: "API Key", hint: "Your Example TTS API Key", scope: "world", config: true, type: String, default: "" }
        ];
    }

    async getAvailableVoices() {
        // Example: return a static list
        return [
            { id: "voice1", name: "Voice One", lang: "en", gender: "female" },
            { id: "voice2", name: "Voice Two", lang: "en", gender: "male" }
        ];
    }

    async speak(text, options = {}) {
        // Example: just log the text
        console.log(`[ExampleTTSConnector] Speaking:`, text, options);
        this._speaking = true;
        setTimeout(() => { this._speaking = false; }, 1000);
    }

    async stop() {
        this._speaking = false;
    }

    async generateAudioData(text, options = {}) {
        // Example: return null
        return null;
    }
}

Hooks.on("acdTalkingActors.registerTtsConnector", (mainModule, logger) => {
    mainModule.registerTtsConnector(new ExampleTTSConnector(mainModule, logger));
});

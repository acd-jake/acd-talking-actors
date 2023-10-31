import { MODULE } from '../constants.js';

class ElevenlabsRequest {
    api_key;
    api_url = 'https://api.elevenlabs.io/v1/';

    constructor() {
        this.api_key = game.settings.get(MODULE.ID, MODULE.APIKEY);
    }

    execute() {
        throw new Error("Method 'execute()' ist not implemented in derived class.");
    };

    fetch() {
        throw new Error("Method 'fetch()' ist not implemented in derived class.");
    };

    async fetchJson(command) {
        return await fetch(`${this.api_url}${command}`, {
            headers: {
                'accept': 'application/json',
                'xi-api-key': this.api_key
            }
        }).then(response => response.text());
    };

    async postData(command, acceptType, body) {
        let response = await fetch(`${this.api_url}${command}`, {
            method: 'POST',
            headers: {
                'accept': acceptType,
                'xi-api-key': this.api_key,
                'Content-Type': 'application/json'
            },
            body: body
        });
        return response;
    }
}
export class TextToSpeechRequest extends ElevenlabsRequest {
    voiceId;
    text;
    settings;

    constructor(voiceId, text, settings) {
        super();
        this.voiceId = voiceId;
        this.text = text;
        this.settings = settings;
    }

    async fetch() {
        let body = {
            "text": this.text,
            "model_id": "eleven_multilingual_v2"
        };

        if (this.settings) {
            body = mergeObject(body, {
                "voice_settings": {
                    "stability": this.settings.stability,
                    "similarity_boost": this.settings.similarity_boost,
                    "style": this.settings.style,
                    "use_speaker_boost": "true"
                }
            });
        }

        let response = await this.postData(`text-to-speech/${this.voiceId}`,
            "audio/mpeg", JSON.stringify(body));
        return response;
    }
}
export class GetVoicesRequest extends ElevenlabsRequest {
    async fetch() {
        let allVoices;

        allVoices = await super.fetchJson('voices')
            .then(text => JSON.parse(text).voices);

        return allVoices;
    }
}
export class GetUserDataRequest extends ElevenlabsRequest {
    async fetch() {
        let subscriptionInfo = await super.fetchJson('user/subscription')
            .then(text => JSON.parse(text));

        return subscriptionInfo;
    }
}
export class GetVoiceSettingsRequest extends ElevenlabsRequest {
    voiceId;

    constructor(voiceId) {
        super();
        this.voiceId = voiceId;
    }

    async fetch() {
        let settings = await super.fetchJson(`voices/${this.voiceId}/settings`)
            .then(text => JSON.parse(text));

        return settings;

    }
}

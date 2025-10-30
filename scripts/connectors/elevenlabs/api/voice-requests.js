import { ElevenlabsRequest } from "./elevenlabs-request.js";


export class GetVoicesRequest extends ElevenlabsRequest {
    constructor(connector) {
        super(connector);
    }

    async fetch() {
        let allVoices;

        allVoices = await super.fetchJson('voices')
            .then(text => JSON.parse(text).voices);

        return allVoices;
    }
}

export class GetVoiceSettingsRequest extends ElevenlabsRequest {
    voiceId;

    constructor(connector, voiceId) {
        super(connector);
        this.voiceId = voiceId;
    }

    async fetch() {
        let settings = await super.fetchJson(`voices/${this.voiceId}/settings`)
            .then(text => JSON.parse(text));

        return settings;

    }
}


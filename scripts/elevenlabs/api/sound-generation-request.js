import { ElevenlabsRequest } from "./elevenlabs-request.js";


export class SoundGenerationRequest extends ElevenlabsRequest {
    text;
    settings;

    constructor(text, settings) {
        super();
        this.text = text;
        this.settings = settings;
    }

    async fetch() {
        let body = {
            "text": this.text
        };

        if (this.settings) {
            body = this.addDurationSecondsToBody(body);
            body = this.addPromptInfluenceToBody(body);
        }

        const bodyJson = JSON.stringify(body);

        let response = await this.postData(`sound-generation`,
            "audio/mpeg", bodyJson);
        return response;

    }

    addPromptInfluenceToBody(body) {
        if (this.settings.promptInfluence >= 0
            && this.settings.promptInfluence <= 1) {
            body = foundry.utils.mergeObject(body, {
                "prompt_influence": this.settings.promptInfluence * 1.0
            });
        }
        return body;
    }

    addDurationSecondsToBody(body) {
        if (this.settings.durationSeconds >= 0.5
            && this.settings.durationSeconds <= 22) {
            body = foundry.utils.mergeObject(body, {
                "duration_seconds": this.settings.durationSeconds * 1.0
            });
        }
        return body;
    }
}

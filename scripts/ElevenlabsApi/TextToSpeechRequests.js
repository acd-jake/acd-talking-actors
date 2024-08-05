import { ElevenlabsRequest } from "./ElevenlabsRequests.js";


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
            body = foundry.utils.mergeObject(body, {
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

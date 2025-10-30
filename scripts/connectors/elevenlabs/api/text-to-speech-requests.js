import { ElevenlabsRequest } from "./elevenlabs-request.js";

export class TextToSpeechRequest extends ElevenlabsRequest {
    voiceId;
    modelId;
    languageId;
    text;
    settings;

    constructor(connector, voiceId, modelId, languageId, text, settings) {
        super(connector);
        this.voiceId = voiceId;
        this.modelId = modelId;
        this.languageId = languageId;
        this.text = text;
        this.settings = settings;
    }

    async fetch() {
        let body = {
            "text": this.text,
            "model_id": this.modelId, // "eleven_multilingual_v2"
            "language_code": this.languageId  //"en"
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



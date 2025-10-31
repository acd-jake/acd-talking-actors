import { ELEVENLABS_CONSTANTS } from "../constants.js";

export class ElevenlabsRequest {
    api_key;
    api_url = 'https://api.elevenlabs.io/v1/';

    constructor(connector) {
        this.api_key = game.settings.get(connector.mainSettingsId, ELEVENLABS_CONSTANTS.APIKEY);
        if (this.api_key?.length < 1) {
            this.api_key = game.settings.get(connector.mainSettingsId, ELEVENLABS_CONSTANTS.MASTERAPIKEY);
        }
    }

    execute() {
        throw new Error("Method 'execute()' ist not implemented in derived class.");
    };

    fetch() {
        throw new Error("Method 'fetch()' ist not implemented in derived class.");
    };

    async fetchJson(command) {
        const response =await fetch(`${this.api_url}${command}`, {
            headers: {
                'accept': 'application/json',
                'xi-api-key': this.api_key
            }
        });

        this.checkResponseStatus(response);
    
        return await response.text();
    };

    async fetchResponse(command) {
        const response = await fetch(`${this.api_url}${command}`, {
            headers: {
                'accept': 'application/json',
                'xi-api-key': this.api_key
            }
        });

        this.checkResponseStatus(response);
        
        return response;
    }

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

        this.checkResponseStatus(response);

        return response;
    }

    checkResponseStatus(response) {
        if (response.status !== 200 && response.status !== 201) {
            this.logger.error(`TTS request failed with status ${response.status}, detail: ${response.detail?.message || 'No additional information.'}`);
            this._speaking = false;
            return false;
        }
        return true;
    }
}

import { MODULE } from '../constants.js';

export class ElevenlabsRequest {
    api_key;
    api_url = 'https://api.elevenlabs.io/v1/';

    constructor() {
        this.api_key = game.settings.get(MODULE.ID, MODULE.APIKEY);
        if (this.api_key?.length <1) {
            this.api_key = game.settings.get(MODULE.ID, MODULE.MASTERAPIKEY);
        }
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

    async fetchResponse(command) {
        return await fetch(`${this.api_url}${command}`, {
            headers: {
                'accept': 'application/json',
                'xi-api-key': this.api_key
            }
        })
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
        return response;
    }
}



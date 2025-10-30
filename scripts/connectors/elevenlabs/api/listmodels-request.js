import { ElevenlabsRequest } from "./elevenlabs-request.js";


export class ListModelsRequest extends ElevenlabsRequest {
    constructor(connector) {
        super(connector);
    }

    async fetch() {
        let models = await super.fetchJson('models')
            .then(text => JSON.parse(text));

        return models;
    }
}

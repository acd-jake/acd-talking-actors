import { ElevenlabsRequest } from "./elevenlabs-request.js";


export class ListModelsRequest extends ElevenlabsRequest {
    async fetch() {
        let models = await super.fetchJson('models')
            .then(text => JSON.parse(text));

        return models;
    }
}

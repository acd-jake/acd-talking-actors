import { ElevenlabsRequest } from "./elevenlabs-request.js";


export class GetUserSubscriptionInfoRequest extends ElevenlabsRequest {
    constructor(connector) {
        super(connector);
    }

    async fetch() {
        let subscriptionInfo = await super.fetchJson('user/subscription')
            .then(text => JSON.parse(text));

        return subscriptionInfo;
    }
}


import { ElevenlabsRequest } from "./ElevenlabsRequests.js";


export class GetUserSubscriptionInfoRequest extends ElevenlabsRequest {
    async fetch() {
        let subscriptionInfo = await super.fetchJson('user/subscription')
            .then(text => JSON.parse(text));

        return subscriptionInfo;
    }
}

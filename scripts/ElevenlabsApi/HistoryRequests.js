import { ElevenlabsRequest } from "./ElevenlabsRequests.js";


export class GetAudioFromHistoryItemRequest extends ElevenlabsRequest {
    itemId;

    constructor(itemId) {
        super();
        this.itemId = itemId;
    }

    async fetch() {
        return await super.fetchResponse(`history/${this.itemId}/audio`, {});
    }
}

export class GetGeneratedItemsRequest extends ElevenlabsRequest {
    page_size;
    start_after_history_item_id;

    constructor(page_size, start_after_history_item_id) {
        super();
        this.page_size = page_size;
        this.start_after_history_item_id = start_after_history_item_id;
    }

    async fetch() {
        let query = `history?page_size=${this.page_size}`;
        if ( this.start_after_history_item_id != undefined) {
            query = `${query}&start_after_history_item_id=${this.start_after_history_item_id}`
        }
        let response = await super.fetchJson(query)
            .then(text => JSON.parse(text));

        return new GetGeneratedItemsResponse(response.history, response.last_history_item_id, response.has_more);
    }
}

export class GetGeneratedItemsResponse {
    history;
    last_history_item_id;
    has_more;

    constructor( history, last_history_item_id, has_more) {
        this.history = history;
        this.last_history_item_id = last_history_item_id;
        this.has_more = has_more;
    }
}

export class GetLastHistoryItemRequest extends ElevenlabsRequest {
    async fetch() {
        let response = await super.fetchJson('history?page_size=1')
            .then(text => JSON.parse(text));
        return response.last_history_item_id;
    }
}

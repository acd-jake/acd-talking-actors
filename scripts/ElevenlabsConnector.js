import { MODULE, FLAGS } from './constants.js';
import { localize } from './init.js';
import { GetUserDataRequest, GetVoicesRequest, GetVoiceSettingsRequest, TextToSpeechRequest } from './ElevenlabsApi/ElevenlabsRequests.js';

export class ElevenlabsConnector {
    subscriptionInfo;
    allVoices;

    async initializeMain() {
        if (this.HasApiKey) {
            await this.getVoices();
            await this.getUserdata();
        }
    }

    HasApiKey() {
        return game.settings.get(MODULE.ID, MODULE.APIKEY) !== undefined;
    }

    processChatMessage(chatlog, messageText, chatData) {
        const talkCommand = "talk";
        let messageData = messageText.match(`^/(${talkCommand}) (.*)$`);

        if (!messageData || messageData[1] != talkCommand) {
            // no chat command or wrong chat command found. Return for further processing
            return true;
        }

        messageText = messageData[2];

        if (!this.HasApiKey) {
            ui.notifications.error(localize("acd.ta.errors.noApiKey"));
            return false;
        }

        let voice_id;
        let settings;

        // do we have a voicename specified (e.g. "/talk [Dave] ...")? 
        // This will override the voice configured for the talking actor
        if (messageData = messageText.match("^\\[([a-zA-z0-9]+)\\] (.*)$")) {
            let voiceName = messageData[1];
            messageText = messageData[2];

            voice_id = this.allVoices.filter(obj => { return obj.name === voiceName })[0]?.voice_id;
        }
        // otherwise check if a voice is configured for the talking character
        else if (chatData && chatData.speaker && chatData.speaker.actor) {
            const moduleFlags = game.actors.get(chatData.speaker.actor).flags[MODULE.ID];
            voice_id = moduleFlags ? moduleFlags[FLAGS.VOICE_ID] : undefined;
            settings = moduleFlags ? moduleFlags[FLAGS.VOICE_SETTINGS] : undefined;
        }

        console.log(voice_id)

        if (voice_id) {
            this.textToSpeech(voice_id, messageText);
            this.postToChat(chatData, localize("acd.ta.chat.textTalked"), `<span class="acd-ta-talked">${messageText}</span>`);
        } else {
            ui.notifications.error(localize("acd.ta.errors.unknownVoice"));
            this.postToChat(chatData, ``, messageText);
        }
        return false;
    }

    postToChat(chatData, flavor, messageText) {
        let messageData = {
            flavor: flavor,
            user: chatData.user,
            speaker: chatData.speaker,
            type: CONST.CHAT_MESSAGE_TYPES.OOC,
            content: messageText,
        };
        ChatMessage.create(messageData, { chatBubble: true });
    }

    async getUserdata() {
        this.subscriptionInfo = await new GetUserDataRequest()
            .fetch();
    }

    async getVoices() {
        this.allVoices = await new GetVoicesRequest()
            .fetch();
    }

    async getVoiceSettings(voiceId) {
        return new GetVoiceSettingsRequest(voiceId).fetch();
    }

    async textToSpeech(voiceId, text) {
        let container = await new TextToSpeechRequest(voiceId, text).fetch();

        let chunks = await this.readChunks(container);
        game.socket.emit('module.' + MODULE.ID, { testarg: "Hello World", container: chunks })
        this.playSound(chunks);
    }

    async readChunks(container) {
        let reader = container.body.getReader();
        let chunks = [];
        while (true) {
            let { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }
        return chunks;
    }

    async playSound(chunks) {
        let blob = new Blob(chunks, { type: 'audio/mpeg' })
        let url = window.URL.createObjectURL(blob)
        this.playAudio(url);
    }

    playAudio(url) {
        AudioHelper.play({ src: url, volume: 1.0, loop: false }, false);
    }

    async playSample(voiceId) {
        let voice = this.allVoices.find(t => t.voice_id === voiceId);

        if (voice) {
            this.playAudio(voice.preview_url);
        }
    }
}

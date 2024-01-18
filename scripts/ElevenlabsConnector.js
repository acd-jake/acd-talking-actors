import { MODULE, FLAGS } from './constants.js';
import { localize } from './init.js';
import { GetUserDataRequest, GetVoicesRequest, GetVoiceSettingsRequest, TextToSpeechRequest } from './ElevenlabsApi/ElevenlabsRequests.js';

export class ElevenlabsConnector {
    subscriptionInfo;
    allVoices;

    async initializeMain() {
        if (this.hasApiKey()) {
            await this.getVoices();
            await this.getUserdata();
        }
    }

    hasApiKey() {
        return (game.settings.get(MODULE.ID, MODULE.APIKEY)?.length > 1)
              || (game.settings.get(MODULE.ID, MODULE.MASTERAPIKEY)?.length > 1);
    }

    processChatMessage(chatlog, messageText, chatData) {
        const talkCommand = "talk";
        let messageData = messageText.match(`^/(${talkCommand}) ((.|[\r\n])*)$`);

        if (!messageData || messageData[1] != talkCommand) {
            // no chat command or wrong chat command found. Return for further processing
            return true;
        }

        messageText = messageData[2];

        if (!this.hasApiKey()) {
            ui.notifications.error(localize("acd.ta.errors.noApiKey"));
            return false;
        }

        let voice_id;
        let settings;
        let speakerActor;
        
        // do we have a voicename specified (e.g. "/talk [Dave] ...")? 
        // This will override the voice configured for the talking actor
        if (messageData = messageText.match("^\\[([a-zA-z0-9]+)\\] ((.|[\r\n])*)$")) {
            let voiceName = messageData[1];
            messageText = messageData[2];

            voice_id = this.allVoices.filter(obj => { return obj.name === voiceName })[0]?.voice_id;
        }
        // otherwise check the optional module Yendor's Scene Actors
        else if (game.modules.get("yendors-scene-actors") 
            && game.modules.get("yendors-scene-actors").active
            && game.yendorsSceneActors.actorFocusId != null) {
            speakerActor = game.yendorsSceneActors.actorsDetail.find((t) => t._id == game.yendorsSceneActors.actorFocusId)
            chatData.speaker.actor = game.yendorsSceneActors.actorFocusId;
            chatData.speaker.alias = speakerActor.name;
        }
        // otherwise get the standard speaking actor
        else if (chatData && chatData.speaker && chatData.speaker.actor) {
            speakerActor = game.actors.get(chatData.speaker.actor);
        }

        // if no actor has been found yet, check if a narrating actor has been specified in the settings
        if (!speakerActor) {
            const narratingActorId = game.settings.get(MODULE.ID,MODULE.NARRATORACTOR);
            if (narratingActorId)
            {
                speakerActor = game.actors.find((a) => a._id == narratingActorId);
                chatData.speaker.actor = narratingActorId;
            }
        }

        // check if a voice is configured for the talking character
        ({ voice_id, settings } = this.getVoiceIdAndSettingsFromActor(speakerActor));

        // if no voice seeting have been found, try to use the settings for the narrating actor
        if (!voice_id) {
            const narratingActorId = game.settings.get(MODULE.ID,MODULE.NARRATORACTOR);
            if (narratingActorId) {
                speakerActor = game.actors.find((a) => a._id == narratingActorId);
                ({ voice_id, settings } = this.getVoiceIdAndSettingsFromActor(speakerActor));
            }
        }

        console.log(voice_id)

        if (voice_id) {
            this.textToSpeech(voice_id, messageText, settings);
            this.postToChat(chatData, localize("acd.ta.chat.textTalked"), `<span class="acd-ta-talked">${messageText}</span>`);
        } else {
            ui.notifications.error(localize("acd.ta.errors.unknownVoice"));
            this.postToChat(chatData,``, messageText);
        }
        return false;
    }

    getVoiceIdAndSettingsFromActor(speakerActor) {
        let voice_id;
        let settings;

        if (speakerActor) {
            const moduleFlags = speakerActor.flags[MODULE.ID];
            voice_id = moduleFlags ? moduleFlags[FLAGS.VOICE_ID] : undefined;
            settings = moduleFlags ? moduleFlags[FLAGS.VOICE_SETTINGS] : undefined;
        }
        return { voice_id, settings };
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

    async textToSpeech(voiceId, text, settings) {
        let container = await new TextToSpeechRequest(voiceId, text, settings).fetch();

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


import { MODULE, FLAGS } from './constants.js';
import { localize } from './init.js';
import { GetUserDataRequest, GetVoicesRequest, GetVoiceSettingsRequest, TextToSpeechRequest, GetLastHistoryItemRequest, ReplaySpeechRequest } from './ElevenlabsApi/ElevenlabsRequests.js';

export class ElevenlabsConnector {
    subscriptionInfo;
    allVoices;
    playedSounds;

    async initializeMain() {
        if (this.hasApiKey()) {
            await this.getVoices();
            await this.getUserdata();

            let that = this;

            $(document).on('click', '.acd-ta-replay', function () { that.replaySpeech($(this).data('item-id')); })
        }

        this.playedSounds =[];
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
        // otherwise check if an actor has been spefied for the talk command, e.g. "/talk {Actor} ..."
        else if (messageData = messageText.match("^{([a-zA-z0-9 ]+)} ((.|[\r\n])*)$")) {
            let actorId = messageData[1];
            messageText = messageData[2];
            speakerActor = game.actors.find((a) => a._id == actorId);
            if (!speakerActor) {
                speakerActor = game.actors.find((a) => a.name == actorId);
            }

            if (speakerActor) {
                chatData.speaker.actor = speakerActor._id;
                chatData.speaker.alias = speakerActor.name;
                // check if a voice is configured for the talking character
                ({ voice_id, settings } = this.getVoiceIdAndSettingsFromActor(speakerActor));
            }
        }
        // otherwise
        else {
            // check the optional module Conversation Hud
            speakerActor = this.tryGetSpeakerActorAndChatDataForConversationHud(chatData);

            // otherwise check the optional module Yendor's Scene Actors
            if (!speakerActor) {
                speakerActor = this.tryGetSpeakerActorAndChatDataForSceneActors(chatData);
            }

            // otherwise get the standard speaking actor
            if (!speakerActor) {
                speakerActor = this.tryGetStandardSpeakerActor(chatData);
            }

            // if no actor has been found yet, check if a narrating actor has been specified in the settings
            if (!speakerActor) {
                speakerActor = this.tryGetSpeakerActorForNarratingActor();
                if (speakerActor) {
                    chatData.speaker.actor = speakerActor;
                }
            }

            // check if a voice is configured for the talking character
            ({ voice_id, settings } = this.getVoiceIdAndSettingsFromActor(speakerActor));
        }

        // if no voice seeting have been found, try to use the settings for the narrating actor
        if (!voice_id) {
            speakerActor = this.tryGetSpeakerActorForNarratingActor();
            if (speakerActor) {
                ({ voice_id, settings } = this.getVoiceIdAndSettingsFromActor(speakerActor));
            }
        }

        console.log(voice_id)

        if (voice_id) {
            let chatMessagePromise = this.postToChat(chatData, `${localize("acd.ta.chat.textTalked")}`, `<span class="acd-ta-talked">${messageText}</span>`);
            this.textToSpeech(voice_id, messageText, settings, chatlog, chatMessagePromise);
        } else {
            ui.notifications.error(localize("acd.ta.errors.unknownVoice"));
            this.postToChat(chatData, ``, messageText);
        }
        return false;
    }

    tryGetSpeakerActorForNarratingActor() {
        let actor;
        const narratingActorId = game.settings.get(MODULE.ID, MODULE.NARRATORACTOR);
        if (narratingActorId) {
            actor = game.actors.find((a) => a._id == narratingActorId);
        }
        return actor;
    }

    tryGetStandardSpeakerActor(chatData) {
        let actor;
        if (chatData && chatData.speaker && chatData.speaker.actor) {
            actor = game.actors.get(chatData.speaker.actor);
        }
        return actor;
    }

    tryGetSpeakerActorAndChatDataForSceneActors(chatData) {
        let actor;
        let modulename = "yendors-scene-actors";
        if (this.isModuleActive(modulename)
            && game.yendorsSceneActors.actorFocusId != null) {
            actor = game.yendorsSceneActors.actorsDetail.find((t) => t._id == game.yendorsSceneActors.actorFocusId);
            chatData.speaker.actor = game.yendorsSceneActors.actorFocusId;
            if (actor.flags[modulename]?.isNameRevealed) {
                chatData.speaker.alias = actor.name;
            } else {
                chatData.speaker.alias = localize("acd.ta.chat.unknownSpeaker");
            }
        }
        return actor;
    }


    tryGetSpeakerActorAndChatDataForConversationHud(chatData) {
        let actor;
        let modulename = "conversation-hud";
        if (this.isModuleActive(modulename)
            && game.ConversationHud.conversationIsSpeakingAs == true
            && game.ConversationHud.activeConversation
            && game.ConversationHud.activeConversation.activeParticipant != -1) {
            let speakername = game.ConversationHud.activeConversation.participants[game.ConversationHud.activeConversation?.activeParticipant].name;
            actor = game.actors.find((t) => t.name == speakername);
            chatData.speaker.actor = actor;
            chatData.speaker.alias = speakername;
        }
        return actor;
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

    isModuleActive(modulename) {
        return game.modules.get(modulename)
            && game.modules.get(modulename).active;
    }

    postToChat(chatData, flavor, messageText) {
        let messageData = {
            flavor: flavor,
            user: chatData.user,
            speaker: chatData.speaker,
            type: CONST.CHAT_MESSAGE_TYPES.OOC,
            content: messageText,
        };
        return ChatMessage.create(messageData, { chatBubble: true });
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

    async textToSpeech(voiceId, text, settings, chatlog, chatMessagePromise) {
        let container = await new TextToSpeechRequest(voiceId, text, settings).fetch();

        let chunks = await this.readChunks(container);
        game.socket.emit('module.' + MODULE.ID, { testarg: "Hello World", container: chunks })

        let history_item_id = await new GetLastHistoryItemRequest().fetch();
        this.playSound(chunks, history_item_id);


        let chatMessage = await chatMessagePromise;
        await this.updateChatMessageFlavor(history_item_id, chatMessage, {showPlay:true});
        chatlog.updateMessage(chatMessage)
    }

    async updateChatMessageFlavor(history_item_id, chatMessage, options ={}) {
        let newflavor = `${localize("acd.ta.chat.textTalked")}`;

        if(options.showPlay){
            newflavor = newflavor.concat(`<span class="acd-ta-replay" data-item-id="${history_item_id}"><i class="fa-solid fa-repeat"></i></span>`);
        }

        await chatMessage.update({ 'flavor': newflavor });
        chatMessage;
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

    async playSound(chunks, itemId) {
        let blob = new Blob(chunks, { type: 'audio/mpeg' })
        let url = window.URL.createObjectURL(blob)
        let sound = this.playAudio(url);
        let resolvedSound = Promise.resolve(sound);
        resolvedSound.then( (soundInfo) => {
            console.log(soundInfo);
        })
    }

    async replaySpeech(itemId)
    {
        let container = await new ReplaySpeechRequest(itemId).fetch();

        let chunks = await this.readChunks(container);
        game.socket.emit('module.' + MODULE.ID, { testarg: "Hello World", container: chunks })
        this.playSound(chunks, itemId);

    }

    async playAudio(url) {
        return AudioHelper.play({ src: url, volume: 1.0, loop: false }, false);
    }

    async playSample(voiceId) {
        let voice = this.allVoices.find(t => t.voice_id === voiceId);

        if (voice) {
            this.playAudio(voice.preview_url);
        }
    }
}


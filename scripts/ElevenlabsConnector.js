import { MODULE, FLAGS } from './constants.js';
import { isModuleActive, localize } from './functions.js';

import { GetUserSubscriptionInfoRequest } from './ElevenlabsApi/UserRequests.js';
import { GetVoiceSettingsRequest, GetVoicesRequest } from './ElevenlabsApi/VoicesRequests.js';
import { TextToSpeechRequest } from './ElevenlabsApi/TextToSpeechRequests.js';
import { GetAudioFromHistoryItemRequest, GetLastHistoryItemRequest } from './ElevenlabsApi/HistoryRequests.js';
import { SoundGenerationRequest } from './ElevenlabsApi/SoundGenerationRequest.js';

export class ElevenlabsConnector {
    subscriptionInfo;
    allVoices;
    playedSounds;
    contextMenu;

    async initializeMain() {
        if (this.hasApiKey()) {
            await this.getVoices();
            await this.getUserdata();

            let that = this;

            $(document).on('click', '.acd-ta-replay', function () { that.replaySpeech($(this).data('item-id')); })
        }

        this.playedSounds = [];

        this.createJournalContextMenu();

    }

    hasApiKey() {
        return (game.settings.get(MODULE.ID, MODULE.APIKEY)?.length > 1)
            || (game.settings.get(MODULE.ID, MODULE.MASTERAPIKEY)?.length > 1);
    }

    processChatMessage(chatlog, messageText, chatData, postToChat = true) {
        const talkCommand = "talk";

        const talkSilentCommand = "talk-s";

        let messageData = messageText.match(`^/(${talkCommand}) ((.|[\r\n])*)$`);

        if (!messageData) {
            messageData = messageText.match(`^/(${talkSilentCommand}) ((.|[\r\n])*)$`);
        }

        if (!messageData
            || (messageData[1] != talkCommand
                && messageData[1] != talkSilentCommand)) {
            // no chat command or wrong chat command found. Return for further processing
            return true;
        }

        if (messageData[1] == talkSilentCommand) {
            postToChat = false;
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
            let chatMessagePromise;

            if (postToChat && game.settings.get(MODULE.ID, MODULE.POSTTOCHAT)) {
                chatMessagePromise = this.postToChat(chatData, `${localize("acd.ta.chat.textTalked")}`, `<span class="acd-ta-talked">${messageText}</span>`);
            }

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
        let modulename = MODULE.DEPENDENCY_SCENEACTORS;
        if (isModuleActive(modulename)
            && game.yendorsSceneActors.show
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
        let modulename = MODULE.DEPENDENCY_CONVERSATIONHUD;
        if (isModuleActive(modulename)
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

    postToChat(chatData, flavor, messageText) {
        // Ensure compatibility to Foundry prior generation 12
        let chatMessageType;
        if (game.data.release.generation < 12) {
            chatMessageType = CONST.CHAT_MESSAGE_TYPES.OOC;
        } else {
            chatMessageType = CONST.CHAT_MESSAGE_STYLES.OOC;
        }

        let messageData = {
            flavor: flavor,
            user: chatData.user,
            speaker: chatData.speaker,
            type: chatMessageType,
            content: messageText,
        };
        return ChatMessage.create(messageData, { chatBubble: true });
    }

    async getUserdata() {
        this.subscriptionInfo = await new GetUserSubscriptionInfoRequest()
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

        if (chatMessagePromise) {
            let chatMessage = await chatMessagePromise;
            await this.updateChatMessageFlavor(history_item_id, chatMessage, { showPlay: true });
            chatlog.updateMessage(chatMessage)
        }
    }

    async generateSoundEffect(text, settings, filename) {
        let response = await new SoundGenerationRequest(text, settings).fetch();

        if (!response.ok) {
            console.error(`Error: ${response.statusText}`);
            return;
        }

        return response;
    }


    async updateChatMessageFlavor(history_item_id, chatMessage, options = {}) {
        let newflavor = `${localize("acd.ta.chat.textTalked")}`;

        if (options.showPlay) {
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
        resolvedSound.then((soundInfo) => {
            console.log(soundInfo);
        })
    }

    async replaySpeech(itemId) {
        let container = await new GetAudioFromHistoryItemRequest(itemId).fetch();

        let chunks = await this.readChunks(container);
        game.socket.emit('module.' + MODULE.ID, { testarg: "Hello World", container: chunks })
        this.playSound(chunks, itemId);

    }

    async playAudio(url) {
        if (game.data.release.generation < 12) {
            return AudioHelper.play({ src: url, volume: 1.0, loop: false }, false);
        } else {
            return foundry.audio.AudioHelper.play({ src: url, volume: 1.0, loop: false }, false);
        }
    }

    async playSample(voiceId) {
        let voice = this.allVoices.find(t => t.voice_id === voiceId);

        if (voice) {
            this.playAudio(voice.preview_url);
        }
    }

    async showContextMenu(event) {
        const time = this.contextMenu.isOpen() ? 100 : 0;
        this.contextMenu.hide();
        setTimeout(() => {
            this.contextMenu.show(event.pageX, event.pageY);
        }, time);
    }

    createJournalContextMenu() {
        this.contextMenu = new ContextMenuNT({
            theme: 'default',
            items: [
                {
                    icon: 'comment',
                    name: localize("acd.ta.controls.readAloud"),
                    action: () => {
                        const selection = this.getSelectionText();
                        if (selection)
                            this.readAloud(selection, true);
                        this.contextMenu.hide();
                    },
                },
                {
                    icon: 'comment',
                    name: localize("acd.ta.controls.readAloudWithoutChat"),
                    action: () => {
                        const selection = this.getSelectionText();
                        if (selection)
                            this.readAloud(selection, false);
                        this.contextMenu.hide();
                    },
                },
                {
                    icon: 'comment',
                    name: localize("acd.ta.controls.readAloudCurrentActor"),
                    action: () => {
                        const selection = this.getSelectionText();
                        if (selection)
                            this.readAloudCurrentActor(selection, true);
                        this.contextMenu.hide();
                    },
                },
                {
                    icon: 'comment',
                    name: localize("acd.ta.controls.readAloudCurrentActorWithoutChat"),
                    action: () => {
                        const selection = this.getSelectionText();
                        if (selection)
                            this.readAloudCurrentActor(selection, false);
                        this.contextMenu.hide();
                    },
                },
                {
                    icon: 'cancel',
                    name: localize("acd.ta.controls.cancel"),
                    action: () => {
                        this.contextMenu.hide();
                    },
                },
            ],
        });
    }

    getSelectionText() {
        let html = '';
        const selection = window.getSelection();
        if (selection?.rangeCount && !selection.isCollapsed) {
            const fragments = selection.getRangeAt(0).cloneContents();
            const size = fragments.childNodes.length;
            for (let i = 0; i < size; i++) {
                if (fragments.childNodes[i].nodeType == fragments.TEXT_NODE)
                    html += fragments.childNodes[i].wholeText;
                else
                    html += fragments.childNodes[i].outerHTML;
            }
        }
        if (!html) {
        }
        return html;
    }

    readAloud(message, postToChat = true, options = {}) {

        let narrator = options.narrator;
        if (!narrator) {
            narrator = this.tryGetSpeakerActorForNarratingActor()?._id;
        }

        let command = this.createChatCommand(postToChat);
        message = `/${command} {${narrator}} ${message.replace(/\\n/g, '<br>')}`;

        ui.chat.processMessage(message);
    }

    createChatCommand(postToChat) {
        if (postToChat) {
            return "talk";
        } else {
            return "talk-s";
        }
    }

    readAloudCurrentActor(message, postToChat = true, options = {}) {
        let command = this.createChatCommand(postToChat);

        message = `/${command} ${message.replace(/\\n/g, '<br>')}`;

        ui.chat.processMessage(message);
    }
}


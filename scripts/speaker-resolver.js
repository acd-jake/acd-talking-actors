import TalkingActorsConstants from "./constants.js";
import { isModuleActive } from "./libs/functions.js";

export class SpeakerResolver {
    static resolveSpeakerActor(messageVoiceActor, chatData) {
        let speakerActor;

        // check if an actor has been spefied for the talk command, e.g. "/talk {Actor} ..."
        if (messageVoiceActor) {
            speakerActor = this.findSpeakerActorById(messageVoiceActor);
        }
        else {
            // check the Speaker info in the chat data
            speakerActor = this.findSpeakerActorByChatData(chatData);
        }

        if (!speakerActor) {
            speakerActor = this.tryGetSpeakerActorForNarratingActor();
            if (speakerActor) {
                speakerActor.isNarrator = true;
            }
        }
        return speakerActor;
    }

    static findSpeakerActorById(actorId) {
        if (!actorId) return null;

        let speakerActor = game.actors.get(actorId)
            ?? game.actors.find((a) => a.id == actorId || a._id == actorId);

        if (!speakerActor) {
            speakerActor = this.findUniqueActorByName(actorId);
        }
        return speakerActor;
    }

    static findUniqueActorByName(actorName) {
        if (!actorName) return null;

        const matchingActors = game.actors.filter((a) => a.name == actorName);
        return matchingActors.length === 1 ? matchingActors[0] : null;
    }

    static findSpeakerActorByTokenId(tokenId) {
        if (!tokenId || !canvas?.tokens) return null;

        const token = canvas.tokens.get(tokenId)
            ?? canvas.tokens.placeables.find((t) => t.id == tokenId || t.document?.id == tokenId);

        return token?.actor ?? token?.document?.actor ?? null;
    }

    static findSpeakerActorByChatData(chatData) {
        // first check for Conversation HUD active speaker
        let speakerActor = this.tryGetSpeakerActorAndChatDataForConversationHud();

        // otherwise check the optional module Yendor's Scene Actors for active speaker
        if (!speakerActor) {
            speakerActor = this.tryGetSpeakerActorForSceneActors();
        }

        // otherwise get the speaking actor from the chat data
        if (!speakerActor && chatData?.speaker?.token) {
            speakerActor = this.findSpeakerActorByTokenId(chatData.speaker.token);
        }

        if (!speakerActor && chatData?.speaker?.actor) {
            speakerActor = this.findSpeakerActorById(chatData.speaker.actor);
        }

        if (!speakerActor && chatData?.speaker?.alias) {
            speakerActor = this.findUniqueActorByName(chatData.speaker.alias);
        }
        return speakerActor;
    }


    static tryGetSpeakerActorForNarratingActor() {
        const narratingActorId = game.settings.get(TalkingActorsConstants.MODULE, TalkingActorsConstants.SETTINGS.NARRATORACTOR);
        if (narratingActorId) {
            return game.actors.find((a) => a._id == narratingActorId);
        }
        return null;
    }


    static tryGetSpeakerActorForSceneActors() {
        const modulename = TalkingActorsConstants.DEPENDENCIES.SCENEACTORS;
        if (!isModuleActive(modulename)) return null;

        if (game.yendorsSceneActors &&
            game.yendorsSceneActors.show &&
            game.yendorsSceneActors.actorsDetail) {
            return game.yendorsSceneActors.actorsDetail.find((t) => t._id == game.yendorsSceneActors.actorFocusId);
        }
        return null;
    }

    static isActorNameRevealed(actor) {
        let sceneActorsActor = this.tryGetSpeakerActorForSceneActors();
        if (sceneActorsActor
            && sceneActorsActor._id == actor._id) {
            const modulename = TalkingActorsConstants.DEPENDENCIES.SCENEACTORS;
            return sceneActorsActor.flags[modulename]?.isNameRevealed;
        }
        else {
            return true;
        }
    }

    static tryGetSpeakerActorAndChatDataForConversationHud() {
        const modulename = TalkingActorsConstants.DEPENDENCIES.CONVERSATIONHUD;
        if (!isModuleActive(modulename)) return null;

        if (game.ConversationHud.conversationIsSpeakingAs
            && game.ConversationHud.activeConversation
            && game.ConversationHud.activeConversation.activeParticipant != -1) {
            let speakername = game.ConversationHud.activeConversation.participants[game.ConversationHud.activeConversation.activeParticipant].name;

            return this.findUniqueActorByName(speakername);
        }
        return null;
    }
}

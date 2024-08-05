

export class TalkingActorsApi {
    async textToSpeech(voiceId, text, settings, chatlog, chatMessagePromise) {
        game.talkingactors.connector.textToSpeech(voiceId, text, settings, chatlog, chatMessagePromise);
    }

    tryGetSpeakerActorForNarratingActor() {
        return game.talkingactors.connector.tryGetSpeakerActorForNarratingActor();
    }

    tryGetStandardSpeakerActor(chatData) {
        return game.talkingactors.connector.tryGetStandardSpeakerActor(chatData);
    }

    getVoiceIdAndSettingsFromActor(speakerActor) {
        return game.talkingactors.connector.getVoiceIdAndSettingsFromActor(speakerActor);
    }

}

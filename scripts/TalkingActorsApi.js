

export class TalkingActorsApi {
    async textToSpeech(voiceId, text, settings, chatlog, chatMessagePromise) {
        game.talkingactors.connector.textToSpeech(voiceId, text, settings, chatlog, chatMessagePromise);
    }
    getVoiceIdAndSettingsFromActor(speakerActor) {
        return game.talkingactors.connector.getVoiceIdAndSettingsFromActor(speakerActor);
    }
    tryGetSpeakerActorForNarratingActor() {
        return game.talkingactors.connector.tryGetSpeakerActorForNarratingActor();
    }
    tryGetStandardSpeakerActor(chatData) {
        return this.tryGetStandardSpeakerActor(chatData);
    }

}

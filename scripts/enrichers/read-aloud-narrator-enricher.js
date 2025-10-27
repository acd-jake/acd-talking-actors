import TalkingActorsConstants from "../constants.js";

/**
 * ReadAloudNarratorEnricher
 *
 * Enricher that processes custom "ReadAloud" inline tags of the form:
 *   @Narrate{content}

 * The enricher extracts content, resolves the _id of the configured narrating actor, and
 * renders a clickable template that will invoke game.acdTalkingActors.readAloud(content, { narrator, inCharacter: false })
 * when clicked.
 */

export class ReadAloudNarratorEnricher {
    name;

    constructor() {
        this.name = 'Narrate';
    }

    label = "TA - Talking Actors - Narrate";
    pattern = /@(?:Narrate)(?:\{([\S\s]+)\})/g;
    enricher = async (match, options) => {
        var content = match[2];

        let narrator = game.talkingsactors.connect.tryGetSpeakerActorForNarratingActor()?._id;
        // if (narrator.match(/[a-zA-Z0-9]{16}/)) {
        //     // the narrator is specified by an Id... get his actor name
        //     narratorForDisplay = game.actors.get(narrator)?.name ?? narrator;            
        // }
        var onClick = `
          game.acdTalkingActors.readAloud(\`${content}\`,{narrator: \`${narrator}\`, inCharacter: false});
          `;

        var enricherData = {
            label: "TA - Talking Actors - Narrate Aloud",
            click: onClick,
            narrator: narrator,
            content: content,
        };

        var html = await renderTemplate(TalkingActorsConstants.PATHS.TEMPLATES + 'readaloud-table.hbs', enricherData);

        return $(html)[0];
    };
}

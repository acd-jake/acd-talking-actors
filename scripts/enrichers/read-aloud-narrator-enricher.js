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
        var content = match[1];

        var onClick = `
          game.acdTalkingActors.readAloudNarrator(\`${content}\`,{inCharacter: false});
          `;

        var enricherData = {
            label: "TA - Talking Actors - Narrate Aloud",
            click: onClick,
            content: content,
        };

        var html = await renderTemplate(TalkingActorsConstants.PATHS.TEMPLATES + 'readaloud-table.hbs', enricherData);

        return $(html)[0];
    };
}

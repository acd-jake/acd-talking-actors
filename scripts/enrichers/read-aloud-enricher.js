import TalkingActorsConstants from "../constants.js";

/**
 * ReadAloudEnricher
 *
 * Enricher that processes custom "ReadAloud" inline tags of the form:
 *   @ReadAloud{content}
 *
 * The enricher extracts the content, and invokes game.acdTalkingActors.readAloudCurrentActor(content)
 * when clicked.
 */
export class ReadAloudEnricher {
    name;

    constructor() {
        this.name = 'ReadAloud';
    }

    label = "TA - Talking Actors - Read Aloud";
    pattern = /@(?:ReadAloud)(?:\{([\S\s]+)\})/g;
    enricher = async (match, options) => {
        var content = match[1];

        var onClick = `
            game.acdTalkingActors.readAloudCurrentActor(\`${content}\`);
          `;

        var enricherData = {
            label: this.label,
            click: onClick,
            content: content,
        };

        var html = await renderTemplate(TalkingActorsConstants.PATHS.TEMPLATES + 'readaloud-table.hbs', enricherData);

        return $(html)[0];
    };
}


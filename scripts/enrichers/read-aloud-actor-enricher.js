import TalkingActorsConstants from "../constants.js";

/**
 * ReadAloudActorEnricher
 *
 * Enricher that processes custom "ReadAloud" inline tags of the form:
 *   @ReadAloud[narrator]{content}
 *
 * The enricher extracts the narrator and content, resolves a display name
 * for the narrator (if an actor ID is provided it will attempt to look up
 * the actor's name via game.actors), and renders a clickable template that
 * will invoke game.acdTalkingActors.readAloud(content, { narrator, inCharacter: true })
 * when clicked.
 */

export class ReadAloudActorEnricher {
    name;

    constructor() {
        this.name = 'ReadAloud';
    }

    label = "TA - Talking Actors - Read Aloud Actor";
    pattern = /@(?:ReadAloud)(?:\[([\S\s]+)\])(?:\{([\S\s]+)\})/g;
    enricher = async (match, options) => {
        var content = match[2];
        var narrator = match[1];
        let narratorForDisplay = narrator;
        if (narrator.match(/[a-zA-Z0-9]{16}/)) {
            // the narrator is specified by an Id... get his actor name
            narratorForDisplay = game.actors.get(narrator)?.name ?? narrator;
        }

        var onClick = `
          game.acdTalkingActors.readAloud(\`${content}\`,{narrator: \`${narrator}\`, inCharacter: true});
          `;

        var enricherData = {
            label: "TA - Talking Actors - Read Aloud for " + narratorForDisplay,
            click: onClick,
            narrator: narrator,
            content: content,
        };

        var html = await renderTemplate(TalkingActorsConstants.PATHS.TEMPLATES + 'readaloud-table.hbs', enricherData);

        return $(html)[0];
    };
}

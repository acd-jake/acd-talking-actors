import { MODULE } from './constants.js'

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
          game.talkingactors.connector.readAloudCurrentActor(\`${content}\`);
          `;

        var enricherData = {
            label: this.label,
            click: onClick,
            content: content,
        };

        var html = await renderTemplate(MODULE.TEMPLATEDIR + 'ta-readaloud-table.hbs', enricherData);

        return $(html)[0];
    };
}

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
          game.talkingactors.connector.readAloud(\`${content}\`,{narrator: \`${narrator}\`});
          `;

        var enricherData = {
            label: "TA - Talking Actors - Read Aloud for "+narratorForDisplay,
            click: onClick,
            narrator: narrator,
            content: content,
        };

        var html = await renderTemplate(MODULE.TEMPLATEDIR + 'ta-readaloud-table.hbs', enricherData);

        return $(html)[0];
    };
}

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
          game.talkingactors.connector.readAloud(\`${content}\`,{narrator: \`${narrator}\`});
          `;

        var enricherData = {
            label: "TA - Talking Actors - Narrate Aloud",
            click: onClick,
            narrator: narrator,
            content: content,
        };

        var html = await renderTemplate(MODULE.TEMPLATEDIR + 'ta-readaloud-table.hbs', enricherData);

        return $(html)[0];
    };
}

export class QuotedSpeechEnricher {
    name = "QuotedSpeech";
    label = "TA - Talking Actors - Quoted Speech";
    pattern = /"([^"\r\n<>]+)"|“([^”\r\n<>]+)”|„([^“\r\n<>]+)“|«([^»\r\n<>]+)»|»([^«\r\n<>]+)«/g;

    enricher = match => {
        const content = match.slice(1).find(Boolean);
        const wrapper = document.createElement("span");
        wrapper.append(document.createTextNode(match[0]));

        const button = document.createElement("button");
        button.type = "button";
        button.className = "acd-ta-quote-read-aloud";
        button.dataset.readAloudText = content;
        button.title = game.i18n.localize("acd.ta.controls.readQuotedSpeech");
        button.setAttribute("aria-label", button.title);
        button.innerHTML = '<i class="fas fa-volume-up" aria-hidden="true"></i>';

        wrapper.append(document.createTextNode(" "), button);
        return wrapper;
    };
}
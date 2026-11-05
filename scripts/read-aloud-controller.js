import TalkingActorsConstants from "./constants.js";
import { localize } from "./libs/functions.js";
import { ReadAloudEnricher } from "./enrichers/read-aloud-enricher.js";
import { ReadAloudNarratorEnricher } from "./enrichers/read-aloud-narrator-enricher.js";
import { ReadAloudActorEnricher } from "./enrichers/read-aloud-actor-enricher.js";
import { QuotedSpeechEnricher } from "./enrichers/quoted-speech-enricher.js";

export class ReadAloudController {
    constructor(module) {
        this.module = module;
        this.contextMenu = null;
        this.contextMenuText = null;
    }

    registerTextEditorEnrichers() {
        try {
            CONFIG.TextEditor.enrichers.push(
                new ReadAloudEnricher(),
                new ReadAloudActorEnricher(),
                new ReadAloudNarratorEnricher(),
                new QuotedSpeechEnricher()
            );

            document.addEventListener("click", event => {
                const target = event.target instanceof Element ? event.target : event.target?.parentElement;
                const button = target?.closest(".acd-ta-quote-read-aloud");
                if (!button) return;

                event.preventDefault();
                event.stopPropagation();
                const controlledTokens = canvas.tokens.controlled;
                const selectedToken = controlledTokens.length === 1 ? controlledTokens[0] : null;
                const speakerIdentifier = selectedToken
                    ? (selectedToken.document.actorLink
                        ? selectedToken.actor?.id ?? selectedToken.actor?._id
                        : selectedToken.document.id)
                    : null;
                this.module.readAloudCurrentActor(button.dataset.readAloudText, true, speakerIdentifier);
            });
        } catch (error) {
            this.module.logger.error("Failed to initialize generic enrichers", error);
        }

        foundry.applications.handlebars.loadTemplates([
            TalkingActorsConstants.PATHS.TEMPLATES + "readaloud-table.hbs",
        ]);
    }

    registerJournalSelectionContextMenu() {
        document.addEventListener("contextmenu", event => {
            const target = event.target instanceof Element ? event.target : event.target?.parentElement;
            const button = target?.closest(".acd-ta-quote-read-aloud");
            if (button) {
                this.contextMenuText = button.dataset.readAloudText;
                this.showContextMenu(event);
                return;
            }

            const selectionMenuEnabled = game.settings.get(
                TalkingActorsConstants.MODULE,
                TalkingActorsConstants.SETTINGS.ENABLE_SELECTION_CONTEXT_MENU,
            );
            if (selectionMenuEnabled && target?.closest(".journal-entry-pages, .editor-content")) {
                this.contextMenuText = null;
                this.showContextMenu(event);
            }
        });
    }

    injectTokenHudButtons(app, hudHtml, data) {
        const button = $(
            `<div class="control-icon talkingactors" data-tooltip="${localize("acd.ta.TokenHud.dialog.title")}"><i class="fas fa-comments"></i></div>`,
        );
        const leftColumns = hudHtml.getElementsByClassName?.("col left") ?? [];
        const controls = leftColumns.length > 0 ? leftColumns[leftColumns.length - 1] : hudHtml.firstChild;

        controls?.append(button[0]);

        button.on("click", async event => {
            event.preventDefault();
            event.stopPropagation();
            await this.showTokenHudReadAloudDialog(data);
        });

        const historyButton = document.createElement("div");
        historyButton.className = "control-icon talkingactors-history";
        historyButton.dataset.tooltip = game.i18n.localize("acd.ta.AudioHistory.open");
        historyButton.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i>';
        historyButton.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            const token = app?.object;
            const actorId = token?.actor?.id ?? token?.document?.actor?.id ?? data?.actorId ?? data?.actor?.id;
            this.module.openAudioHistory({ actorId });
        });
        controls?.append(historyButton);
    }

    async showTokenHudReadAloudDialog(data) {
        const content = await foundry.applications.handlebars.renderTemplate(
            TalkingActorsConstants.PATHS.TEMPLATES + "tokenhud-dialog.hbs",
            data,
        );

        new Dialog({
            title: game.i18n.localize("acd.ta.TokenHud.dialog.title"),
            content,
            buttons: {
                readaloud: {
                    icon: '<i class="fas fa-comments"></i>',
                    label: localize("acd.ta.TokenHud.withChat"),
                    callback: html => this.readAloudCallback(html, true),
                },
                readAloudWithoutChat: {
                    icon: '<i class="fas fa-comments"></i>',
                    label: localize("acd.ta.TokenHud.withoutChat"),
                    callback: html => this.readAloudCallback(html, false),
                },
                close: {
                    icon: '<i class="fas fa-cancel"></i>',
                    label: game.i18n.localize("Cancel"),
                },
            },
            default: "close",
        }).render(true);
    }

    async readAloudCurrentActor(content, postToChat = true, actorIdentifier = null) {
        const command = this.createChatCommand(postToChat);
        const speaker = actorIdentifier ? ` {${actorIdentifier}}` : "";
        const message = `/${command}${speaker} ${content.replace(/\\n/g, "<br>")}`;
        return ui.chat.processMessage(message);
    }

    async readAloudNarrator(content, _options = {}) {
        const message = `/narrate ${content.replace(/\\n/g, "<br>")}`;
        return ui.chat.processMessage(message);
    }

    async readAloud(content, postToChat = true, options = {}) {
        if (!options.narrator) {
            return this.readAloudNarrator(content, options);
        }

        const command = this.createChatCommand(postToChat);
        const message = `/${command} {${options.narrator}} ${content.replace(/\\n/g, "<br>")}`;
        return ui.chat.processMessage(message);
    }

    async readAloudCallback(html, postToChat) {
        const message = html.find("[name='readaloadtext']").first().val();
        const speaker = html.find("input[name='speaker']:checked").val();

        if (speaker === "narrator") {
            return this.readAloud(message, postToChat);
        }

        return this.readAloudCurrentActor(message, postToChat);
    }

    createChatCommand(postToChat) {
        return postToChat ? "talk" : "talk-s";
    }

    async showContextMenu(event) {
        event.preventDefault();
        const delay = this.contextMenu.isOpen() ? 100 : 0;
        this.contextMenu.hide();
        setTimeout(() => this.contextMenu.show(event.pageX, event.pageY), delay);
    }

    createJournalContextMenu() {
        this.contextMenu = new ContextMenuNT({
            theme: "default",
            items: [
                this.createReadAloudMenuItem("acd.ta.controls.readAloud", (selection) => this.readAloud(selection, true)),
                this.createReadAloudMenuItem("acd.ta.controls.readAloudWithoutChat", (selection) => this.readAloud(selection, false)),
                this.createReadAloudMenuItem("acd.ta.controls.readAloudCurrentActor", (selection) => this.readAloudCurrentActor(selection, true)),
                this.createReadAloudMenuItem("acd.ta.controls.readAloudCurrentActorWithoutChat", (selection) => this.readAloudCurrentActor(selection, false)),
                {
                    icon: "cancel",
                    name: game.i18n.localize("acd.ta.controls.cancel"),
                    action: () => this.contextMenu.hide(),
                },
            ],
        });
    }

    createReadAloudMenuItem(labelKey, action) {
        return {
            icon: "comment",
            name: game.i18n.localize(labelKey),
            action: () => {
                const selection = this.contextMenuText || this.getSelectionText();
                if (selection) action(selection);
                this.contextMenu.hide();
            },
        };
    }

    getSelectionText() {
        const selection = window.getSelection();
        if (!selection?.rangeCount || selection.isCollapsed) return "";

        const fragments = selection.getRangeAt(0).cloneContents();
        return Array.from(fragments.childNodes, node => {
            if (node.nodeType === Node.TEXT_NODE) return node.textContent;
            return node.outerHTML ?? node.textContent ?? "";
        }).join("");
    }
}
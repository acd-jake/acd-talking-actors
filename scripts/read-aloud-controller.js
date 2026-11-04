import TalkingActorsConstants from "./constants.js";
import { localize } from "./libs/functions.js";
import { ReadAloudEnricher } from "./enrichers/read-aloud-enricher.js";
import { ReadAloudNarratorEnricher } from "./enrichers/read-aloud-narrator-enricher.js";
import { ReadAloudActorEnricher } from "./enrichers/read-aloud-actor-enricher.js";

export class ReadAloudController {
    constructor(module) {
        this.module = module;
        this.contextMenu = null;
    }

    registerTextEditorEnrichers() {
        try {
            CONFIG.TextEditor.enrichers.push(
                new ReadAloudEnricher(),
                new ReadAloudActorEnricher(),
                new ReadAloudNarratorEnricher()
            );
        } catch (error) {
            this.module.logger.error("Failed to initialize generic enrichers", error);
        }

        foundry.applications.handlebars.loadTemplates([
            TalkingActorsConstants.PATHS.TEMPLATES + "readaloud-table.hbs",
        ]);
    }

    registerJournalSelectionContextMenu() {
        if (!game.settings.get(
            TalkingActorsConstants.MODULE,
            TalkingActorsConstants.SETTINGS.ENABLE_SELECTION_CONTEXT_MENU,
        )) return;

        document.addEventListener("contextmenu", event => {
            const target = event.target instanceof Element ? event.target : event.target?.parentElement;
            if (target?.closest(".journal-entry-pages, .editor-content")) {
                this.showContextMenu(event);
            }
        });
    }

    injectTokenHudButtons(_app, hudHtml, data) {
        const button = $(
            `<div class="control-icon talkingactors" data-tooltip="${localize("acd.ta.TokenHud.dialog.title")}"><i class="fas fa-comments"></i></div>`,
        );
        const leftColumns = hudHtml.getElementsByClassName?.("col left") ?? [];

        if (leftColumns.length > 0) {
            leftColumns[leftColumns.length - 1].append(button[0]);
        } else if (hudHtml.firstChild) {
            hudHtml.firstChild.append(button[0]);
        }

        button.on("click", async event => {
            event.preventDefault();
            event.stopPropagation();
            await this.showTokenHudReadAloudDialog(data);
        });
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

    async readAloudCurrentActor(content, postToChat = true) {
        const command = this.createChatCommand(postToChat);
        const message = `/${command} ${content.replace(/\\n/g, "<br>")}`;
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
                const selection = this.getSelectionText();
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
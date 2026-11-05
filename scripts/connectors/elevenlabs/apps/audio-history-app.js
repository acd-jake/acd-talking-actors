import { GetAudioFromHistoryItemRequest, GetGeneratedItemsRequest } from "../api/history-requests.js";
import { ELEVENLABS_CONSTANTS, ELEVENLABS_FLAGS } from "../constants.js";

export class AudioHistoryApp extends foundry.applications.api.HandlebarsApplicationMixin(
    foundry.applications.api.ApplicationV2,
) {
    static DEFAULT_OPTIONS = {
        id: "acd-ta-audio-history",
        classes: ["themed", "theme-light", "acd-ta-audio-history"],
        window: { title: "acd.ta.AudioHistory.title", resizable: true },
        position: { width: 820, height: 640 },
    };

    static PARTS = {
        content: { template: ELEVENLABS_CONSTANTS.TEMPLATEDIR + "audio-history.hbs" },
    };

    constructor(connector, options = {}) {
        super(options);
        this.connector = connector;
        this.typeFilter = options.typeFilter ?? "all";
        this.actorFilter = options.actorId ?? "";
        this.searchFilter = "";
        this.fromDateFilter = "";
        this.toDateFilter = "";
        this.speechHistory = [];
        this.historyCursor = null;
        this.hasMoreHistory = true;
        this.isLoadingHistory = false;
        this.historyLoaded = false;
        this.historyError = "";

        Hooks.on("dropCanvasData", (canvas, data) => {
            if (data?.type !== "acd-ta-audio-history" || data.kind !== "sound") return;
            if (!game.user.isGM) return false;

            this.createAmbientSoundFromDrop(canvas, data).catch(error => {
                this.connector.logger.error("Failed to create ambient sound from audio history:", error);
                ui.notifications.error(game.i18n.localize("acd.ta.AudioHistory.dropFailed"));
            });
            return false;
        });
    }

    openWith(options = {}) {
        this.typeFilter = options.typeFilter ?? "all";
        this.actorFilter = options.actorId ?? "";
        this.searchFilter = "";
        this.fromDateFilter = "";
        this.toDateFilter = "";
        this.speechHistory = [];
        this.historyCursor = null;
        this.hasMoreHistory = true;
        this.historyLoaded = false;
        this.render({ force: true });
    }

    async _prepareContext() {
        if (!this.historyLoaded) {
            this.historyLoaded = true;
            await this.loadMoreSpeechHistory();
        }

        return {
            entries: this.getEntries(),
            typeFilters: ["all", "speech", "sound"].map(value => ({
                value,
                label: game.i18n.localize(`acd.ta.AudioHistory.filter.${value}`),
                selected: this.typeFilter === value,
            })),
            actorFilters: [
                { id: "", name: game.i18n.localize("acd.ta.AudioHistory.filter.allActors") },
                ...game.actors.contents.map(actor => ({ id: actor.id, name: actor.name })),
            ].map(actor => ({ ...actor, selected: this.actorFilter === actor.id })),
            searchFilter: this.searchFilter,
            fromDateFilter: this.fromDateFilter,
            toDateFilter: this.toDateFilter,
            hasMoreHistory: this.hasMoreHistory && this.connector.hasApiKey(),
            historyError: this.historyError,
        };
    }

    async _onRender(context, options) {
        await super._onRender(context, options);

        const root = this.element;
        const search = root.querySelector("[data-history-search]");
        const typeFilters = root.querySelectorAll("[data-history-type-filter]");
        const actorFilter = root.querySelector("[data-history-actor]");
        const fromDateFilter = root.querySelector("[data-history-from-date]");
        const toDateFilter = root.querySelector("[data-history-to-date]");

        search?.addEventListener("input", () => {
            this.searchFilter = search.value;
            this.applyFilters();
        });
        typeFilters.forEach(button => button.addEventListener("click", () => {
            this.typeFilter = button.dataset.historyTypeFilter;
            typeFilters.forEach(filterButton => {
                filterButton.setAttribute("aria-pressed", String(filterButton === button));
            });
            this.applyFilters();
        }));
        actorFilter?.addEventListener("change", () => {
            this.actorFilter = actorFilter.value;
            this.applyFilters();
        });
        fromDateFilter?.addEventListener("change", () => {
            this.fromDateFilter = fromDateFilter.value;
            this.applyFilters();
        });
        toDateFilter?.addEventListener("change", () => {
            this.toDateFilter = toDateFilter.value;
            this.applyFilters();
        });

        root.querySelectorAll("[data-history-action]").forEach(button => {
            button.addEventListener("click", event => this.onHistoryAction(event));
        });
        root.querySelectorAll("[data-history-entry]").forEach(entry => {
            entry.draggable = game.user.isGM && entry.dataset.kind === "sound";
            if (!entry.draggable) return;

            entry.title = game.i18n.localize("acd.ta.AudioHistory.dragToScene");
            entry.addEventListener("dragstart", event => {
                const payload = {
                    type: "acd-ta-audio-history",
                    kind: "sound",
                    src: entry.dataset.src,
                };
                event.dataTransfer.effectAllowed = "copy";
                event.dataTransfer.setData("text/plain", JSON.stringify(payload));
            });
        });
        root.querySelector("[data-history-load-more]")?.addEventListener("click", async event => {
            event.currentTarget.disabled = true;
            await this.loadMoreSpeechHistory();
            this.render({ force: true });
        });

        this.applyFilters();
    }

    async loadMoreSpeechHistory() {
        if (this.isLoadingHistory || !this.hasMoreHistory) return;
        if (!this.connector.hasApiKey()) {
            this.historyError = game.i18n.localize("acd.ta.AudioHistory.noApiKey");
            return;
        }

        this.isLoadingHistory = true;
        this.historyError = "";
        try {
            const response = await new GetGeneratedItemsRequest(this.connector, 50, this.historyCursor).fetch();
            this.speechHistory.push(...(response.history ?? []));
            this.historyCursor = response.last_history_item_id ?? null;
            this.hasMoreHistory = Boolean(response.has_more);
        } catch (error) {
            this.historyError = game.i18n.localize("acd.ta.AudioHistory.loadFailed");
            this.connector.logger.error("Failed to load audio history:", error);
        } finally {
            this.isLoadingHistory = false;
        }
    }

    getEntries() {
        const speechEntries = this.speechHistory.map(item => {
            const chatMessage = game.messages.contents.find(message =>
                message.flavor?.includes(`data-item-id="${item.history_item_id}"`),
            );
            const messageContent = new DOMParser().parseFromString(chatMessage?.content ?? "", "text/html");
            const chatDirection = messageContent.querySelector(".acd-ta-direction")?.textContent?.trim() ?? "";
            const chatSpeechText = messageContent.querySelector(".acd-ta-talked")?.textContent?.trim() ?? "";
            const historyText = item.text ?? "";
            const directionSeparator = " . . . . . ";
            const directionSeparatorIndex = historyText.indexOf(directionSeparator);
            const historyDirection = directionSeparatorIndex >= 0
                ? historyText.slice(0, directionSeparatorIndex).trim()
                : "";
            const speechText = chatSpeechText || (directionSeparatorIndex >= 0
                ? historyText.slice(directionSeparatorIndex + directionSeparator.length).trim()
                : historyText);
            const direction = chatDirection || historyDirection;
            const matchingActors = game.actors.contents.filter(candidate =>
                candidate.flags?.[this.connector.mainModule.id]?.[ELEVENLABS_FLAGS.VOICE_ID] === item.voice_id,
            );
            const actor = game.actors.get(chatMessage?.speaker?.actor ?? item.actor_id ?? item.character_id) ??
                (matchingActors.length === 1 ? matchingActors[0] : null);
            const date = Number(item.date_unix);
            return {
                id: item.history_item_id,
                kind: "speech",
                kindLabel: game.i18n.localize("acd.ta.AudioHistory.filter.speech"),
                title: speechText || game.i18n.localize("acd.ta.AudioHistory.untitled"),
                direction,
                description: "",
                actorId: actor?.id ?? "",
                actorName: actor?.name ?? "",
                voiceName: item.voice_name ?? item.voice_id ?? "",
                modelName: item.model_id ?? "",
                dateValue: Number.isFinite(date) ? date * 1000 : 0,
                dateLabel: this.formatDate(date * 1000),
                dateFilterValue: this.formatDateInput(date * 1000),
                searchText: [speechText, direction, actor?.name, item.voice_name, item.voice_id, item.model_id].filter(Boolean).join(" ").toLowerCase(),
            };
        });

        return [...speechEntries, ...this.getSoundEntries()]
            .sort((left, right) => right.dateValue - left.dateValue);
    }

    getSoundEntries() {
        const playlistName = game.settings.get(this.connector.mainSettingsId, ELEVENLABS_CONSTANTS.SOUNDEFFECTPLAYLIST);
        const playlist = playlistName ? game.playlists.find(candidate => candidate.name === playlistName) : null;
        const sounds = playlist?.sounds?.contents ?? [];

        return sounds.map(sound => {
            const createdAt = Number(sound._stats?.createdTime ?? sound._source?._stats?.createdTime ?? 0);
            return {
                id: sound.id,
                kind: "sound",
                kindLabel: game.i18n.localize("acd.ta.AudioHistory.filter.sound"),
                title: sound.name,
                description: sound.description ?? "",
                actorId: "",
                actorName: "",
                voiceName: "",
                modelName: playlist.name,
                dateValue: createdAt,
                dateLabel: this.formatDate(createdAt),
                dateFilterValue: this.formatDateInput(createdAt),
                src: sound.path,
                searchText: [sound.name, sound.description, playlist.name].filter(Boolean).join(" ").toLowerCase(),
            };
        });
    }

    formatDate(timestamp) {
        if (!Number.isFinite(timestamp) || timestamp <= 0) return "";
        return new Intl.DateTimeFormat(game.i18n.lang ?? "en", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(new Date(timestamp));
    }

    formatDateInput(timestamp) {
        if (!Number.isFinite(timestamp) || timestamp <= 0) return "";
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    applyFilters() {
        const query = this.searchFilter.trim().toLowerCase();
        let visibleCount = 0;
        for (const entry of this.element.querySelectorAll("[data-history-entry]")) {
            const matchesType = this.typeFilter === "all" || entry.dataset.kind === this.typeFilter;
            const matchesActor = !this.actorFilter || entry.dataset.actorId === this.actorFilter;
            const matchesSearch = !query || entry.dataset.search.includes(query);
            const date = entry.dataset.date;
            const hasDateRange = this.fromDateFilter || this.toDateFilter;
            const matchesDate = !hasDateRange || (date &&
                (!this.fromDateFilter || date >= this.fromDateFilter) &&
                (!this.toDateFilter || date <= this.toDateFilter));
            entry.hidden = !(matchesType && matchesActor && matchesSearch && matchesDate);
            if (!entry.hidden) visibleCount++;
        }

        const emptyState = this.element.querySelector("[data-history-empty]");
        if (emptyState) emptyState.hidden = visibleCount > 0;
    }

    async onHistoryAction(event) {
        const button = event.currentTarget;
        const entry = button.closest("[data-history-entry]");
        if (!entry) return;

        button.disabled = true;
        try {
            if (button.dataset.historyAction === "play") {
                if (entry.dataset.kind === "speech") {
                    const response = await new GetAudioFromHistoryItemRequest(this.connector, entry.dataset.id).fetch();
                    const chunks = await this.connector.readChunks(response);
                    this.connector.playSound(chunks);
                } else {
                    await this.connector.playAudio(entry.dataset.src);
                }
            } else if (button.dataset.historyAction === "broadcast") {
                if (entry.dataset.kind === "speech") {
                    await this.connector.replaySpeech(entry.dataset.id);
                } else {
                    await this.connector.broadcastAudio(entry.dataset.src, entry.querySelector("[data-history-title]")?.textContent ?? "");
                }
            } else {
                await this.downloadEntry(entry);
            }
        } catch (error) {
            this.connector.logger.error("Audio history action failed:", error);
            ui.notifications.error(game.i18n.localize("acd.ta.AudioHistory.actionFailed"));
        } finally {
            button.disabled = false;
        }
    }

    async createAmbientSoundFromDrop(canvas, data) {
        if (!game.user.isGM || !canvas?.scene || !Number.isFinite(data.x) || !Number.isFinite(data.y)) return;
        if (!data.src) throw new Error("Audio source path is missing.");

        await canvas.scene.createEmbeddedDocuments("AmbientSound", [{
            x: data.x,
            y: data.y,
            path: data.src,
            radius: 20,
            volume: 0.5,
            repeat: false,
            walls: false,
            easing: true,
            hidden: false,
        }]);
        ui.notifications.info(game.i18n.localize("acd.ta.AudioHistory.ambientCreated"));
    }

    async downloadEntry(entry) {
        let response;
        let filename;
        if (entry.dataset.kind === "speech") {
            response = await new GetAudioFromHistoryItemRequest(this.connector, entry.dataset.id).fetch();
            filename = `${entry.querySelector("[data-history-title]")?.textContent || "speech"}.mp3`;
        } else {
            response = await fetch(entry.dataset.src);
            if (!response.ok) throw new Error(`Audio download failed with status ${response.status}`);
            const extension = entry.dataset.src.split("?")[0].match(/\.([a-z0-9]{2,5})$/i)?.[1] ?? "mp3";
            filename = `${entry.querySelector("[data-history-title]")?.textContent || "sound-effect"}.${extension}`;
        }

        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement("a");
        link.href = url;
        link.download = filename.replace(/[\\/:*?"<>|]/g, "_");
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}
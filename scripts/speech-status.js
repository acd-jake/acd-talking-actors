import { localize } from "./libs/functions.js";

const MODULE_ID = "acd-talking-actors";
const FLAG = "speechStatus";
const STAGES = ["preparing", "receiving", "starting"];
const STATUS_TIMEOUT = 5 * 60_000;
const FAILURE_TIMEOUT = 8_000;

const readFlag = message => message.getFlag?.(MODULE_ID, FLAG) ?? message.flags?.[MODULE_ID]?.[FLAG];

function isVisible(snapshot, now = Date.now()) {
    if (!snapshot || typeof snapshot.requestId !== "string") return false;
    if (!Number.isFinite(snapshot.startedAt) || !Number.isFinite(snapshot.updatedAt)) return false;
    if (snapshot.stage === "failed") return now - snapshot.updatedAt < FAILURE_TIMEOUT;
    return STAGES.includes(snapshot.stage) && now - snapshot.startedAt < STATUS_TIMEOUT;
}

/** Shows a transient "preparing speech" line beneath chat messages; never alters message content. */
export class SpeechStatus {
    constructor(logger) {
        this.logger = logger;
        this.jobs = new Map();
        this.views = new Set();
        this.hooks = [];
        this.timer = null;
    }

    registerHooks() {
        if (this.hooks.length) return;
        this.hooks.push(["renderChatMessageHTML", Hooks.on("renderChatMessageHTML", (message, html) => this.render(message, html))]);
        this.hooks.push(["updateChatMessage", Hooks.on("updateChatMessage", message => {
            for (const view of [...this.views]) {
                if (view.messageId === message.id) this.render(message, view.root);
            }
        })]);
        this.hooks.push(["deleteChatMessage", Hooks.on("deleteChatMessage", message => {
            for (const view of [...this.views]) {
                if (view.messageId === message.id) this.removeView(view);
            }
        })]);
    }

    destroy() {
        for (const [name, id] of this.hooks) Hooks.off(name, id);
        this.hooks = [];
        clearInterval(this.timer);
        this.timer = null;
        for (const view of [...this.views]) this.removeView(view);
        this.jobs.clear();
    }

    start() {
        const bytes = new Uint8Array(8);
        globalThis.crypto.getRandomValues(bytes);
        const now = Date.now();
        const state = {
            requestId: Array.from(bytes, b => b.toString(16).padStart(2, "0")).join(""),
            stage: "preparing",
            startedAt: now,
            updatedAt: now,
        };
        const job = {
            state,
            message: null,
            writes: Promise.resolve(),
            snapshot: () => ({ ...state }),
            attach: message => {
                job.message = message;
                return this.write(job);
            },
            update: stage => {
                if (STAGES.indexOf(stage) <= STAGES.indexOf(state.stage)) return Promise.resolve();
                state.stage = stage;
                state.updatedAt = Date.now();
                return this.write(job);
            },
            finish: (stage = "complete") => {
                if (!STAGES.includes(state.stage)) return Promise.resolve();
                state.stage = stage;
                state.updatedAt = Date.now();
                return this.write(job).finally(() => setTimeout(() => this.jobs.delete(state.requestId), FAILURE_TIMEOUT));
            },
        };
        this.jobs.set(state.requestId, job);
        return job;
    }

    write(job) {
        const message = job.message;
        if (!message) return Promise.resolve();
        const snapshot = job.snapshot();
        // Serialized so a slow early write cannot overwrite a later stage.
        job.writes = job.writes
            .then(() => message.update({ [`flags.${MODULE_ID}.${FLAG}`]: snapshot }))
            .catch(error => this.logger?.warn?.("Unable to update speech status:", error));
        return job.writes;
    }

    render(message, html) {
        const root = html?.querySelectorAll ? html : html?.[0];
        if (!root) return;
        for (const view of [...this.views]) if (view.root === root) this.removeView(view);
        if (message.isContentVisible === false) return;

        const snapshot = readFlag(message);
        if (!isVisible(snapshot)) return;

        const doc = root.ownerDocument;
        const row = doc.createElement("div");
        row.className = "acd-ta-speech-status";
        row.setAttribute("role", "status");
        row.setAttribute("aria-live", "polite");
        const label = doc.createElement("span");
        label.className = "acd-ta-speech-status-label";
        const elapsed = doc.createElement("span");
        elapsed.className = "acd-ta-speech-status-elapsed";
        elapsed.setAttribute("aria-hidden", "true");
        row.append(label, elapsed);
        if (snapshot.stage !== "failed") {
            const bar = doc.createElement("span");
            bar.className = "acd-ta-speech-status-bar";
            bar.setAttribute("aria-hidden", "true");
            row.append(bar);
        }
        row.dataset.stage = snapshot.stage;
        label.textContent = localize(`acd.ta.speechStatus.${snapshot.stage}`);
        root.append(row);

        const view = { root, row, elapsed, snapshot, messageId: message.id };
        this.views.add(view);
        this.updateElapsed(view);
        this.ensureTimer();
    }

    updateElapsed(view) {
        if (view.snapshot.stage === "failed") {
            view.elapsed.hidden = true;
            return;
        }
        const seconds = Math.max(0, Math.floor((Date.now() - view.snapshot.startedAt) / 1000));
        view.elapsed.textContent = game.i18n.format("acd.ta.speechStatus.elapsed", { seconds });
    }

    ensureTimer() {
        if (this.timer !== null) return;
        this.timer = setInterval(() => {
            for (const view of [...this.views]) {
                if (!view.row.isConnected || !isVisible(view.snapshot)) this.removeView(view);
                else this.updateElapsed(view);
            }
            if (!this.views.size) {
                clearInterval(this.timer);
                this.timer = null;
            }
        }, 1000);
    }

    removeView(view) {
        view.row.remove();
        this.views.delete(view);
    }
}

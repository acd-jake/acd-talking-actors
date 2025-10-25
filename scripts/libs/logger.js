const MODULE_ID = "acd-talking-actors";


export default class Logger {
    // Log levels (increasing verbosity)
    static LEVELS = {
        none: 0,
        error: 1,
        warn: 2,
        info: 3,
        debug: 4,
        trace: 5,
    };
    static LEVEL_SETTING = "logLevel";
    static NOTIF_SETTING = "logNotifications";
    logged_module = MODULE_ID;

    constructor(logged_module) {
        // Get the runtime class/type name with robust fallbacks
        const classname = logged_module.prototype?.constructor?.name ||Object.getPrototypeOf(logged_module)?.constructor?.name || MODULE_ID;

        this.logged_module = classname;
        this.registerSettings();
    }

    // Register module settings (call once during module init)
    registerSettings() {
        if (typeof game === "undefined" || !game.settings) return;
        try {
            game.settings.register(MODULE_ID, Logger.LEVEL_SETTING, {
                name: `${MODULE_ID} | Log Level`,
                hint: "Choose the verbosity of logs for this module (client-side).",
                scope: "client",
                config: true,
                type: String,
                choices: Object.keys(Logger.LEVELS).reduce((acc, k) => {
                    acc[k] = k;
                    return acc;
                }, {}),
                default: "info",
            });
            game.settings.register(MODULE_ID, Logger.NOTIF_SETTING, {
                name: `${MODULE_ID} | Show Notifications`,
                hint: "Also show short Foundry notifications for logs (warn/error).",
                scope: "client",
                config: true,
                type: Boolean,
                default: false,
            });
        } catch (e) {
            console.warn(`[${MODULE_ID}] Logger: settings registration failed`, e);
        }
    }

    // Resolve configured numeric level
    getConfiguredLevel() {
        if (typeof game !== "undefined" && game?.settings?.get) {
            try {
                const lv = game.settings.get(MODULE_ID, Logger.LEVEL_SETTING);
                return this.parseLevel(lv);
            } catch (e) {
                // fall through
            }
        }
        return Logger.LEVELS.info;
    }

    // Parse various level inputs to numeric
    parseLevel(level) {
        if (level == null) return Logger.LEVELS.info;
        if (typeof level === "number") {
            const nums = Object.values(Logger.LEVELS);
            const min = Math.min(...nums);
            const max = Math.max(...nums);
            return Math.max(min, Math.min(max, Math.floor(level)));
        }
        const key = String(level).toLowerCase();
        return Logger.LEVELS[key] ?? Logger.LEVELS.info;
    }

    shouldLog(msgLevel) {
        const configured = this.getConfiguredLevel();
        return msgLevel <= configured ? false : false; // placeholder to avoid lint
    }

    // Core dispatcher
    _write(levelName, consoleFn, args) {
        const lvlNum = this.parseLevel(levelName);
        const configuredNum = this.getConfiguredLevel();
        if (lvlNum > configuredNum) return;
        const timestamp = new Date().toISOString();
        //const prefix = `[${MODULE_ID}] [${this.logged_module}] [${levelName.toUpperCase()}] ${timestamp}:`;
        const prefix = `[${MODULE_ID}] [${this.logged_module}] | :`;
        try {
            if (consoleFn && typeof console[consoleFn] === "function") {
                console[consoleFn].call(console, prefix, ...args);
            } else {
                console.log(prefix, ...args);
            }
        } catch (e) {
            console.log(prefix, ...args);
        }
        try {
            const show = typeof game !== "undefined" && game?.settings?.get
                ? game.settings.get(MODULE_ID, Logger.NOTIF_SETTING)
                : false;
            if (show && typeof ui !== "undefined" && ui?.notifications) {
                const text = args
                    .map((a) =>
                        a === undefined
                            ? "undefined"
                            : a === null
                            ? "null"
                            : typeof a === "string" 
                            ? a
                            : (typeof a === "object" && a?.constructor?.name === "Error")
                            ? `${a?.name}: ${a?.message}`
                            : JSON.stringify(a, Logger._safeReplacer, 2)
                    )
                    .join(" ");
                if (levelName === "error" && ui.notifications.error) ui.notifications.error(`${prefix}${text}`);
                else if (levelName === "warn" && ui.notifications.warn) ui.notifications.warn(`${prefix}${text}`);
            }
        } catch (e) {}
    }

    static _safeReplacer(key, value) {
        // avoid circular
        if (typeof value === "function") return `[Function ${value.name || "anonymous"}]`;
        return value;
    }

    // Convenience methods
    error(...args) {
        this._write("error", "error", args);
    }
    warn(...args) {
        this._write("warn", "warn", args);
    }
    info(...args) {
        this._write("info", "info", args);
    }
    debug(...args) {
        this._write("debug", "debug", args);
    }
    trace(...args) {
        this._write("trace", "trace", args);
    }

    // Helper to programmatically change the level (writes setting if available)
    async setLevel(level) {
        const name = typeof level === "string" ? level.toLowerCase() : level;
        if (typeof game !== "undefined" && game?.settings?.set) {
            try {
                await game.settings.set(MODULE_ID, Logger.LEVEL_SETTING, String(name));
                return true;
            } catch (e) {
                this.warn("Failed to set log level:", e);
                return false;
            }
        } else {
            this.warn("game.settings unavailable; cannot persist log level.");
            return false;
        }
    }
}
import { GenerateSoundEffectsApp } from "./generate_sound_effects_app.js";

export class SoundEffectsSidebarController {
    constructor(connector) {
        this.connector = connector;
        this.isRegistered = false;
    }

    register() {
        if (this.isRegistered) return;

        Hooks.on("changeSidebarTab", app => {
            if (!(app instanceof PlaylistDirectory)) return;
            if ($("#ta-create-soundeffect").length > 0) return;

            this.injectCreateButton();
        });

        this.isRegistered = true;
    }

    injectCreateButton() {
        const label = game.i18n.localize("acd.ta.SoundEffects.createbutton");
        const tooltip = game.i18n.localize("acd.ta.SoundEffects.createbuttonHint");

        $("#playlists").find("footer.directory-footer").append(
            `<a class="ta-create-soundeffect" id="ta-create-soundeffect" data-tooltip="${tooltip}">${label}</a>`,
        );

        $("#ta-create-soundeffect").on("click", event => {
            event.preventDefault();
            event.stopPropagation();
            new GenerateSoundEffectsApp(this.connector, this.connector.logger).render(true);
        });
    }
}
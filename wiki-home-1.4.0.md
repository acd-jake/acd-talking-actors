# Talking Actors

## Overview

`Talking Actors` connects Foundry VTT chat and journal content to a text-to-speech (TTS) connector. Assign voices to actors, narrate text without an actor, read journal passages aloud, and replay generated audio. The module includes an ElevenLabs connector and an interface for adding connectors for other providers.

## Features

- Assign a voice and provider-specific delivery settings to each actor.
- Resolve speakers from the active chat speaker, compatible modules, or a narrating actor.
- Use `/talk`, `/talk-s`, `/narrate`, and optionally automatic `/ic` speech.
- Read journal text aloud using inline enrichers, quoted-speech buttons, or a selection context menu.
- Browse, filter, replay, broadcast, and download generated ElevenLabs audio.
- Place generated sound effects in a scene as ambient audio.
- Use the included ElevenLabs connector or add another TTS connector.
- Use English and German localization.

## Installation

1. Install through Foundry's module manager or manually using the [latest manifest](https://github.com/acd-jake/acd-talking-actors/releases/latest/download/module.json).
2. Enable `Talking Actors` in your world. The bundled ElevenLabs connector is registered with the module.
3. In **Game Settings > Configure Settings**, select the active connector and provide an ElevenLabs API key if you use ElevenLabs.
4. Open an actor's voice settings and choose a voice before trying a speech command.

For a first check, send `/talk This is a test.` in chat. If chat text is posted but no audio plays, check the selected connector, API key, browser console, and Foundry audio output.

## Configuration

### Module settings

The module's world settings control how speech is selected and displayed:

- **Allow Users**: Let non-GM users access module features. When disabled, the GM can still use them.
- **Narrating Actor**: Choose an actor whose voice is used for `/narrate`, when no other speaker is resolved, and as a fallback for actors without usable voice settings.
- **Fallback Voice**: Choose a connector voice for cases where no usable actor or narrator voice can be resolved. If you do not choose one, the first available connector voice is used.
- **Enable Context Menu On Selected Text**: Allow selected text in journal pages to be read aloud from a right-click context menu.
- **Post Spoken Text To Chat**: Post spoken text to chat in addition to generating audio. `/talk-s` always suppresses the chat post.
- **Automatically Read In-Character Chat**: Send `/ic` messages through TTS automatically.

The active connector supplies its own settings. For ElevenLabs, configure an API key in the module settings. A client API key is private to that client; a GM can configure a shared master key for clients without their own key. ElevenLabs also provides settings for generated sound-effect storage and the default voice model and language.

### Actor voices

Open the voice settings from the actor sheet header or the actor directory's context menu. Select a voice and, when supported by the connector, adjust its model, language, and delivery settings. These options are supplied by the active connector, so they depend on the provider.

If a token is linked to an actor, the actor's voice settings apply. Voice settings can also be stored on an unlinked token document, independently of any actor. For example, several unlinked guards in the same scene can each have a different voice.
If a token is linked to an actor, the actor's voice settings apply. Voice settings can also be stored on an unlinked token document, independently of any actor. For example, several unlinked guards in the same scene can each have a different voice.

> **New in version 1.1.0**
>
> Unlinked tokens can keep voice settings on the token itself. Linking a token to an actor makes the actor's voice settings take precedence; unlinking it makes the token's saved settings usable again.

### Narrator and fallback voice

Set a **Narrating Actor** when you want narration to have a consistent character voice. Configure that actor's voice in the actor voice settings. Use `/narrate` to speak with it, even when a different token is the active chat speaker.

For ordinary `/talk` messages, the narrating actor is tried when no speaker is found or the speaker has no usable voice. If no narrator actor is configured, or it has no usable voice, the fallback voice is used. A fallback voice is a connector voice and does not require a separate actor.

> **New in version 1.5.0 (unreleased)**
>
> A configurable fallback voice can be selected directly from the active connector's available voices. The first available voice is the default when no selection has been saved.

## Usage

### Chat commands and speaker selection

The basic command is `/talk` followed by the text:

```text
/talk Today is a good day.
```

The module resolves the speaker in this order:

1. A voice named in square brackets, if supplied.
2. An actor named in curly braces, if supplied; otherwise the active chat speaker. Compatible Conversation HUD and Yendor's Scene Actors integrations can provide the active speaker.
3. The narrating actor, when no speaker is found or the speaker has no usable voice.
4. The configured fallback voice, or the connector's first available voice.

Use the connector's voice name in square brackets. Use an actor name or document ID in curly braces. An explicit voice takes precedence over actor voice settings.

```text
/talk [Matilda] Hello there.
/talk {Jessie Walker} Nice to meet you.
/talk [Matilda] {Jessie Walker} Welcome aboard.
```

If no actor is specified, the module uses the active chat speaker when available. For example, `/talk The door creaks open.` uses the actor currently speaking in chat. If no speaker can be resolved, the narrator and then the fallback voice are tried.

Use `/talk-s` for a line that should be spoken without posting its text to chat:

```text
/talk-s {Jessie Walker} We'll meet at midnight by the pier.
```

Use `/narrate` to explicitly request narration:

```text
/narrate Beyond the mountains, the storm was gathering.
```

When **Automatically Read In-Character Chat** is enabled, `/ic` messages are also sent to TTS using the active chat speaker or normal fallback resolution:

```text
/ic I will take the left path.
```

### Stage directions

> **New in version 1.3.0**

A stage direction in parentheses at the beginning of the text asks the provider to shape the delivery. Put it after any voice or actor selector:

```text
/talk (whispering, afraid of being heard) They are right behind us.
/talk {Jessie Walker} (furious, trying not to shout) You betrayed us!
/talk [Matilda] (sad and tired) I miss him so much.
```

The direction is sent to the ElevenLabs TTS provider with the text. When the pause after the direction can be detected, the direction is removed from the audio, shown separately above the spoken text in chat, and omitted from replayed audio. Keep it at the very beginning of the text and do not put parentheses inside the direction. If the pause cannot be detected, the direction may also be heard.

### Journal read-aloud

> **New in version 1.4.0**

On journal pages, text inside common quotation marks gets a small read-aloud button beside it. Click the button to read the passage using normal `/talk` speaker resolution. If exactly one token is controlled, that token's actor speaks. Right-click the button to open the read-aloud menu for the passage.

You can also add explicit inline enrichers to journal content:

```text
@ReadAloud{Text to read aloud}
@ReadAloud[Jessie Walker]{Text to read aloud as Jessie}
@Narrate{Text read with the narrator voice}
```

`@ReadAloud{...}` uses normal speaker resolution; `@ReadAloud[Actor Name]{...}` specifies an actor; and `@Narrate{...}` requests the narrator. Click the rendered control to send its text to chat and TTS.

To read a selection that is not already quoted or marked up, enable **Enable Context Menu On Selected Text**, select the passage, and right-click it. Choose **Read Aloud** or **Read Aloud (Actor)**, with or without a chat post. This context menu works in journal content areas.

### Audio history

> **New in version 1.4.0**

The ElevenLabs connector keeps a history of generated speech and sound effects. Open it from the sounds Scene Controls, a token HUD, or an actor's context menu. Opening it from a token or actor filters the list to that actor; use the actor filter to switch back to all actors.

Filter the list by text, media type, actor, and inclusive **From**/**To** dates. Speech entries show available speaker, voice, and model information; sound-effect entries show their source information. Stage directions appear with the related speech entry.

Each entry provides actions to:

- Play audio for yourself.
- Broadcast playback to connected clients.
- Download the audio file.

GMs can drag a sound-effect entry onto the canvas to create ambient audio in the current scene. Speech entries cannot be dragged onto the canvas. Audio history requires the connector's history service and credentials; for ElevenLabs, configure an API key.

### Token HUD

> **New in version 1.4.0**

Open a token's HUD to find the read-aloud dialog and audio-history controls. Enter custom text, choose the narrator or token actor, then select whether the text should also be posted to chat. The history control opens audio history filtered to that token's actor.

### Mute and speech status

The GM-only mute control is available in the sounds Scene Controls. Muting prevents TTS playback but leaves tools such as journal read-aloud and audio history accessible.

> **New in version 1.2.0**
>
> When spoken text is posted to chat, a status line can show that speech is being prepared and how long it has been waiting. The line updates as audio is prepared and played. It is not shown when the message is not posted to chat or the connector is muted.

## Extending

The module can use additional TTS providers through connector modules. The bundled `scripts/example_tts_connector.js` is the starting reference for a connector class, settings schema, voice list, and registration hook. The example is a scaffold, not a working provider integration: its `speak()` and `generateAudioData()` methods only log or return a placeholder. Chat speech is dispatched through `textToSpeech()`, so a real connector must implement that method.

### Connector responsibilities

Extend `TTSConnectorInterface` and provide a unique `id` and display `label`. Implement the voice catalog methods so the module can populate the fallback-voice setting and resolve voice names. `getAvailableVoices()` should return a synchronous cached array, with each voice containing at least an `id` and `name`; `getVoiceId(name)` should search that cache synchronously.

Use `getSettingsSchema()` to declare Foundry settings. The base class registers the schema and localizes the setting name and hint. The active connector's `init()` runs after settings have been registered, so it can read its API key and load or refresh its voice catalog.

For actor-specific voices, implement `getVoiceIdFromActor(actor)` and `getVoiceSettingsFromActor(actor)`. The default implementations return no voice and empty settings. A connector also needs a settings UI or another way for users to save those actor flags. For example, flags can be stored under the Talking Actors module namespace with `actor.setFlag(this.mainSettingsId, "example-tts-voice-id", "voice1")`.

### Minimal class skeleton

This example follows the structure of `example_tts_connector.js`. Replace `synthesizeWithProvider()` and the audio handling with calls to your provider's SDK or API. The code shows the connector contract; it does not connect to a real TTS service as written.

```js
import TTSConnectorInterface from "./tts-connector-interface.js";

const VOICE_ID_FLAG = "example-tts-voice-id";
const VOICE_SETTINGS_FLAG = "example-tts-voice-settings";

export default class ExampleTTSConnector extends TTSConnectorInterface {
	voices = [
		{ id: "voice1", name: "Voice One", lang: "en" },
		{ id: "voice2", name: "Voice Two", lang: "en" },
	];

	get id() {
		return "example-tts";
	}

	get label() {
		return "Example TTS Connector";
	}

	getSettingsSchema() {
		return [
			{
				key: "api-key",
				name: "Example TTS | API Key",
				hint: "API key for the Example TTS service",
				scope: "world",
				config: true,
				type: String,
				default: "",
			},
		];
	}

	async init() {
		this.apiKey = game.settings.get(this.mainSettingsId, "api-key");
		if (!this.apiKey) this.logger.warn("Example TTS API key is not configured.");

		// Optionally replace the static list with voices fetched from the provider.
		// Keep the resulting list cached; getAvailableVoices() is synchronous.
	}

	getAvailableVoices() {
		return this.voices;
	}

	getVoiceId(voiceName) {
		return this.voices.find(voice => voice.name === voiceName)?.id ?? null;
	}

	getVoiceIdFromActor(actor) {
		return this.getStringFlagFromActor(actor, VOICE_ID_FLAG);
	}

	getVoiceSettingsFromActor(actor) {
		return this.getObjectFlagFromActor(actor, VOICE_SETTINGS_FLAG);
	}

	async textToSpeech(voiceId, actor, text, settings = {}, { onProgress } = {}) {
		if (this.isMuted || !this.apiKey) return null;
		if (!this.voices.some(voice => voice.id === voiceId)) {
			throw new Error(`Unknown voice ID: ${voiceId}`);
		}

		this._speaking = true;
		try {
			onProgress?.("preparing");
			const result = await this.synthesizeWithProvider({
				voiceId,
				actor,
				text,
				settings,
				apiKey: this.apiKey,
			});
			onProgress?.("playing");
			await this.playSound(result.chunks);
			return result.historyItemId;
		} finally {
			this._speaking = false;
		}
	}

	async synthesizeWithProvider(_request) {
		throw new Error("Implement the Example TTS provider request here.");
	}

	async playSound(_chunks) {
		throw new Error("Implement audio playback for the provider's audio format here.");
	}

	async stop() {
		// Stop the provider request or current audio playback here.
		this._speaking = false;
	}
}
```

`textToSpeech()` receives the selected voice ID, actor, text, actor voice settings, and an optional progress callback. The provider request in this skeleton is expected to return `{ chunks, historyItemId }`; adapt that shape to the provider and implement playback. Return the provider's history ID when replay is supported. A connector that supports replay should also implement `replaySpeech(itemId)`. Implement `playSample()`, `generateSoundEffect()`, and `openVoiceSettingsApp()` when you want to expose those optional connector features. If the connector accepts stage directions, read `direction` from the final options argument to `textToSpeech()` and pass it to the provider.

### Register and load the connector

Register the connector from a script loaded by your connector module. The hook is called during Talking Actors initialization; the main module chooses the active connector from the registered connectors.

```js
import ExampleTTSConnector from "./example_tts_connector.js";

Hooks.on("acdTalkingActors.registerTtsConnector", (mainModule, logger) => {
	mainModule.registerTtsConnector(
		new ExampleTTSConnector(mainModule, logger),
	);
});
```

Include that script in your connector module's `module.json` under `esmodules`, and declare Talking Actors as a module dependency so its interface is available. If you place the connector beside the bundled example instead, use the example's relative import path and load the connector script before the `init` hook fires. After enabling the connector module, select it in the Talking Actors settings, configure its API key, then verify the voice list and try `/talk Hello.`.
For a separate connector module, import the interface from `/modules/acd-talking-actors/scripts/tts-connector-interface.js` instead of using the relative path shown in the same-module example.

## Troubleshooting

- **The command only posts text:** Check that a connector is active, provider credentials are configured, and the speaking actor has a voice. Try `/narrate` or configure the fallback voice to distinguish actor setup from connector issues.
- **No sound plays:** Check the browser console, provider API key, Foundry audio output, and the GM mute control.
- **An unexpected voice speaks:** Check for a `[Voice Name]` selector, the actor resolved from the active chat speaker, and the configured narrator and fallback voices.
- **A stage direction is audible:** Stage directions require ElevenLabs support and a detectable pause after the direction. Keep the direction at the beginning of the text.
- **Quoted text has no button:** Confirm the text is on a journal page and enclosed in common quotation marks. You can use an inline enricher or enable the selected-text context menu instead.
- **Audio history is empty or unavailable:** Confirm an ElevenLabs API key is configured and that the provider has generated speech or sound effects to show.

## Credits

Developed by acd-jake. Contributions welcome!

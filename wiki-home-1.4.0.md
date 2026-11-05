# Talking Actors

## Overview

`Talking Actors` is a Foundry VTT module that lets actors and narrators speak in chat using text-to-speech (TTS). It includes actor voice assignment, journal read-aloud tools, speech and sound-effect history, and support for external TTS connectors.

## Features

- Assign voices to actors and narrators
- Use `/talk`, `/talk-s`, `/ic`, and `/narrate` chat commands
- Add stage directions to shape speech delivery
- Read quoted speech from journal pages with an inline button
- Browse, filter, play, broadcast, and download generated audio
- Drag sound effects from the history into a scene as ambient sounds
- Integrate with TTS connectors, including the bundled ElevenLabs connector
- Use English and German localization

## Installation

1. Install through Foundry's module manager or manually using the [latest manifest](https://github.com/acd-jake/acd-talking-actors/releases/latest/download/module.json).
2. Enable `acd-talking-actors` in your world. Enable the ElevenLabs connector if you want to use it.
3. Configure an ElevenLabs API key in the module settings when using that connector.

## Configuration

### Module settings

The module settings include:

- **Allow Users**: Allow non-GM users to use module features.
- **Narrating Actor**: Select the actor used as the narrator or as a voice fallback.
- **Enable Context Menu On Selected Text**: Enable the right-click read-aloud menu for selected journal text.
- **Post Spoken Text To Chat**: Choose whether speech commands also post their text to chat.
- **Automatically Read In-Character Chat**: Read `/ic` messages aloud automatically.

TTS connector settings, including API credentials and sound-effect playlist configuration, are provided by the connector.

### Actor voices

Open an actor's voice settings from the actor sheet or actor directory. The connector provides voice, model, language, and voice-delivery settings. Unlinked tokens can have their own voice settings.

### Narrator voice

Set a narrating actor in module settings for narration and as a fallback when a speaking actor has no configured voice.

## Usage

### Chat commands and stage directions

Use `/talk` followed by the text to speak. With exactly one controlled token, its actor's voice is used; with no token or multiple controlled tokens, the narrator voice is used unless a speaker is specified.

```text
/talk Today is a good day.
/talk {Jessie Walker} Nice to meet you.
/talk [Matilda] Hello there.
```

Use `/talk-s` for speech that should not be posted to chat. Use `/narrate` to explicitly use the narrator voice. `/ic` messages can be read automatically when that setting is enabled.

A stage direction in parentheses at the beginning of a command shapes delivery and is shown separately from the spoken text:

```text
/talk (whispering, afraid of being heard) They are right behind us.
```

The direction is sent to the TTS provider and removed from the resulting audio when the pause after it can be detected. Stage directions are supported by the ElevenLabs connector.

### Journal read-aloud

When a journal page contains text enclosed in common quotation marks, Talking Actors adds a small read-aloud button immediately after the quoted passage. Clicking it sends the passage through `/talk`. If exactly one token is controlled, that actor speaks; otherwise the usual `/talk` speaker resolution applies. Right-click the button to open the read-aloud context menu for that passage.

Journal text can also use explicit enrichers:

```text
@ReadAloud{Text to read aloud}
@ReadAloud[Actor Name]{Text to read aloud}
@Narrate{Text read with the narrator voice}
```

The selection context menu can read selected journal text when **Enable Context Menu On Selected Text** is active.

### Audio history

Open the audio history from the sounds Scene Controls, a token HUD, or an actor's context menu. The actor entry points preselect that actor; the media filter starts at **All media**.

Use the search field, the media-type icon buttons, the actor selector, and the inclusive **From**/**To** date filters to narrow the list. Entries show their date first, followed by available actor, voice, model or playlist information. Stage directions are marked and shown alongside speech.

Each entry has separate actions to:

- Play on the current client
- Broadcast playback to all connected clients
- Download the audio file

Game masters can drag sound-effect entries from the history onto the canvas to create an ambient sound in the current scene. Speech entries are not draggable.

### Token HUD

The token HUD includes a read-aloud dialog for entering text and choosing the narrator or token actor. It also provides access to the audio history filtered to that actor.

### Mute

The mute control in the sounds Scene Controls stops voice output while leaving the other module tools available. It is visible to the GM.

## Extending

The base module is designed to work with different TTS providers. Implement a connector following `scripts/tts-connector-interface.js` and register it with the `acdTalkingActors.registerTtsConnector` hook. Connectors may ignore the optional `direction` argument if they do not support stage directions.

## Troubleshooting

- Check that the selected connector and its API key are configured.
- Check the browser console if speech generation or playback fails.
- If a stage direction is spoken in the final audio, the pause after the direction may not have been detected.

## Credits

Developed by acd-jake. Contributions welcome!

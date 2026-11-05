# Talking Actors

## Overview

`Talking Actors` is a FoundryVTT module that enhances your tabletop experience by enabling
actors and narrators to "talk" in chat, with support for text-to-speech (TTS)
integration. The module provides tools for immersive storytelling, including actor
voice assignment, chat message enrichment, and compatibility with external TTS
connectors.

## Features

- Actor and narrator chat message enrichment
- Integration with TTS connectors (e.g., ElevenLabs)
- Customizable voice settings per actor
- Stage directions that steer the delivery of spoken text
- Context menu enhancements for chat and tokens
- Localized language support (English, German)
- Out-of-the-box support for the Elevenlabs TTS provider.
- Extensible architecture for additional TTS providers

## Installation

1. Install directly through Foundry's module manager or manually using this
   manifest URL: [https://github.com/acd-jake/acd-talking-actors/releases/latest/download/module.json](https://github.com/acd-jake/acd-talking-actors/releases/latest/download/module.json)
2. Optionally install a tts connector of your choice (a connector for Elevenlabs
   is part of the package).
3. Enable both `acd-talking-actors` and your optional tts connector in your FoundryVTT game settings.
4. When using elevenlabs as the tts connector, configure your ElevenLabs API key in
   the module settings.

## Configuration

### Module Settings

Use the settings UI in FoundryVTT to configure the base module and the TTS
connector. The settings for the base module are:

- **Log Level**: The module writes log messages at different levels of detail. This
  setting determines the level of detail logged.
- **Show notifications**: This setting determines whether log messages of the Error or
  Warning level are also displayed as UI notifications.
- **Allow Users**: This setting determines whether players also have access to the
  module.
- **Narrating Actor (ID)**: The ID of the narrating actor. See below for more
  information.
- **Enable Context Menu On Selected Text**: This setting determines whether
  right-clicking on journal entries displays a context menu that allows you to read aloud
  text passages selected with the mouse. See below for more information.
- **Post spoken text to chat**: This setting determines whether the spoken text should
  be written in the chat (and possibly displayed as a speech bubble above the
  actor's token).
- **Automatically read aloud In-Character chat messages**: This setting determines
  whether chat messages written in-character using the /ic command should be
  automatically read aloud (and possibly displayed as a speech bubble above the actor's
  token).

The Settings for the TTS connector are provided by the TTS Connector and are
described in more detail there.

### Configuration of voices for actors

The UI for configuring an actor's voice can be opened via a button in the title
bar of the actor sheet.

In addition to the voice itself, additional settings for speech behavior can
also be made here.

The UI and the setting options are provided by the TTS Connector and are
described in more detail there.

> **New in version 1.1.0**
>
> Now tokens that are not linked to an actor are supported. If a token is linked
> to an actor, the voice settings are stored in the actor's data and are available
> in every scene in which the actor possesses a token. If a token is not linked to
> an actor, the voice settings are stored in the token's data. This allows you to
> set a unique voice for each token, for example a different one for each goblin.
> If the token is subsequently linked to an actor, the actor's voice settings
> override those stored in the token itself until the link is removed.

### Configuration of a voice for a narrator

It is possible to specify a narrative actor in the module settings. This actor
can serve as a narrator if voice output is not to be provided for a specific
actor. This voice can then be used to narrate descriptions of locations or
flashbacks, for example.

It is advisable to create an actor exclusively for this purpose and then specify
the voice settings for this actor.

## Usage

### Enabling and Disabling Voice output

> **New in version 1.0**

It is possible to turn voice output on or off using a "mute" button in the sound
tools.

When it is turned off, the corresponding functions in journals, token HUD, or
chat are still available. However, voice generation and output are prevented.

This button is only visible to the game master.

### Voice output via chat commands

Various chat commands can be used to generate different voice outputs.

#### /talk

Voice output is usually initiated by the command `/talk`, followed by the actual content to be spoken.

The voice used depends on the currently selected token.

If a single token is selected and a voice has been configured for the
corresponding actor, this voice is used for the voice output.

If no tokens or multiple tokens are currently selected, the voice of the
narrating actor is used (see above).

By adding a parameter in square brackets (e.g., `/talk [Matilda]`), it is possible to select a voice for the speech output. This voice selection
overrides the behavior described above. Note: The parameter must be the name of
one of the voices available in the TTS Connector.

By appending a parameter enclosed in curly brackets (e.g., `/talk {Jessie Walkers}` or `/talk {HECv7W7ivU39YOyW}`), you can select an actor for the voice output. This selection can be made
either by the name or the ID of the actor and is overridden by the parameter for
selecting a voice (see above) if this is also specified.

Examples

```
/talk Today is a good day.
/talk [Matilda] Hi, my Name is Sophie.
/talk {Jessie Walkers} Nice to meet you.
```

##### Stage directions

> **New in version 1.3.0**

A stage direction tells the voice how the following text should be spoken, for
example angry, whispering or sad. It is written in round brackets at the very
beginning of the text, after the optional voice and actor parameters:

```
/talk (I am incredibly angry and start screaming!) Why did you do that? Get out of my sight!
/talk {Jessie Walkers} (whispering, afraid of being heard) They are right behind us.
/talk [Matilda] (sad and tired) I miss him so much.
```

How it works:

- The direction is sent to the TTS provider together with the text, so that the
  voice picks up the mood. It is not part of the spoken result: the module
  detects the pause that follows the direction and cuts the direction out of the
  audio. The same applies when a message is replayed from the chat.
- In the chat, the direction is shown in small italics above the spoken text.
- The direction must be at the very beginning of the text and must not contain
  round brackets itself. Round brackets later in the text are spoken as usual.
- If no pause is found after the direction, the complete audio is played and a
  warning is written to the log.

Stage directions work with `/talk`, `/talk-s`, `/narrate` and `/ic` (if automatic
in-character talk is enabled). They are currently supported by the ElevenLabs
connector.

#### /talk-s

The `/talk-s` command behaves exactly like the `/talk` command, with one exception. This exception is that the spoken text is not output in
the chat (regardless of the selection made in the module settings).

This is useful, for example, to play snippets of conversations that are
overheard without seeing the speakers.

Example:

```
/talk-s {Jessie Walkers} We'll meet at midnight down at the pier.
```

#### /narrate

> **New in version 1.0**

The /narrate command allows text to be spoken by the narrator's voice, even if
another actor's token is currently selected.

This allows descriptions of locations or events to be spoken at any time.

Example:

```
/narrate Suddenly, you hear a loud crack and the ground beneath your feet gives way.
```

### Voice output via journal entries

There are two ways to have text in journal entries read aloud.

The first allows you to mark text passages in the journal as text areas to be
read aloud while writing the entry.

The second option is to select text in the journal during a session with the
mouse and then have it read aloud using the context menu.

The two methods are described below.

#### Predefined passages to read aloud

The Talking Actors module provides various text enrichers that can be inserted
directly into the text of a journal entry.

To do this, simply place the text to be read aloud in curly brackets and precede
it with the @ReadAloud command.

Example:

```
@ReadAloud{This is a small patch of sand along the shore of the Great Sea.}
```

After saving the entry, the passage to be read aloud is highlighted and can be
read aloud by clicking on the speech bubble to the right above the text.

The voice of the currently selected token or the narrating actor is used
(similar to the chat command `/talk`).

An actor can be specified as an additional parameter for the enricher. The text
will then be read aloud in character for this actor. To use this feature,
specify the enricher as follows:

```
@ReadAloud [Jessie Walker]{text to be read aloud}
```

The @Narrate enricher is available to have the text read aloud by the narrator's
voice.

Example:

```
@Narrate {This is a small patch of sand along the shore of the Great Sea.}
```

Please note that for all enrichers, the text to be read aloud must be a single
paragraph.

#### Have dynamic text passages read aloud when viewing a journal

If the corresponding option has been activated in the module settings, it is
possible to have selected text passages read aloud when displaying a journal entry.

To do this, simply select the relevant passage with the mouse and then open the
corresponding context menu by right-clicking.

There are several options for reading the text aloud:

1. Read Aloud (Narrator): Reads the passage aloud with the narrator's voice and
   also displays the text in the chat.
2. Read Aloud (Narrator) Without Chat Message: Reads the passage aloud with the
   narrator's voice, but does not display the text in the chat.
3. Read Aloud (Actor): Reads the passage aloud with the voice of the selected actor
   and also displays the text in the chat.
4. Read Aloud (Actor) Without Chat Message: Reads the passage aloud with the
   voice of the selected actor, but does not display the text in the chat.

#### Read Aloud Passages Using a Macro

Create a script macro with the following content:

```js
/*
This macro sends the contents of the next journal element (paragraph, blockquote, etc.) to the chat as a talk command. It is possible to select a specific voice or actor to speak the text by prefixing the text with the appropriate information.

Select voice (with square brackets):
   "[voiceid] ...."

Select actor (with curly brackets):
   "{actor name} ...." or "{actorid} ..."
*/

const text = event.target.closest("P").nextElementSibling.innerText;

ui.chat.processMessage(`/talk ${text}`);
```

### Voice output via the Token HUD

The HUD displayed for a token contains a button for dynamic reading aloud.
Clicking this button opens the UI for dynamic reading aloud.

Here, you can enter the text to be read aloud and specify whose voice (narrator
or selected actor) should be used for the voice output.

In addition, you can use the corresponding buttons to select whether the text to
be read aloud should also be written in the chat.

## Extending

The module is not implemented for a specific TTS provider. Rather, it should be
possible to use any provider. Therefore, no connection to a provider is
implemented in the module itself. Instead, there is a separate connector
("acd-talking-actors-elevenlabs") that provides this connection.

To add support for new TTS providers:

- Implement a connector following the interface in `scripts/tts-connector-interface.js`.
- Register your connector using the hook "acdTalkingActors.registerTtsConnector"
  as follows:

```js
Hooks.on("acdTalkingActors.registerTtsConnector", (mainModule, logger) => {
    mainModule.registerTtsConnector(new NewConnector(mainModule, logger));
    logger.info(`Registered NewConnector as TTS Connector.`);
});
```

- To support stage directions, `textToSpeech(voiceId, actor, text, settings, { onProgress, direction })`
  receives the direction as a separate option. A connector that does not support
  directions can simply ignore it.

## Troubleshooting

- Ensure your TTS Connector is properly installed and configured.
- Check the browser console for errors if TTS playback fails.
- If a stage direction is spoken aloud in the final audio, the pause after it was
  not detected; check the log for the warning "No pause found after stage direction".
- Refer to the `README.md` for additional setup instructions.

## Credits

Developed by acd-jake. Contributions welcome!

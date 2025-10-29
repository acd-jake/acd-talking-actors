# acd-talking-actors

acd-talking-actors is a FoundryVTT module that brings immersive, AI-powered voice and sound features to your tabletop games. It enables actors and narrators to speak in chat using customizable text-to-speech (TTS) integration, and provides tools for generating, managing, and replaying voice lines

## Features

- Assign and configure voices for actors using the Voice Settings dialog
- Use `/talk` chat command to make selected actors speak with their configured or overridden voice
- Optional integration with [Yendors Scene Actors](https://foundryvtt.com/packages/yendors-scene-actors) and [Conversation Hud](https://foundryvtt.com/packages/conversation-hud)
- Read-aloud support for FoundryVTT journals, with macro insertion and flexible voice selection
- Token HUD button for entering and reading aloud custom text
- Option to suppress posting spoken text to chat
- API for third-party module integration
- Localized language support (English, German)
- Extensible architecture for additional TTS providers

## Installation

1. Install directly through Foundry's module manager or manually using this manifest URL: https://github.com/acd-jake/acd-talking-actors/releases/latest/download/module.json
2. Install a tts connector of your choice ( [acd-talking-actors-elevenlabs](https://github.com/acd-jake/acd-talking-actors-elevenlabs) is a functionally implementation for Elevenlabs ).
3. Enable both `acd-talking-actors` and your tts connector in your FoundryVTT game settings.


## Credits

- Developed by acd-jake
- Inspired by "Elevenlabs for Foundry" by Vexthecollector
- Powered by ElevenLabs

---

For more information, see the [GitHub Wiki](https://github.com/acd-jake/acd-talking-actors/wiki) or the [acd-talking-actors-elevenlabs](https://github.com/acd-jake/acd-talking-actors-elevenlabs) project for ElevenLabs integration.

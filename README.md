# acd-talking-actors

![GitHub Release](https://img.shields.io/github/v/release/acd-jake/acd-talking-actors?display_name=tag&style=for-the-badge&label=Latest%20Release)

![Latest Release Download Count](https://img.shields.io/github/downloads/acd-jake/acd-talking-actors/latest/module.zip?color=2b82fc&label=DOWNLOADS&style=for-the-badge)

![Foundry Core Compatible Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Facd-jake%2Facd-talking-actors%2Frefs%2Fheads%2Fmain%2Fmodule.json&label=Foundry%20Version&query=$.compatibility.verified&colorB=orange&style=for-the-badge)

[![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Facd-talking-actors&colorB=006400&style=for-the-badge)](https://forge-vtt.com/bazaar#package=acd-talking-actors)

[![Foundry Hub Endorsements](https://img.shields.io/endpoint?logoColor=white&url=https%3A%2F%2Fwww.foundryvtt-hub.com%2Fwp-json%2Fhubapi%2Fv1%2Fpackage%2Facd-talking-actors%2Fshield%2Fendorsements&style=for-the-badge)](https://www.foundryvtt-hub.com/package/acd-talking-actors/)

![GitHub all releases](https://img.shields.io/github/downloads/acd-jake/acd-talking-actors/total?label=TOTAL%20DOWNLOADS&style=for-the-badge)

acd-talking-actors is a FoundryVTT module that brings immersive, AI-powered voice and sound features to your tabletop games. It enables actors and narrators to speak using customizable text-to-speech (TTS) integration, and provides tools for generating, managing, and replaying voice lines

## Features

- Assign and configure voices for actors using the Voice Settings dialog
- Use `/talk` chat command to make selected actors speak with their configured or overridden voice
- Optional integration with [Yendors Scene Actors](https://foundryvtt.com/packages/yendors-scene-actors) and [Conversation Hud](https://foundryvtt.com/packages/conversation-hud)
- Read-aloud support for FoundryVTT journals, with macro insertion and flexible voice selection
- Token HUD button for entering and reading aloud custom text
- Option to suppress posting spoken text to chat
- API for third-party module integration
- Localized language support (English, German)
- Out-of-the-box support for the Elevenlabs TTS provider.
- Extensible architecture for additional TTS providers

## Installation

1. Install directly through Foundry's module manager or manually using this manifest URL: https://github.com/acd-jake/acd-talking-actors/releases/latest/download/module.json
2. Optionally install a tts connector of your choice ( a connector for Elevenlabs is part of the package).
3. Enable both `acd-talking-actors` and your optional tts connector in your FoundryVTT game settings.
4. When using elevenlabs as the tts connector, configure your ElevenLabs API key in the module settings.


## Credits

- Developed by acd-jake
- Inspired by "Elevenlabs for Foundry" by Vexthecollector
- Powered by ElevenLabs

---

For more information, see the [GitHub Wiki](https://github.com/acd-jake/acd-talking-actors/wiki).

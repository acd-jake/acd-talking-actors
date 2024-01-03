# acd-talking-actors
Selectable and adjustable voices for FoundryVTT actors through Elevenlabs integration. You can configure voices, finetune them and assign them to your linked actors in FoundryVTT using the voice settings dialog in the scene controls bar.

Using the chat command /talk with an actor selected will let the character speak with the configured voice. Alternatively use /talk [VoiceName] to override the configuration and let the character speak with the given voice.

An Elevenlabs subscription is required for the module to work. https://beta.elevenlabs.io/

* This module is a spritual successor to the module "Elevenlabs for Foundry" by Vexthecollector (https://github.com/Vexthecollector/elevenlabs-for-foundry/tree/main).
* This module optionally uses the [Yendors Scene Actors](https://foundryvtt.com/packages/yendors-scene-actors) module if this is activated. If an actor is set to focus in the Scene Actors module, it is used for the voice output and does not need to have a token in the active scene. (Added in version 0.4)

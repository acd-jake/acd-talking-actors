# acd-talking-actors
Selectable and adjustable voices for FoundryVTT actors through Elevenlabs integration. You can configure voices, finetune them and assign them to your linked actors in FoundryVTT using the voice settings dialog in the scene controls bar.

Using the chat command /talk with an actor selected will let the character speak with the configured voice. Alternatively use /talk [VoiceName] to override the configuration and let the character speak with the given voice.

An Elevenlabs subscription is required for the module to work. https://beta.elevenlabs.io/

* This module is a spritual successor to the module "Elevenlabs for Foundry" by Vexthecollector (https://github.com/Vexthecollector/elevenlabs-for-foundry/tree/main).
* This module optionally uses the [Yendors Scene Actors](https://foundryvtt.com/packages/yendors-scene-actors) module if this is installed. If an actor is set to focus in the Scene Actors module, it is used for the voice output and does not need to have a token in the active scene. (From version 0.4)
* This module optionally uses the [Conversation Hud](https://foundryvtt.com/packages/conversation-hud) module if this is installed. If the "Speak As" option is set in the Conversation Hud module, the active conversation participant is used for the voice output and does not need to have a token in the active scene. (From version 0.5)
* Supports read-aloud texts in FoundryVTT journals with an insertable macro (with free voice selection by voice id, actor name or actor id). (From version 0.6)
* Offers the option of playing spoken text repeatedly by clicking a button on the chat messages. The replayed text will be loaded from the history of generated samples in Elevenlabs and thus does not count against the word limit. (From version 0.6)

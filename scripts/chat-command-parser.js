export const CHAT_COMMANDS = Object.freeze({
    TALK: "talk",
    TALK_SILENT: "talk-s",
    IN_CHARACTER: "ic",
    OUT_OF_CHARACTER: "ooc",
    NARRATE: "narrate",
});

const MESSAGE_PATTERN = /^\/(.+?)(?:[ ]+\[(.+?)\])?(?:[ ]+\{(.+?)\})?[ ]+(.*)$/;

export function parseChatCommand(messageText, isAutoInCharacterTalkEnabled) {
    if (typeof messageText !== "string") return null;

    const match = messageText.match(MESSAGE_PATTERN);
    if (!match) return null;

    const [, command, voiceName, actorIdentifier, text] = match;
    const isSupportedCommand = [
        CHAT_COMMANDS.TALK,
        CHAT_COMMANDS.TALK_SILENT,
        CHAT_COMMANDS.NARRATE,
    ].includes(command) || (
        command === CHAT_COMMANDS.IN_CHARACTER && isAutoInCharacterTalkEnabled
    );

    if (!isSupportedCommand) return null;

    const directionMatch = text.match(/^\(([^()]+)\)\s*(.*)$/s);
    if (directionMatch) {
        const direction = directionMatch[1].trim();
        return { command, voiceName, actorIdentifier, direction, text: directionMatch[2] };
    }

    return { command, voiceName, actorIdentifier, direction: null, text };
}
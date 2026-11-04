const PAUSE_FILLER = " . . . . . ";
const SILENCE_THRESHOLD = 0.01;
const MIN_SILENCE_SECONDS = 0.35;

/** Prepends a stage direction followed by a pause filler that is later cut out of the audio. */
export function buildDirectedText(direction, text) {
    return direction ? `${direction}${PAUSE_FILLER}${text}` : text;
}

/** Finds where speech resumes after the first long silence that follows speech. Returns seconds or null. */
function findSpeechStart(channel, sampleRate) {
    const minSilence = Math.floor(sampleRate * MIN_SILENCE_SECONDS);
    let heardSpeech = false;
    let silent = 0;
    for (let i = 0; i < channel.length; i++) {
        if (Math.abs(channel[i]) < SILENCE_THRESHOLD) {
            silent++;
            continue;
        }
        if (heardSpeech && silent >= minSilence) return i / sampleRate;
        heardSpeech = true;
        silent = 0;
    }
    return null;
}

/** Returns the offset of the last MP3 frame sync at or before `index`. */
function alignToFrame(bytes, index) {
    for (let i = Math.min(index, bytes.length - 2); i > 0; i--) {
        if (bytes[i] === 0xFF && (bytes[i + 1] & 0xE0) === 0xE0) return i;
    }
    return 0;
}

/**
 * Removes the spoken stage direction from MP3 chunks by cutting at the pause that follows it.
 * Returns the original chunks if no pause is found or decoding fails.
 */
export async function trimDirectionFromChunks(chunks, logger) {
    let context;
    try {
        const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
        context = new AudioContext();
        const audio = await context.decodeAudioData(bytes.slice().buffer);
        const start = findSpeechStart(audio.getChannelData(0), audio.sampleRate);
        if (start === null) {
            logger?.warn("No pause found after stage direction; playing complete audio.");
            return chunks;
        }
        // Constant bitrate assumed, so time maps linearly onto bytes; back off slightly to avoid clipping the onset.
        const cut = alignToFrame(bytes, Math.floor(bytes.length * Math.max(0, start - 0.03) / audio.duration));
        return [bytes.subarray(cut)];
    } catch (error) {
        logger?.warn("Failed to trim stage direction:", error);
        return chunks;
    } finally {
        context?.close();
    }
}

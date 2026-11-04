// Socket.io drops connections on oversized packets, so audio is sent in small slices.
export const AUDIO_CHUNK_BYTES = 128 * 1024;
const PACKET_DELAY_MS = 10;
const RECEIVE_TIMEOUT_MS = 60_000;

export async function sendAudio(socket, channel, chunks, meta = {}) {
    const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }

    const count = Math.max(1, Math.ceil(total / AUDIO_CHUNK_BYTES));
    const transferId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    for (let index = 0; index < count; index++) {
        const data = bytes.slice(index * AUDIO_CHUNK_BYTES, (index + 1) * AUDIO_CHUNK_BYTES);
        socket.emit(channel, { transferId, index, count, data, ...meta });
        if (index < count - 1) await new Promise(resolve => setTimeout(resolve, PACKET_DELAY_MS));
    }
}

export class AudioReceiver {
    constructor(onComplete) {
        this.onComplete = onComplete;
        this.transfers = new Map();
    }

    receive(packet) {
        const { transferId, index, count, data } = packet ?? {};
        if (typeof transferId !== "string" || !Number.isInteger(index) || !Number.isInteger(count) || !data) return;

        let transfer = this.transfers.get(transferId);
        if (!transfer) {
            transfer = { parts: new Array(count), received: 0 };
            transfer.timer = setTimeout(() => this.transfers.delete(transferId), RECEIVE_TIMEOUT_MS);
            this.transfers.set(transferId, transfer);
        }
        if (index < 0 || index >= transfer.parts.length || transfer.parts[index]) return;

        transfer.parts[index] = new Uint8Array(data);
        transfer.received++;
        if (transfer.received === transfer.parts.length) {
            clearTimeout(transfer.timer);
            this.transfers.delete(transferId);
            this.onComplete(transfer.parts, packet);
        }
    }
}

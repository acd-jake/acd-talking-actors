import { loadScript } from "./functions.js";
import Logger from "./logger.js";

export class Mp3Utils {
    static logger = new Logger(Mp3Utils);
    static init() {
        loadScript('https://cdn.jsdelivr.net/npm/mp3tag.js@latest/dist/mp3tag.min.js', () => {
            Mp3Utils.logger.info('mp3tag loaded');
        });
    }

    static async initTags(buffer, description) {
        try {
            const mp3tag = new MP3Tag(buffer, true);

            if (Mp3Utils.readTags(mp3tag)) {
                mp3tag.tags.comment = description;
                mp3tag.tags.genre = "Sound effect";

                // Replace buffer with modified content
                buffer = Mp3Utils.saveTags(mp3tag, buffer);
            }
        } catch (error) {
            Mp3Utils.logger.error('Error adding mp3 tags:', error);
        } finally {
            return buffer;
        }
    }

    static saveTags(mp3tag, buffer) {
        mp3tag.save();

        if (mp3tag.error) {
            Mp3Utils.logger.error('Error saving MP3 tags:', mp3tag.error);
            return buffer;
        }
        return mp3tag.buffer;
    }

    static readTags(mp3tag) {
        mp3tag.read();

        if (mp3tag.error !== '') {
            Mp3Utils.logger.error('Error reading MP3 tags:', mp3tag.error);
            return false;
        }
        return true;
    }

    static async saveFile(data, path, createSubDir = false) {
        let dir = path.substring(0, path.lastIndexOf('/'));

        // Check if a subdirectory needs to be created
        if (createSubDir) {
            await this.createSubDir(dir);
        }

        const file = new File([data], path.split('/').pop(), { type: "audio/mpeg" });

        try {
            const response = await FilePicker.upload("data", dir, file, {}, { notify: true });
            Mp3Utils.logger.info("File upload response:", response);
            ui.notifications.info(`File saved: ${path}`);
        } catch (err) {
            Mp3Utils.logger.error("Error saving file:", err);
            ui.notifications.error(`Failed to save file: ${path}`);
        }
    }


    async createSubDir(dir) {
        await FilePicker.browse('data', dir).catch(async (err) => {
            if (err.message === "The requested path is not currently available.") {
                await FilePicker.createDirectory('data', dir, { notify: false });
            }
        });
    }
}

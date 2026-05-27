import pool from "../database/start.js";

/**
 * બધા જ એક્ટિવ ઓડિયો ટ્રેક્સ ડેટાબેઝમાંથી મેળવવા
 */
export const getAllActiveSongsService = async () => {
    const query = "SELECT id, title, artist, audio_url FROM gurukul_songs WHERE is_active = true ORDER BY id DESC;";
    const result = await pool.query(query);
    return result.rows;
};

/**
 * નવો સોંગ ટ્રેક રેકોર્ડ ડેટાબેઝમાં સેવ કરવા માટે
 */
export const saveSongTrackService = async (title: string, artist: string, audioUrl: string) => {
    const query = `
        INSERT INTO gurukul_songs (title, artist, audio_url, is_active) 
        VALUES ($1, $2, $3, true) 
        RETURNING id, title, artist, audio_url;
    `;
    const result = await pool.query(query, [title.trim(), artist.trim(), audioUrl]);
    return result.rows[0];
};

/**
 * સોંગ ટ્રેકને ડેટાબેઝમાંથી કાયમી માટે રીમૂવ કરવા
 */
export const removeSongTrackService = async (id: string) => {
    const query = "DELETE FROM gurukul_songs WHERE id = $1 RETURNING id;";
    return await pool.query(query, [id]);
};
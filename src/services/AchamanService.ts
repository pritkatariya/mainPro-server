import db from "../database/db.js";
import neonPool from "../database/neon.js";
import { uploadToSupabase } from "../middleware/upload.js";

export const getAllImages = async () => {
    return await db.query("SELECT * FROM amrut_images ORDER BY created_at DESC");
};

export const getSingleImage = async (id: string) => {
    return await db.query("SELECT * FROM amrut_images WHERE id = $1", [id]);
};

export const createNewImage = async (title: string, imageFile: any) => {
    const imageUrl = await uploadToSupabase(imageFile);
    const query = "INSERT INTO amrut_images (title, url, created_at) VALUES ($1, $2, NOW()) RETURNING *";
    return await db.query(query, [title.trim(), imageUrl]); await neonPool.query(query, [title.trim(), imageUrl])
};

export const deleteImage = async (id: string) => {
    return await db.query("DELETE FROM amrut_images WHERE id = $1 RETURNING *", [id]);
};

export const updateImage = async (id: string, title: string, imageFile: any, existingData: any) => {
    let imageUrl = existingData.url;
    if (imageFile) {
        imageUrl = await uploadToSupabase(imageFile);
    }
    const query = "UPDATE amrut_images SET title = $1, url = $2 WHERE id = $3 RETURNING *";
    return await db.query(query, [title || existingData.title, imageUrl, id]);
};
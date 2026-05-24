import pool from "../database/start.js";

// ડેટા મેળવવા માટે
export const getOverview = async () => {
    return await pool.query(`SELECT hero_images, campus_image, campus_gallery_images, logo_image, daily_darshan_images
            FROM overview_config WHERE id = 1`);
};

// ડેટા અપડેટ કરવા માટે (Insert/Update Query)
export const updateOverview = async (queryParams: any[]) => {
    const queryText = `
        INSERT INTO overview_config (id, hero_images, campus_image, campus_gallery_images, logo_image, daily_darshan_images, updated_at)
        VALUES (1, $1::jsonb, $2, $3::jsonb, $4, $5::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET
            hero_images = EXCLUDED.hero_images,
            campus_image = EXCLUDED.campus_image,
            campus_gallery_images = EXCLUDED.campus_gallery_images,
            logo_image = EXCLUDED.logo_image,
            daily_darshan_images = EXCLUDED.daily_darshan_images,
            updated_at = NOW()
        RETURNING *;
    `;
    return await pool.query(queryText, queryParams);
};
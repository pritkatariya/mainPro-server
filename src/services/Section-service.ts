import pool from "../database/start.js";

export const SectionService = {
    createSection: async (
        department_id: number, 
        title: string, 
        description: string, 
        section_head_id: number | null, 
        users_id: number[]
    ) => {
        const query = `
            INSERT INTO sections (department_id, title, description, section_head_id, users_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const result = await pool.query(query, [department_id, title, description, section_head_id, users_id]);
        return result.rows[0];
    },

    getSectionsByDepartment: async (dept_id: number) => {
        console.log('[SectionService] getSectionsByDepartment called with dept_id:', dept_id);
        
        // dept_id valid check
        if (!dept_id || isNaN(dept_id)) {
            throw new Error(`Invalid dept_id: ${dept_id}`);
        }

        const query = `
            SELECT * FROM sections 
            WHERE department_id = $1 
            ORDER BY id ASC;
        `;
        const result = await pool.query(query, [dept_id]);
        console.log('[SectionService] rows found:', result.rows.length);
        return result.rows;
    },

    updateSection: async (id: number, users_id: number[]) => {
        const query = `
            UPDATE sections
            SET users_id = $1
            WHERE id = $2
            RETURNING *;
        `;
        const result = await pool.query(query, [users_id, id]);
        return result.rows[0];
    },

    getSectionMembersDetails: async (users_id: number[]) => {
        if (!users_id || users_id.length === 0) return [];
        
        const query = `
            SELECT id, full_name as name, username, role, department_id, section_id, profile_image_url
            FROM users
            WHERE id = ANY($1::int[])
        `;
        const result = await pool.query(query, [users_id]);
        return result.rows;
    }
};
import { Request, Response } from 'express';
import pool from '../database/db';

/**
 * ૧. સર્ચ ડેટા (Query મુજબ શોધવા માટે)
 */
export const searchData = async (req: Request, res: Response) => {
    const { query } = req.query;
    if (!query) {
        return res.status(400).json({ success: false, message: "Query is required" });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM search_data WHERE name ILIKE $1 OR description ILIKE $1 ORDER BY id DESC',
            [`%${query}%`]
        );

        res.status(200).json({
            success: true,
            results: result.rows
        });
    } catch (error) {
        console.error("Search Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * ૨. બધો ડેટા મેળવવા માટે (Live Items List)
 */
export const getAllData = async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM search_data ORDER BY id DESC');
        res.status(200).json({
            success: true,
            results: result.rows
        });
    } catch (error) {
        console.error("Fetch Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * ૩. નવો ડેટા અપલોડ કરવા માટે
 */
export const uploadData = async (req: Request, res: Response) => {
    const { title, description } = req.body;
    const file = req.file;

    if (!title || !file) {
        return res.status(400).json({ message: "Title and Image are required" });
    }

    try {
        const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

        const result = await pool.query(
            'INSERT INTO search_data (name, description, img) VALUES ($1, $2, $3) RETURNING *',
            [title, description, base64Image]
        );

        res.status(201).json({ success: true, results: result.rows[0] });
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ message: "Upload failed" });
    }
};

export const DeleteSearchData = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM search_data WHERE id = $1',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Item not found" });
        }

        res.status(200).json({ success: true, message: "Delete Success" });
    } catch (error) {
        console.error("Database error during delete:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const UpdateSearchData = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description } = req.body;
    const files = req.file;
    try {
        const base64Images = `data:${files?.mimetype};base64,${files?.buffer.toString('base64')}`;
        const result = await pool.query(
            `
            FROM search_data
            SET name = COALESCE($2, name),
                description = COALESCE($3, description)
                img = COALESCE($1, img),
            WHERE id = $4
            RETURNING id, name, description, img
             `,
            [id, name, description, base64Images]
        );


        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Item not found" });
        }

        res.status(200).json({ success: true, message: "Update Success" });
    } catch (error) {
        console.error("Database error during delete:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
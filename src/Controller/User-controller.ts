import { Request, Response } from 'express';
import pool from "../database/db.js";


export const updateProfile = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { username, img } = req.body;

    console.log("--- Update Profile Request ---");
    console.log("User ID:", id);

    try {
        const query = `
            UPDATE users
            SET username = COALESCE($1, username), 
                img = COALESCE($2, img)
            WHERE id = $3
            RETURNING id, username, email, role, img;
        `;
        
        const result = await pool.query(query, [username || null, img || null, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Profile Updated Successfully",
            user: result.rows[0]
        });
    } catch (error) {
        console.error("Update Error Detail:", error); 
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};


export const UserAllData = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'SELECT id, username, email, role, img FROM users WHERE id = $1', 
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({
            success: true,
            user: result.rows[0]
        });
    } catch (error) {
        console.error("Fetch Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
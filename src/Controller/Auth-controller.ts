import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../database/db.js';

export const signup = async (req: Request, res: Response) => {
    const { username, email, password } = req.body;
    try {
        const checkUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (checkUser.rows.length > 0) return res.status(400).json({ message: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
            [username, email, hashedPassword, 'user']
        );
        res.status(201).json({ success: true, user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Signup error' });
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (user && await bcrypt.compare(password, user.password)) {
            return res.json({
                success: true,
                user: { id: user.id, username: user.username, email: user.email, role: user.role }
            });
        }
        res.status(401).json({ message: 'Invalid email or password' });
    } catch (error) {
        res.status(500).json({ message: 'Login error' });
    }
};
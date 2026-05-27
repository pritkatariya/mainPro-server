import pool from "../database/start.js";

/**
 * Super Admin ke liye saari lessons ka data stream karne ke liye
 */
export const getAllLessons = async () => {
  const query = `
    SELECT id, name, description, department_id, section_map_id, section_id, media_url, media_type, thumbnail_url, created_at 
    FROM lessons 
    ORDER BY created_at DESC;
  `;
  try {
    return await pool.query(query);
  } catch (err) {
    console.error("[LessonService] getAllLessons Query Error:", err);
    throw err;
  }
};

/**
 * Department Main user ke liye specific department ki lessons fetch karne ke liye
 */
export const getLessonsByDept = async (dept_id: string) => {
  const query = `
    SELECT id, name, description, department_id, section_map_id, section_id, media_url, media_type, thumbnail_url, created_at 
    FROM lessons 
    WHERE department_id = $1
    ORDER BY created_at DESC;
  `;
  try {
    return await pool.query(query, [dept_id]);
  } catch (err) {
    console.error("[LessonService] getLessonsByDept Query Error:", err);
    throw err;
  }
};

/**
 * Nayi lesson create karne karne ke liye
 */
export const createLesson = async (
  name: string,
  description: string,
  department_id: string,
  media_url: string | null,
  media_type: string | null,
  thumbnail_url: string | null,
  section_id: string | null = null
) => {
  const query = `
    INSERT INTO lessons (name, description, department_id, media_url, media_type, thumbnail_url, section_id, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING id, name, description, department_id, section_id, media_url, media_type, thumbnail_url, created_at;
  `;
  try {
    return await pool.query(query, [name, description, department_id, media_url, media_type, thumbnail_url, section_id]);
  } catch (err) {
    console.error("[LessonService] createLesson Query Error:", err);
    throw err;
  }
};

/**
 * Single lesson data parameter retrieve karne ke liye
 */
export const getSingleLesson = async (id: string) => {
  const query = `
    SELECT id, name, description, department_id, section_map_id, section_id, media_url, media_type, thumbnail_url, created_at 
    FROM lessons 
    WHERE id = $1;
  `;
  try {
    return await pool.query(query, [id]);
  } catch (err) {
    console.error("[LessonService] getSingleLesson Query Error:", err);
    throw err;
  }
};

/**
 * Existing lesson ko update karne ka reactive logic layer
 */
export const updateLesson = async (
  id: string,
  name: string,
  description: string,
  media_url: string | null,
  media_type: string | null,
  thumbnail_url: string | null,
  section_id: string | null = null
) => {
  const query = `
    UPDATE lessons 
    SET name = $1, description = $2, media_url = $3, media_type = $4, thumbnail_url = $5, section_id = $6
    WHERE id = $7
    RETURNING id, name, description, department_id, section_id, media_url, media_type, thumbnail_url, created_at;
  `;
  try {
    return await pool.query(query, [name, description, media_url, media_type, thumbnail_url, section_id, id]);
  } catch (err) {
    console.error("[LessonService] updateLesson Query Error:", err);
    throw err;
  }
};

/**
 * Safe database row cleanup extraction
 */
export const deleteLesson = async (id: string) => {
  const query = `
    DELETE FROM lessons 
    WHERE id = $1
    RETURNING id, name, description;
  `;
  try {
    return await pool.query(query, [id]);
  } catch (err) {
    console.error("[LessonService] deleteLesson Query Error:", err);
    throw err;
  }
};
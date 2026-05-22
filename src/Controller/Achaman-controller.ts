import { Request, Response } from "express";
import db from "../database/db.js";
import { uploadToSupabase } from "../middleware/upload.js";

export const CreateData = async (req: Request, res: Response): Promise<Response | any> => {
  try {
    const { title } = req.body;

    const imageFile = req.file;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    if (!imageFile) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
    ];

    if (!allowedMimeTypes.includes(imageFile.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Only JPG, PNG and WEBP images are allowed",
      });
    }

    const maxSize = 5 * 1024 * 1024;

    if (imageFile.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: "Image size must be less than 5MB",
      });
    }

    const imageUrl = await uploadToSupabase(imageFile);

    const query = `
      INSERT INTO amrut_images (title, url, created_at)
      VALUES ($1, $2, NOW())
      RETURNING *;
    `;

    const values = [title.trim(), imageUrl];

    const result = await db.query(query, values);

    return res.status(201).json({
      success: true,
      message: "Image uploaded successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("CreateData Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const GetAllData = async (
  req: Request,
  res: Response
): Promise<Response | any> => {
  try {
    const query = `
      SELECT *
      FROM amrut_images
      ORDER BY created_at DESC;
    `;

    const result = await db.query(query);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      images: result.rows,
    });
  } catch (error) {
    console.error("GetAllData Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch images",
    });
  }
};

export const GetSingleData = async (
  req: Request,
  res: Response
): Promise<Response | any> => {
  try {
    const { id } = req.params;

    const query = `
      SELECT *
      FROM amrut_images
      WHERE id = $1;
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Image not found",
      });
    }

    return res.status(200).json({
      success: true,
      image: result.rows[0],
    });
  } catch (error) {
    console.error("GetSingleData Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch image",
    });
  }
};

export const DeleteData = async (
  req: Request,
  res: Response
): Promise<Response | any> => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Image ID is required",
      });
    }

    const checkQuery = `
      SELECT *
      FROM amrut_images
      WHERE id = $1;
    `;

    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Image not found",
      });
    }

    const deleteQuery = `
      DELETE FROM amrut_images
      WHERE id = $1
      RETURNING *;
    `;

    const deletedResult = await db.query(deleteQuery, [id]);

    return res.status(200).json({
      success: true,
      message: "Image deleted successfully",
      data: deletedResult.rows[0],
    });
  } catch (error) {
    console.error("DeleteData Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete image",
    });
  }
};

export const UpdateData = async (
  req: Request,
  res: Response
): Promise<Response | any> => {
  try {
    const { id } = req.params;

    const { title } = req.body;

    const imageFile = req.file;

    const checkQuery = `
      SELECT *
      FROM amrut_images
      WHERE id = $1;
    `;

    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Image not found",
      });
    }

    const existingImage = checkResult.rows[0];

    let imageUrl = existingImage.url;

    if (imageFile) {
      imageUrl = await uploadToSupabase(imageFile);
    }

    const updateQuery = `
      UPDATE amrut_images
      SET
        title = $1,
        url = $2
      WHERE id = $3
      RETURNING *;
    `;

    const values = [
      title || existingImage.title,
      imageUrl,
      id,
    ];

    const result = await db.query(updateQuery, values);

    return res.status(200).json({
      success: true,
      message: "Image updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("UpdateData Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update image",
    });
  }
};
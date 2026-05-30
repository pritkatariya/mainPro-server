import { Request, Response } from "express";
import * as AchamanService from "../services/Achaman-Service.js";

// Helper to handle params type error
const getId = (req: Request) => req.params.id as string;

export const CreateData = async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    const imageFile = req.file;
    if (!title?.trim() || !imageFile) return res.status(400).json({ success: false, message: "Title & Image required" });

    const result = await AchamanService.createNewImage(title, imageFile);
    res.status(201).json({ success: true, message: "Image uploaded successfully", data: result.rows[0] });
  } catch (error) {
    // આ લાઈન ઉમેરો, આનાથી ટર્મિનલમાં એરર દેખાશે
    console.error("CRITICAL BACKEND ERROR:", error); 
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const GetAllData = async (req: Request, res: Response) => {
  try {
    const result = await AchamanService.getAllImages();
    res.status(200).json({ success: true, data: result.rows }); 
  } catch (error) {
    console.error("Backend Error:", error); // એરર લોગ કરો
    res.status(500).json({ success: false, message: "Failed to fetch images" });
  }
};

export const GetSingleData = async (req: Request, res: Response) => {
  try {
    const result = await AchamanService.getSingleImage(getId(req));
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: "Image not found" });
    res.status(200).json({ success: true, image: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch image" });
  }
};

export const DeleteData = async (req: Request, res: Response) => {
  try {
    const result = await AchamanService.deleteImage(getId(req));
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Image not found" });
    res.status(200).json({ success: true, message: "Image deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete image" });
  }
};

export const UpdateData = async (req: Request, res: Response) => {
  try {
    const id = getId(req);
    const existing = await AchamanService.getSingleImage(id);
    if (existing.rows.length === 0) return res.status(404).json({ success: false, message: "Image not found" });

    const result = await AchamanService.updateImage(id, req.body.title, req.file, existing.rows[0]);
    res.status(200).json({ success: true, message: "Image updated successfully", data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update image" });
  }
};
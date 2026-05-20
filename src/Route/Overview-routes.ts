import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { upload } from "../middleware/upload.js";
import { getOverviewConfig, updateOverviewConfig } from "../Controller/Overview-controller.js";

const router = Router();

const overviewUpload = upload.fields([
    { name: "heroImages", maxCount: 100 },
    { name: "logoImage", maxCount: 1 },
    { name: "campusImage", maxCount: 1 },
    { name: "campusGalleryImages", maxCount: 100 },
    { name: "stackImages", maxCount: 100 },
    { name: "chromaImages", maxCount: 100 },

    // Legacy field: frontend/cache ma haju domeImages send thatu hoy to 400 na aave.
    // Controller aa field ignore kare chhe.
    { name: "domeImages", maxCount: 100 },
]);

const handleUploadErrors = (req: Request, res: Response, next: NextFunction) => {
    overviewUpload(req, res, (error: any) => {
        if (!error) {
            next();
            return;
        }

        console.error("Overview upload error:", {
            message: error.message,
            code: error.code,
            field: error.field,
        });

        if (error instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                message: error.message,
                code: error.code,
                field: error.field,
            });
        }

        return res.status(400).json({
            success: false,
            message: error.message || "File upload failed",
        });
    });
};

router.get("/config", getOverviewConfig);
router.put("/config", handleUploadErrors, updateOverviewConfig);

export default router;
import { Request, Response, NextFunction } from "express";
import { IMusicUploadBody } from "../models/Music-model.js";

/**
 * ઓડિયો ફાઇલ અપલોડ અને ટાઇટલ વેલિડેટ કરવાનું મિડલવેર
 */
export const validateMusicUpload = (req: Request, res: Response, next: NextFunction): any => {
    let audioFile = req.file;

    // જો મલ્ટીપલ ફાઇલ્સ એરે ફીલ્ડમાંથી આવતી હોય
    if (!audioFile && (req.files as any)?.audio) {
        audioFile = (req.files as any).audio[0];
    }

    if (!audioFile) {
        return res.status(400).json({
            success: false,
            message: "વેલિડેશન ભૂલ: MP3 ઓડિયો ફાઇલ અપલોડ કરવી ફરજિયાત છે."
        });
    }

    const body = req.body as IMusicUploadBody;
    if (!body.title || String(body.title).trim() === "") {
        return res.status(400).json({
            success: false,
            message: "વેલિડેશન ભૂલ: ઓડિયો ટ્રેકનું ટાઇટલ/નામ લખવું ફરજિયાત છે."
        });
    }

    // ફાઇલ ઓબ્જેક્ટને પાછો સેવ કરો જેથી કંટ્રોલરમાં રી-યુઝ કરી શકાય
    req.file = audioFile;
    next();
};

/**
 * ડિલીટ એક્શન માટે URL Param ID વેલિડેશન
 */
export const validateMusicParamId = (req: Request, res: Response, next: NextFunction): any => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return res.status(400).json({
            success: false,
            message: "વેલિડેશન ભૂલ: અમાન્ય (Invalid) ઓડિયો ટ્રેક આઈડી."
        });
    }

    next();
};
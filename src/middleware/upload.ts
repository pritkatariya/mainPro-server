import multer from 'multer';
import path from 'path';

// ઈમેજ ક્યાં સેવ કરવી અને તેનું નામ કેવું રાખવું તેનું સેટિંગ
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // પ્રોજેક્ટના મેઈન ફોલ્ડરમાં 'uploads' નામનું ફોલ્ડર
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname)); // દા.ત. 17154728-45214.jpg
    }
});

// ફક્ત ઇમેજ ફાઇલો જ અપલોડ થાય તે માટે ફિલ્ટર
const fileFilter = (req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

export const upload = multer({ storage, fileFilter });
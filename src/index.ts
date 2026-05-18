import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import rootRouter from './Route/Routes.js'; // તમારા રાઉટ્સનો સાચો પાથ

const app = express();
const PORT = process.env.PORT || 3000;

// 🛡️ ૧. CORS અને પ્રી-ફ્લાઇટ (OPTIONS) એરર ફિક્સ મિડલવેર
// આ કોડ ફ્રન્ટએન્ડ (5173) માંથી આવતી PATCH મેથડને ડાયરેક્ટ એલાઉ કરશે 👍
app.use((req: Request, res: Response, next: NextFunction) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:5173");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    
    // જો બ્રાઉઝર ચેક કરવા માટે OPTIONS રિક્વેસ્ટ મોકલે, તો તેને અહીંથી જ 200 ઓકે આપી દેવું
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

// નોર્મલ સેફ્ટી માટે ક્રોસ-ઓરિજિન મિડલવેર કન્ફિગરેશન
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 📦 ૨. એક્સપ્રેસ ઇનબિલ્ટ મિડલવેર્સ
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 📸 ૩. ઈમેજ/ફોટો ડાઉનલોડ પાથ સેટઅપ (Static Files)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 🛣️ ૪. સેન્ટ્રલ રાઉટીંગ સિસ્ટમ કનેક્શન
app.use('/', rootRouter);

// 🌍 ૫. હેલ્થ ચેક રાઉટ (સર્વર ચાલુ છે કે નહીં તે જોવા)
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ success: true, message: "Gurukul Backend Server is running perfectly! 🚀" });
});

// 🚀 ૬. સર્વર લિસનર
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 SERVER IS RUNNING ON PORT: ${PORT}`);
    console.log(`🔒 CORS FOR PATCH METHOD IS ACTIVATED`);
    console.log(`=========================================`);
});
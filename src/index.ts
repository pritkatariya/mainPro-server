import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import overviewRoutes from './Route/Overview-routes.js';
import rootRouter from './Route/Routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req: Request, res: Response, next: NextFunction) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:5173");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/overview', overviewRoutes); // 🎯 આ લાઇન અહીં હોવી અત્યંત જરૂરી છે!
app.use('/', rootRouter);

app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ success: true, message: "Gurukul Backend Server is running perfectly! 🚀" });
});

app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 SERVER IS RUNNING ON PORT: ${PORT}`);
    console.log(`🔒 CORS FOR PATCH METHOD IS ACTIVATED`);
    console.log(`=========================================`);
});
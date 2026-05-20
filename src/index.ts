import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import overviewRoutes from './Route/Overview-routes.js';
import rootRouter from './Route/Routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
    'http://localhost:5173', 
    'https://gurukul-ochre.vercel.app'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json({ limit: '5000mb' }));
app.use(express.urlencoded({ limit: '5000mb', extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/overview', overviewRoutes);
app.use('/', rootRouter);

app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ success: true, message: "Gurukul Backend Server is running perfectly! 🚀" });
});

app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 SERVER IS RUNNING ON PORT: ${PORT}`);
    console.log(`✅ CORS IS CONFIGURED FOR PRODUCTION`);
    console.log(`=========================================`);
});
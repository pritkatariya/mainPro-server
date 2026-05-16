import express from 'express';
import cors from 'cors';
import router from './Route/Routes.js'; 

const app = express();

// 1. CORS મિડલવેર - લાઈવ Vercel અને Localhost બંને માટે સેટિંગ
const allowedOrigins = [
    'http://localhost:5173', // લોકલ ફ્રન્ટએન્ડ માટે
    'https://gurukul-ochre.vercel.app' // તમારા લાઈવ Vercel ડોમેન માટે
];

app.use(cors({
    origin: function (origin, callback) {
        // જો કોઈ ઓરિજિન ન હોય (જેમ કે Postman) અથવા એલાઉડ લિસ્ટમાં હોય
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

// 2. બોડી પાર્સર મિડલવેર
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 3. રાઉટ્સ સેટિંગ
app.use('/', router); 

// 4. સર્વર લિસનર - Render નો પોર્ટ ઓટોમેટિકલી લેવા માટે
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Backend running on port ${PORT}`);
});
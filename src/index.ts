import express from 'express';
import cors from 'cors';
import path from 'path'; 
import fs from 'fs';     
import router from './Route/Routes.js'; 

const app = express();

// જો 'uploads' ફોલ્ડર ન હોય, તો સર્વર રન થતા જ આપોઆપ બની જશે
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

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
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ઈમેજ લાઈવ URL તરીકે એક્સેસ કરવા માટે સ્ટેટિક ફોલ્ડર સેટઅપ
app.use('/uploads', express.static(uploadDir));

app.use('/', router); 

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Backend running on port ${PORT}`);
});
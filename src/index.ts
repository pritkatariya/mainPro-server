import express from 'express';
import cors from 'cors';
import router from './Route/Routes.js'; // 💡 જો tsconfig માં NodeNext હોય તો .js રાખો, Bundler હોય તો કાઢી નાખો.

const app = express();

// 1. CORS મિડલવેર (સૌથી ઉપર હોવું જરૂરી છે)
app.use(cors({
    origin: 'http://localhost:5173', // ફ્રન્ટએન્ડનો પોર્ટ
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

// 2. બોડી પાર્સર મિડલવેર (આના વગર POST રિક્વેસ્ટનો ડેટા નહીં વંચાય અને 404 કે એરર આવી શકે)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 3. રાઉટ્સ સેટિંગ (આ લાઇન ખાસ ચેક કરો)
app.use('/', router); 

// 4. સર્વર લિસનર
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
});
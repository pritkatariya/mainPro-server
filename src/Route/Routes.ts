import { Router } from 'express';
import { upload } from '../middleware/upload.js'; // સાચો મિડલવેર ઈમ્પોર્ટ કર્યો
import * as AuthController from '../Controller/Auth-controller.js';
import * as UserController from '../Controller/User-controller.js';
import * as RoleController from '../Controller/Role-controller.js';

const router = Router();

// ઓથેન્ટિકેશન રાઉટ
router.post('/auth/login', AuthController.login);

// યુઝર રાઉટ્સ (upload.single('image') ઉમેર્યું છે જે ફ્રન્ટએન્ડમાંથી આવતી ફાઈલ હેન્ડલ કરશે)
router.post('/create/user', upload.single('image'), UserController.createUser);
router.get('/user/alldata', UserController.UserAllDataList);

// રોલ રાઉટ્સ
router.post('/cteate/role', RoleController.createRole);
router.get('/roll/alldata', RoleController.RoleAllData);

export default router;
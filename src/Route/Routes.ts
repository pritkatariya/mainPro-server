import { Router } from 'express';
import multer from 'multer';
import * as AuthController from '../Controller/Auth-controller';
import * as UserController from '../Controller/User-controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/auth/login', AuthController.login);


router.post('/create/user', UserController.createUser);
router.get('/user/alldata', UserController.UserAllDataList)

export default router;
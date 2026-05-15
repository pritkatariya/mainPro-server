import { Router } from 'express';
import multer from 'multer';
import * as SearchController from '../Controller/Search-controller.js';
import * as AuthController from '../Controller/Auth-controller.js';
import * as UserController from "../Controller/User-controller.js"

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Auth Routes
router.post('/auth/signup', upload.single('image'), AuthController.signup);
router.post('/auth/login', AuthController.login);

// User Routes
router.put('/profile/update/:id', UserController.updateProfile);
router.get('/profile/userdata/:id', UserController.UserAllData);

// Search & Upload Routes
router.get('/search', SearchController.searchData);
router.get('/search/upload/Alldata', SearchController.getAllData);
router.post('/search/upload', upload.single('image'), SearchController.uploadData);
router.delete('/search/delete/:id', SearchController.DeleteSearchData);
router.put('/search/update/:id', SearchController.UpdateSearchData);

export default router;
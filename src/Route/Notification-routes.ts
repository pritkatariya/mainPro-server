import { Router } from 'express';
import { createPasswordResetNotification } from '../Controller/Notification-controller.js';
import { verifyDepartmentAssignment } from '../middleware/VerifyDepartment-middleware.js';

const router = Router();

router.post('/submit-reset', verifyDepartmentAssignment, createPasswordResetNotification);

export default router;
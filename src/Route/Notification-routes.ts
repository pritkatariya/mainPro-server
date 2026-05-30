import { Router } from 'express';
import { 
    createPasswordResetNotification,
    getFilteredNotifications,
    updateNotificationStatus,
    deleteNotification,
    markNotificationRead,
    markAllNotificationsReadForUser,
    createWelcomeNotification
} from '../Controller/Notification-controller.js';
import { verifyDepartmentAssignment } from '../middleware/VerifyDepartment-middleware.js';

const router = Router();

// ---------------------------------------------------
// Notification Routes
// ---------------------------------------------------

// ૧. Password Reset Application સબમિટ કરવા માટે (મિડલવેર સાથે)
router.post('/submit-reset', verifyDepartmentAssignment, createPasswordResetNotification);

// ૨. નોટિફિકેશન મેળવવા માટે (ડેશબોર્ડમાં જોવા)
router.get('/get-filtered-notifications', getFilteredNotifications);

// ૩. નોટિફિકેશનનું સ્ટેટસ અપડેટ કરવા માટે (Approve/Decline/Final Password Reset)
router.put('/notification/status-update/:id', updateNotificationStatus);

// ૪. નોટિફિકેશન ડીલીટ કરવા માટે (મેન્યુઅલ ડીલીટ)
router.delete('/notification/delete/:id', deleteNotification);

// ૫. કોઈ એક ચોક્કસ નોટિફિકેશનને Read માર્ક કરવા માટે
router.put('/notification/read/:id', markNotificationRead);

// ૬. યુઝરના બધા જ નોટિફિકેશનને એકસાથે Read માર્ક કરવા માટે
router.put('/notification/read-all/:userId', markAllNotificationsReadForUser);

// ૭. નવો Welcome મેસેજ જનરેટ કરવા માટે (જ્યારે નવું એકાઉન્ટ બને ત્યારે આ API હિટ થશે)
router.post('/welcome', createWelcomeNotification);

export default router;
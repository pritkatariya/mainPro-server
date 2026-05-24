import { Router } from "express";
import * as UserController from "../Controller/User-controller.js";
import * as AuthController from "../Controller/Auth-controller.js";
import * as RoleController from "../Controller/Role-controller.js";
import * as GMusicController from "../Controller/Gmusic-controller.js";
import * as ArtController from "../Controller/Art-controller.js";
import * as ApplicationController from "../Controller/Application-controller.js";
import * as NotificationController from "../Controller/Notification-controller.js";
import {
    getAllSongs,
    uploadSong,
    deleteSong,
} from "../Controller/Music-controller.js";
import {
    CreateData,
    GetAllData,
    GetSingleData,
    DeleteData,
    UpdateData,
} from "../Controller/Achaman-controller.js";
import { verifySuidUser } from "../middleware/Verify-suid.js";
import { upload } from "../middleware/upload.js";
import overviewRoutes from "./Overview-routes.js";

const router = Router();

router.use("/overview", overviewRoutes);
router.get("/music/songs",getAllSongs);

router.post("/music/upload",upload.single("audio"),uploadSong);
router.delete("/music/songs/:id",deleteSong);
router.post("/auth/login",AuthController.login);
router.get("/auth/departments",AuthController.getAllDepartments);
router.post("/auth/forgot-password-request",verifySuidUser,ApplicationController.submitApplication);

router.post("/create/user",upload.single("image"),UserController.createUser);
router.get("/user/alldata",UserController.UserAllDataList);
router.put("/user/update/:id",upload.single("image"),UserController.updateUser);
router.delete("/user/delete/:id",UserController.deleteUser);
router.delete("/admit-request/delete-by-suid/:suid",UserController.deleteRequestBySuid);

router.get("/user/notifications/:userId",UserController.getUserLiveNotifications);
router.post("/auth/create-role",RoleController.createRole);
router.get("/auth/role/alldata",RoleController.RoleAllData);
router.get("/roll/alldata",RoleController.RoleAllData);
router.get("/auth/role/update/:id",RoleController.GetRoleById);

router.put("/auth/role/update/:id",RoleController.EditRoleById);
router.delete("/auth/role/delete/:id",RoleController.deleteRoleById);
router.post("/g-music/create-request",upload.single("image"),GMusicController.createGMusicRequest);
router.get("/g-music/admit-list",GMusicController.getGMusicRequests);
router.get("/g-music/onboarded-users",GMusicController.getOnboardedGMusicUsers);

router.post("/g-music/admit-request/approve/:id",GMusicController.approveGMusicRequest);
router.post("/g-music/admit-request/decline/:id",GMusicController.declineGMusicRequest);
router.post("/gurukul-art/create-request",upload.single("image"),ArtController.createGurukulArtRequest);
router.get("/gurukul-art/admit-list",ArtController.getGurukulArtRequests);
router.get("/gurukul-art/onboarded-users",ArtController.getOnboardedGurukulArtUsers);

router.post("/gurukul-art/admit-request/approve/:id",ArtController.approveGurukulArtRequest);
router.post("/gurukul-art/admit-request/decline/:id",ArtController.declineGurukulArtRequest);
router.get("/student/get-filtered-notifications",ApplicationController.getAllApplications);
router.put("/student/notification/status-update/:id", ApplicationController.updateApplicationStatus);
router.delete("/student/notification/delete/:id",ApplicationController.deleteApplication);
router.put("/student/notification/mark-read/:id", NotificationController.markNotificationRead);
router.put("/student/notification/mark-all-read/:userId", NotificationController.markAllNotificationsReadForUser);

router.post("/amrut-images",upload.single("image"),CreateData);
router.get("/amrut-images",GetAllData);
router.get("/amrut-images/:id",GetSingleData);
router.put("/amrut-images/:id",upload.single("image"),UpdateData);
router.delete("/amrut-images/:id",DeleteData);

export default router;
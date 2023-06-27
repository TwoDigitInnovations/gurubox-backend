"use strict";
const router = require("express").Router();
const user = require("../../app/controller/user");
const job = require("../../app/controller/job");
const event = require("../../app/controller/event");
const admin = require("../../app/controller/admin");
const { upload } = require("./../../app/services/fileUpload");
const isAuthenticated = require("./../../middlewares/isAuthenticated");

// auth routes
router.post("/login", user.login);
router.post("/signUp", user.signUp);
router.post(
  "/createorganizer",
  isAuthenticated(["USER", "ADMIN"]),
  user.createOrganizaton
);

router.post("/login", user.login);
router.post("/sendOTP", user.sendOTP);
router.post("/verifyOTP", user.verifyOTP);
router.post("/changePassword", user.changePassword);

// Service User
router.post("/jobs", isAuthenticated(["USER", "ADMIN"]), job.createJob);
router.get(
  "/user/jobs",
  isAuthenticated(["USER", "ADMIN"]),
  job.listProviderJobs
);
router.get(
  "/user/jobs/:job_id",
  isAuthenticated(["USER", "ADMIN"]),
  job.jobDetails
);
router.delete(
  "/jobs/:job_id",
  isAuthenticated(["USER", "ADMIN"]),
  job.deleteJob
);
router.put("/jobs/:job_id", isAuthenticated(["USER", "ADMIN"]), job.updateJob);
router.put(
  "/user/review/:review_id?",
  isAuthenticated(["USER"]),
  job.addReview
);
router.get(
  "/user/history/:filter",
  isAuthenticated(["USER", "ADMIN"]),
  job.history
);
router.get("/user/config", job.getConfig);
router.post(
  "/settings",
  isAuthenticated(["USER", "ORG", "ADMIN"]),
  user.updateSettings
);
router.get(
  "/settings",
  isAuthenticated(["USER", "ORG", "ADMIN"]),
  user.getSettings
);
// Service Provider
router.post(
  "/provider/incident",
  isAuthenticated(["ORG"]),
  upload.array("file", 10),
  job.addIncident
);
router.post(
  "/provider/getAllIncident",
  isAuthenticated(["USER", "ADMIN"]),
  job.getIncidents
);
router.post("/provider/jobs/near", isAuthenticated(["ORG"]), job.jobsNearMe);
router.get(
  "/provider/jobs/available/:filter?",
  isAuthenticated(["ORG"]),
  job.availableJobs
);
router.put("/jobs/apply/:job_id", isAuthenticated(["ORG", "ADMIN"]), job.apply);
router.get("/provider/myjobs", isAuthenticated(["ORG"]), job.upcommingJobs);
router.get(
  "/provider/history/:filter",
  isAuthenticated(["ORG"]),
  job.historyProvider
);
// service provide + User
router.get(
  "/jobs/:job_id",
  isAuthenticated(["USER", "ORG", "ADMIN"]),
  job.getJob
);
router.delete(
  "/jobs/reject/:job_id",
  isAuthenticated(["ORG"]),
  job.rejectInvite
);
router.post(
  "/profile/changePassword",
  isAuthenticated(["USER", "ORG"]),
  user.changePasswordProfile
);

router.get("/me", isAuthenticated(["USER", "ORG", "ORG"]), user.me);
router.post(
  "/profile/update",
  isAuthenticated(["USER", "ORG", "ADMIN"]),
  user.updateUser
);

router.post(
  "/profile/file",
  isAuthenticated(["USER", "ORG"]),
  upload.single("file"),
  user.fileUpload
);

router.get(
  "/notification",
  isAuthenticated(["USER", "ORG"]),
  user.notification
);
router.delete(
  "/notification/:not_id?",
  isAuthenticated(["USER", "ORG"]),
  user.deleteNotification
);

router.post("/jobEvents", isAuthenticated(["ORG"]), job.jobEvents);

router.post(
  "/admin/jobs",
  isAuthenticated(["ADMIN", "USER"]),
  job.formatedJobs
);
router.post(
  "/admin/jobs/:job_id/assign",
  isAuthenticated(["ADMIN", "USER"]),
  job.assign
);

router.get("/organizations", isAuthenticated(["ADMIN"]), user.allOrganization);

router.post(
  "/user/guardList",
  isAuthenticated(["USER", "ADMIN"]),
  user.guardListWithIdentity
);
router.post(
  "/user/guardListSearch",
  isAuthenticated(["USER", "ADMIN"]),
  user.guardListSearch
);

// ADMIN routes
router.post(
  "/admin/invoice/note/:invoice_id",
  isAuthenticated(["USER", "ADMIN"]),
  admin.addNote
);

// Statistics
router.get(
  "/admin/stats/2/:org_id/:view?",
  isAuthenticated(["USER", "ADMIN"]),
  admin.getStatsOfResources
);
router.get(
  "/admin/stats/4/:org_id/:view?",
  isAuthenticated(["USER", "ADMIN"]),
  admin.getStatsOfClients
);
router.get(
  "/admin/stats/1/:org_id/:view?",
  isAuthenticated(["USER", "ADMIN"]),
  admin.getStatsOfNetIncome
);
router.get(
  "/admin/stats/3/:org_id/:view?",
  isAuthenticated(["USER", "ADMIN"]),
  admin.getStatsOfIncome
);
// DashBoard stats
router.get(
  "/admin/dashboard/stats",
  isAuthenticated(["USER", "ADMIN"]),
  admin.dashboardStats
);
// RepeatJob API
router.post(
  "/admin/repeatJob/:job_id",
  isAuthenticated(["USER", "ADMIN"]),
  admin.repeatJob
);

router.get(
  "/admin/gaurdPay",
  isAuthenticated(["USER", "ADMIN"]),
  admin.gaurdPay
);

router.get(
  "/admin/gaurdJobHistory/:gaurd",
  isAuthenticated(["USER", "ADMIN"]),
  admin.gaurdJobHistory
);

router.post(
  "/admin/invoice",
  isAuthenticated(["USER", "ADMIN"]),
  admin.generateInvoice
);
router.get(
  "/admin/invoice/:invoice_id?",
  isAuthenticated(["USER", "ADMIN"]),
  admin.getInvoice
);
router.patch(
  "/admin/invoice/:invoice_id/status",
  isAuthenticated(["USER", "ADMIN"]),
  admin.updateStatus
);
router.delete(
  "/admin/invoice/:invoice_id",
  isAuthenticated(["USER", "ADMIN"]),
  admin.deleteInvoice
);

//Surya's code
//test commeit

router.post(
  "/user/verifyGuard",
  isAuthenticated(["USER", "ADMIN"]),
  user.verifyGuard
);
router.post(
  "/jobs/historyUserSearch",
  isAuthenticated(["USER", "ADMIN"]),
  job.historyUserSearch
);
router.post(
  "/user/getStaff",
  isAuthenticated(["USER", "ADMIN"]),
  user.getStaffList
);

router.post(
  "/provider/regClient",
  isAuthenticated(["USER", "ADMIN"]),
  user.regNewClient
);
router.get(
  "/provider/client/:client_id?",
  isAuthenticated(["USER", "ADMIN"]),
  user.getAllClients
);
router.delete(
  "/provider/client/:client_id",
  isAuthenticated(["USER", "ADMIN"]),
  user.deleteClient
);
router.put(
  "/provider/client/:client_id",
  isAuthenticated(["USER", "ADMIN"]),
  user.updateClient
);

// festa event
router.post("/festa/create-event", admin.createEvent);
router.post("/festa/delete-event", admin.deleteEvent);
router.get("/festa/get-event", admin.getevent);

////event
router.post("/create-event", isAuthenticated(["ADMIN", "ORG"]), event?.create);
router.post(
  "/update-event/:event_id",
  isAuthenticated(["ADMIN", "ORG"]),
  event?.updtaeEvent
);
router.get("/get-event", event?.getAllEvents);
router.get("/get-event/:event_id", event?.getEventById);
router.get(
  "/range/get-event?",
  isAuthenticated(["ADMIN", "ORG"]),
  event?.getAllEventsbyFilter
);

router.get(
  "/org/get-event",
  isAuthenticated(["ADMIN", "ORG"]),
  event?.getAllEventsByUser
);

router.get(
  "/dashboard/get-event?",
  isAuthenticated(["ADMIN", "ORG"]),
  event?.getAllEventsforDashBoard
);

router.get("/get-event/similier/:id", event?.getSimilierEvent);
router.get("/event/globalSearch", event?.globalSearchEvents);

router.post(
  "/create-booking",
  isAuthenticated(["USER", "ADMIN", "ORG"]),
  event?.createBookig
);
router.post(
  "/update-booking/:book_id",
  isAuthenticated(["USER", "ADMIN", "ORG"]),
  event?.updateBookig
);
router.get("/get-booking", event?.getBooking);
router.get(
  "/user/get-booking",
  isAuthenticated(["USER", "ADMIN", "ORG"]),
  event?.getBookingByUser
);
router.get(
  "/get-booking/:book_id",
  isAuthenticated(["USER", "ADMIN", "ORG"]),
  event?.getBookingById
);

router.delete(
  "/delete-booking/:book_id",
  isAuthenticated(["USER", "ADMIN", "ORG"]),
  event?.deleteBoking
);

router.post(
  "/sendPdf",
  isAuthenticated(["USER", "ADMIN", "ORG"]),
  event.sendMailWithPdf
);

//help
router.post(
  "/create-help",
  isAuthenticated(["USER", "ADMIN", "ORG"]),
  user.createHelp
);

router.get(
  "/get-help",
  isAuthenticated(["USER", "ADMIN", "ORG"]),
  user.getHelp
);

router.get(
  "/user/get-help",
  isAuthenticated(["USER", "ADMIN", "ORG"]),
  user.getHelpByUser
);

module.exports = router;

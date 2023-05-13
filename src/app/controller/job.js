const mongoose = require("mongoose");
const response = require('./../responses');
const Job = mongoose.model('Job');
const Review = mongoose.model('Review');
const Incident = mongoose.model('Incident');
const JobInvite = mongoose.model('JobInvite');
const Photo = mongoose.model('Photo');
const dayjs = require("dayjs");

const notification = require("./../services/notification");
const userHelper = require('./../helper/user');

const JobStatus = {
    'REVOKED': "Reassigned to someone else.",
    'DELETED': "Job no longer available.",
    'PUBLIC': "Job made public."
};

const compareArrays = (a, b) => {
    if (a.length !== b.length) return false;
    else {
        // Comparing each element of your array
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    }
}

module.exports = {

    createJob: async (req, res) => {
        try {
            const jobDetails = req.body;
            let job = new Job(jobDetails);
            job.startDate = new Date(jobDetails.startDate).getTime();
            job.endDate = new Date(jobDetails.endDate).getTime();
            job.posted_by = jobDetails.posted_by ? jobDetails.posted_by : req.user.id;
            if (jobDetails.staff && jobDetails.staff.length > 0) {
                job.public = false;
                const user = await userHelper.find({ _id: job.posted_by }).lean();
                for (let i = 0; i < jobDetails.staff.length; i++) {
                    let JobIn = await JobInvite.create({ invited: jobDetails.staff[i], job: job._id, by: job.posted_by });
                    notification.push(jobDetails.staff[i], `You have been invited by ${user.username} for a job.`, JobIn._id);
                }
                job.invited = jobDetails.staff;
            }
            job.location = {
                type: 'Point',
                // [longitude, latitude]
                coordinates: jobDetails.location
            }

            const date1 = dayjs(jobDetails.startDate);
            const date2 = dayjs(jobDetails.endDate);
            job.job_hrs = date2.diff(date1, 'hour', true);

            if (jobDetails.client_id) {
                job.client = jobDetails.client_id;
            }

            await job.save();
            return response.ok(res, { id: job._id, message: "Job created!" });
        } catch (error) {
            return response.error(res, error);
        }
    },
    deleteJob: async (req, res) => {
        try {
            let job_id = req.params["job_id"];
            // await Job.deleteOne({ _id: job_id });
            let job = await Job.findById(job_id);
            await job.remove();
            for (let i = 0; i < job.applicant.length; i++) {
                notification.notify(job.applicant[i], 'Job no longer available.');
            }
            await JobInvite.updateMany({ job: job_id }, { job_status: 'DELETED' });
            return response.ok(res, { message: "Job deleted!" });
        } catch (error) {
            return response.error(res, error);
        }
    },
    getJob: async (req, res) => {
        try {
            let job_id = req.params["job_id"];
            const job = await Job.findById(job_id).populate('invited', 'username fullName').lean();
            return response.ok(res, { job });
        } catch (error) {
            return response.error(res, error);
        }
    },
    updateJob: async (req, res) => {
        try {
            let job_id = req.params["job_id"];
            const job = await Job.findById(job_id).lean();
            // console.log("Job time changed logs", req.body.startDate,  job.startDate);
            req.body.location = {
                type: 'Point',
                // [longitude, latitude]
                coordinates: req.body.location
            }
            req.body.client = req.body.client_id;

            let staff = req.body.staff;
            let jobInvites = await JobInvite.find({ job: job_id, job_status: 'ACTIVE' });
            let staff_ids = jobInvites.map(j => j.invited.toString());

            if (job.public == false && req.body.public == true) {
                await JobInvite.updateMany({ job: job_id }, { job_status: 'PUBLIC' });
                req.body.invited = [];
                req.body.applicant = [];
                req.body.public = true;
            } else if (staff && (!compareArrays(staff_ids, staff))) {
                let toAdd = staff.filter(x => !staff_ids.includes(x));
                let posted_by = req.body.posted_by ? req.body.posted_by : req.user.id;
                const user = await userHelper.find({ _id: posted_by }).lean();
                for (let i = 0; i < toAdd.length; i++) {
                    let JobIn = await JobInvite.create({ invited: toAdd[i], job: job_id, by: posted_by });
                    notification.push(toAdd[i], `You have been invited by ${user.username} for a job.`, JobIn._id);
                }
                // if applied then send new notification
                let toRemove = staff_ids.filter(x => !staff.includes(x));
                await JobInvite.updateMany({ job: job_id, invited: { $in: toRemove } }, { job_status: 'REVOKED' });
                //notification that JOb revoked
                for (let i = 0; i < toRemove.length; i++) {
                    notification.notify(toRemove[i], 'Job has been assigned to someone else.');
                }
                req.body.applicant = job.applicant.filter(a => !toRemove.includes(a.toString()));

                console.log("staff in body", staff);
                console.log("staff in Previous state", staff_ids);
                console.log("staff toAdd", toAdd);
                console.log("staff toRemove", toRemove);
                console.log("applicant before", job.applicant);
                console.log("applicant after", req.body.applicant);

                req.body.invited = staff;
                req.body.public = false;
            } else {
                await JobInvite.updateMany({ job: job_id }, { job_status: 'ACTIVE', status: 'PENDING' });
                // req.body.invited = [];
                req.body.applicant = [];
                for (let i = 0; i < staff_ids; i++) {
                    notification.notify(staff_ids[i], 'Job Updated.');
                }
            }

            await Job.findByIdAndUpdate(job_id, req.body);
            return response.ok(res, { message: "Job updated!" });
        } catch (error) {
            return response.error(res, error);
        }
    },
    listProviderJobs: async (req, res) => {
        try {
            const jobs = await Job.find({ posted_by: req.user.id, endDate: { $gt: new Date().getTime() } });
            return response.ok(res, { jobs });
        } catch (error) {
            return response.error(res, error);
        }

    },
    addReview: async (req, res) => {
        try {
            const reviewDetails = req.body;
            reviewDetails.posted_by = req.user.id;
            if (req.params["review_id"]) {
                await Review.findByIdAndUpdate(req.params["review_id"], reviewDetails, { upsert: true });
            } else {
                let review = new Review({
                    title: reviewDetails.title,
                    details: reviewDetails.details,
                    rating: reviewDetails.rating,
                    job: reviewDetails.job_id,
                    posted_by: req.user.id,
                    for: reviewDetails.for
                });
                await review.save();
            }
            return response.ok(res, { message: "Review Added!" });
        } catch (error) {
            return response.error(res, error);
        }
    },
    addIncident: async (req, res) => {
        try {
            const incidentDetails = req.body;
            const incident = new Incident({
                title: incidentDetails.title,
                details: incidentDetails.details,
                job: incidentDetails.job_id,
                posted_by: req.user.id
            });
            if (req.files.length) {
                const files = req.files;
                for (let f = 0; f < files.length; f++) {
                    await Photo.create({ key: files[f].key, incident_id: incident._id })
                }
            }
            await incident.save();
            return response.ok(res, { message: "Incident Added!" });
        } catch (error) {
            return response.error(res, error);
        }
    },
    getIncidents: async (req, res) => {
        try {
            let incidents = await Incident.find({}).populate("posted_by", 'fullName').lean();
            // let ids = incidents.map(i => i._id);
            // const photos = await Photo.find({ incident_id: { $in: ids } });

            // incidents = incidents.map

            return response.ok(res, { incident: incidents });
        } catch (error) {
            return response.error(res, error);
        }
    },
    getConfig: async (req, res) => {
        try {
            return response.ok(res, {
                title: [
                    // { type: "marriage_security", name: "Marrige Security Guard" },
                    { type: "event_security", name: "Event Security" },
                    { type: "body_guards", name: "Body Guards" },
                    { type: "concierge_receptionist", name: "Concierge/Receptionist" },
                    { type: "door_staff", name: "Door Staff" },
                    { type: "club_security", name: "Club Security" },
                    { type: "canine_dog_handlers", name: "Canine/Dog handlers" },
                    { type: "retail_security", name: "Retail Security" },
                    { type: "key_holdings", name: "Key Holdings" },
                    { type: "carpark_security", name: "Carpark Security" },
                    { type: "access_patrol", name: "Access patrol" },
                    { type: "empty_property", name: "Empty Property" },],
                jobType: [
                    { type: "event", name: "Event type" },
                    { type: "job", name: "Job type" },
                    { type: "security", name: "Security type" },
                    { type: "other", name: "Other type" }
                ],
                incidenceType: [
                    { type: "thieft", name: "Thieft" },
                    { type: "fight", name: "Fight" },
                    { type: "fire", name: "Fire" },
                    { type: "damage_to_property", name: "Damage To Property" },
                    { type: "others", name: "Others" },
                ]
            });
        } catch (error) {
            return response.error(res, error);
        }
    },
    jobDetails: async (req, res) => {
        try {
            const job = await Job.findById(req.params["job_id"]).populate("applicant", "fullName profile username").lean();
            const ids = job.applicant.map(a => a._id);
            const reviews = await Review.find({ for: { $in: ids }, job: job._id }).lean();
            const hash = {};
            reviews.map(r => {
                hash[r.for] = r;
            });
            job.applicant.map(a => {
                a.review = hash[a._id];
            });
            return response.ok(res, { job });
        } catch (error) {
            return response.error(res, error);
        }
    },
    availableJobs: async (req, res) => {
        try {
            let filter = req.params["filter"];
            const cond = { startDate: { $gt: new Date() }, public: true, applicant: { $ne: req.user.id } };
            let jobs = [];
            if (filter == 'ALL') {
                jobs = await Job.find(cond).lean();
            } else {
                jobs = await Job.find(cond).limit(5).lean();
            }
            jobs = jobs.map(j => {
                if (j.applicant && j.applicant.indexOf(req.user.id) > -1) {
                    j.applied = true;
                }
                return j;
            });
            return response.ok(res, { jobs });
        } catch (error) {
            return response.error(res, error);
        }
    },
    jobsNearMe: async (req, res) => {
        try {
            console.log("nearBy location", req.body.location);
            let user = await userHelper.find({ _id: req.user.id });
            let jobs = await Job.find({
                public: true,
                applicant: { $ne: req.user.id },
                location: {
                    $near: {
                        $maxDistance: (1609.34 * user.distance),
                        $geometry: {
                            type: "Point",
                            coordinates: req.body.location  // [lang, lat]
                        }
                    }
                }
            }).lean();
            return response.ok(res, { jobs });
        } catch (error) {
            return response.error(res, error);
        }
    },
    upcommingJobs: async (req, res) => {
        try {
            let jobs = await Job.find({ endDate: { $gte: new Date().getTime() }, applicant: req.user.id }).sort({ startDate: -1 }).lean();
            return response.ok(res, { jobs });
        } catch (error) {
            return response.error(res, error);
        }
    },
    apply: async (req, res) => {
        try {
            const n_p = req.query["notification_page"];
            const n_id = req.query["invite_id"];
            let jobInvite;
            if (n_p) {
                const cond = { job: req.params["job_id"] };
                if (n_id) cond._id = mongoose.Types.ObjectId(n_id);
                jobInvite = await JobInvite.findOne(cond);
                if (jobInvite.job_status !== 'ACTIVE') {
                    return response.ok(res, { status: false, message: JobStatus[jobInvite.job_status] });
                }
            }
            let job = await Job.findById(req.params["job_id"]);
            if (!job) return response.notFound(res, { message: "Job does not exist." });
            let set = new Set(job.applicant.map(a => a.toString()));
            if (set.has(req.user.id)) {
                return response.ok(res, { message: "You already applied to this job!" });
            }
            if (set.size == job.person) {
                return response.ok(res, { message: "Vacancy Full!" });
            }
            job.applicant.push(req.user.id);
            await job.save();
            if (n_p && jobInvite) {
                jobInvite.status = 'ACCEPTED';
                await jobInvite.save();
            }
            notification.push(job.posted_by, `${req.user.user} ${n_p ? "accepted" : "applied"} and selected on the job you ${n_p ? "invited" : "posted"}.`);
            return response.ok(res, { message: n_p ? "Job Accepted" : "Job applied!" });
        } catch (error) {
            return response.error(res, error);
        }
    },

    assign: async (req, res) => {
        try {
            let job = await Job.findById(req.params["job_id"]);
            if (!job) return response.notFound(res, { message: "Job does not exist." });
            job.applicant.push(...req.body.applicant);
            await job.save();
            for (let u of req.body.applicant) {
                let JobIn = await JobInvite.create({ invited: u, job: job._id, status: 'ASSIGNED', by: req.user.id });
                notification.push(u, "You have been assigned a job.", JobIn._id);
            }
            return response.ok(res, { message: "Job assigned!" });
        } catch (error) {
            return response.error(res, error);
        }
    },

    historyProvider: async (req, res) => {
        try {
            let filter = req.params["filter"];
            let cond = {};
            let d = new Date();
            let de = new Date();

            if (filter == '1_WEEK') {
                cond = { startDate: { $gt: d.setDate(d.getDate() - 7), $lt: de.getTime() } };
            }
            if (filter == '2_WEEK') {
                cond = { startDate: { $gt: d.setDate(d.getDate() - 14), $lt: de.getTime() } };
            }
            if (filter == '1_MONTH') {
                cond = { startDate: { $gt: d.setDate(d.getDate() - 30), $lt: de.getTime() } };
            }
            if (filter == '1_YEAR') {
                cond = { startDate: { $gt: d.setDate(d.getDate() - 365), $lt: de.getTime() } };
            }

            cond.applicant = req.user.id;
            let jobs = await Job.find(cond).lean();
            return response.ok(res, { jobs });
        } catch (error) {
            return response.error(res, error);
        }
    },
    // shown to USER(who posted jobs)
    history: async (req, res) => {
        try {
            let filter = req.params["filter"];
            let cond = {};
            let d = new Date();
            let de = new Date();

            if (filter == '1_WEEK') {
                cond = { startDate: { $gt: d.setDate(d.getDate() - 7), $lt: de.getTime() } };
            }
            if (filter == '2_WEEK') {
                cond = { startDate: { $gt: d.setDate(d.getDate() - 14), $lt: de.getTime() } };
            }
            if (filter == '1_MONTH') {
                cond = { startDate: { $gt: d.setDate(d.getDate() - 30), $lt: de.getTime() } };
            }
            if (filter == '1_YEAR') {
                cond = { startDate: { $gt: d.setDate(d.getDate() - 365), $lt: de.getTime() } };
            }
            cond.posted_by = req.user.id;
            let jobs = await Job.find(cond).lean();
            return response.ok(res, { jobs });
        } catch (error) {
            return response.error(res, error);
        }
    },
    jobEvents: async (req, res) => {
        try {
            const job = Job.findById(req.body.job_id).lean();
            notification.push(job.posted_by, `${req.user.user} ${req.body.event.toLowerCase()} your job ${job.title}.`);
            return response.ok(res, { event: req.body.event });
        } catch (error) {
            return response.error(res, error);
        }
    },
    formatedJobs: async (req, res) => {
        try {
            let posted_by;
            if (req.user.type == 'ADMIN') {
                posted_by = req.body.org_id;
            } else {
                posted_by = req.user.id;
            }
            //  endDate: { $gte: new Date(req.body.startDate).getTime(), $lt: new Date(req.body.endDate).getTime() },
            let cond = {
                posted_by,
                startDate: { $gte: new Date(req.body.startDate).getTime(), $lt: new Date(req.body.endDate).getTime() }
            }

            const jobs = await Job.find(cond).populate('posted_by', 'username fullName').populate('client', 'fullName').lean();
            let invites = await JobInvite.find({ job: { $in: jobs.map(j => j._id) } }).populate('invited', 'username fullName').lean();

            let obj = {};
            invites.map(i => {
                if (obj[i.job]) {
                    obj[i.job].push(i);
                } else {
                    obj[i.job] = [i];
                }
            });

            let formattedJobs = {};
            let count = 0;
            jobs.map(j => {
                j.invites = obj[j._id];
                let cName = j.client ? j.client.fullName : `no client(${++count})`;
                if (formattedJobs[cName]) {
                    formattedJobs[cName].push(j);
                } else {
                    formattedJobs[cName] = [j];
                }
            });
            let jjobs = [];
            Object.keys(formattedJobs).map(u => {
                let obj = {
                    name: u, jobs: formattedJobs[u]
                }
                jjobs.push(obj);
            });

            return response.ok(res, { jobs: jjobs });
        } catch (error) {
            return response.error(res, error);
        }
    },
    rejectInvite: async (req, res) => {
        try {
            const jobInvite = await JobInvite.findOne({ job: req.params["job_id"] });
            if (jobInvite.job_status !== 'ACTIVE') {
                return response.ok(res, { status: false, message: JobStatus[jobInvite.job_status] });
            }
            jobInvite.status = 'REJECTED';
            await jobInvite.save();
            return response.ok(res, { message: "Rejected Invite." });
        } catch (error) {
            return response.error(res, error);
        }
    },
    //////////Surya's code - Please be careful ///////
    historyUserSearch: async (req, res) => {
        try {
            const cond = {
                $or: [{ title: { $regex: req.body.search } },
                { type: { $regex: req.body.search } },
                ]
            }
            cond.posted_by = req.user.id;
            let guards = await Job.find(cond).lean();
            return response.ok(res, { guards });
        } catch (error) {
            return response.error(res, error);
        }
    },


}
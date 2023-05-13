const mongoose = require("mongoose");
const response = require("./../responses");
const Job = mongoose.model("Job");
const Invoice = mongoose.model("Invoice");
const dayjs = require("dayjs");
const User = mongoose.model("User");
const Client = mongoose.model("Client");
const JobInvite = mongoose.model("JobInvite");
const notification = require("./../services/notification");
const Identity = mongoose.model("Identity");
const { find } = require("../helper/user");
const Festa = mongoose.model("Festa");

function getDateRange(query) {
  const currDate = new Date().getTime();
  const lastWDate = currDate - 7 * 60 * 60 * 24 * 1000;
  return [
    new Date(query["startDate"] || lastWDate),
    new Date(query["endDate"] || currDate),
  ];
}

module.exports = {
  addNote: async (req, res) => {
    try {
      await Invoice.findByIdAndUpdate(req.params["invoice_id"], {
        note: req.body.note,
      });
      return response.ok(res, { message: "Note updated." });
    } catch (error) {
      return response.error(res, error);
    }
  },
  generateInvoice: async (req, res) => {
    try {
      let sd = new Date(req.body.start).getTime(),
        ed = new Date(req.body.end).getTime();
      let jobs = await Job.find({
        client: req.body.client_id,
        startDate: { $gte: sd, $lte: ed },
        endDate: { $gte: sd, $lte: ed },
      })
        .populate("client")
        .lean();
      let list = [],
        amount = 0;
      for (let j of jobs) {
        if (!j.applicant.length) continue;
        const date1 = dayjs(j.startDate);
        const date2 = dayjs(j.endDate);
        let diff = date2.diff(date1, "hour", true);
        let obj = {
          date: date1.format("DD-MM-YYYY"),
          msg: `${j.applicant.length} staff to ${j.client.fullName
            } from ${date1.format("DD/MM/YYYY hh:mm A")} to ${date2.format(
              "DD/MM/YYYY hh:mm A"
            )}`,
          rate: j.amount,
          hour: diff,
          amount: diff * j.applicant.length * j.amount,
        };
        amount += obj.amount;
        list.push(obj);
      }
      if (!list.length) {
        return response.ok(res, {
          status: false,
          message: "No job done in this time frame.",
        });
      }
      let invoice = "REFRESHED";
      if (req.body.invoiceID) {
        invoice = await Invoice.findByIdAndUpdate(
          req.body.invoiceID,
          { list: list },
          { new: true }
        );
      } else {
        invoice = await Invoice.create({
          organization: req.user.id,
          client: req.body.client_id,
          jobDetails: list,
          amount: amount,
          startDate: sd,
          endDate: ed,
        });
      }

      return response.ok(res, { invoice });
    } catch (error) {
      return response.error(res, error);
    }
  },
  getInvoice: async (req, res) => {
    try {
      // let client = req.params["client_id"];
      let invoice = req.params["invoice_id"];

      let cond = { organization: req.user.id };

      if (invoice) cond._id = invoice;

      let invoices = await Invoice.find(cond).populate("client").lean();
      return response.ok(res, { invoices });
    } catch (error) {
      return response.error(res, error);
    }
  },
  updateStatus: async (req, res) => {
    try {
      let invoice = req.params["invoice_id"];
      await Invoice.updateOne({ _id: invoice }, { status: req.body.status });
      return response.ok(res, { message: "Status updated." });
    } catch (error) {
      return response.error(res, error);
    }
  },
  deleteInvoice: async (req, res) => {
    try {
      let invoice = req.params["invoice_id"];
      await Invoice.deleteOne({ _id: invoice });
      return response.ok(res, { message: "Invoice deleted." });
    } catch (error) {
      return response.error(res, error);
    }
  },
  repeatJob: async (req, res) => {
    try {
      // monday(1) ....... suturday(6), sunday(0)
      // req.body.repeat = [4, 6];
      // req.body.repeat = 1;
      // req.body.startDate = "2023-04-10";
      // req.body.endDate = "2023-04-23";
      // req.body.staff = ['63fc8de24aa0fa34e78ba390'];

      // Repeat job multiple times
      let job_id = req.params["job_id"];
      let job = await Job.findById(job_id).lean();
      delete job._id;

      let staff = req.body.staff;

      let startDate = new Date(req.body.startDate);
      let endDate = new Date(req.body.endDate);

      const repeat = Array.isArray(req.body.repeat) ? "W" : "D";
      for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
        const jj = JSON.parse(JSON.stringify(job));
        // console.log("counter + diff", counter, diff, d.getDay(), d.toDateString());
        if (repeat == "D" || req.body.repeat.includes(d.getDay())) {
          let sD = new Date(jj.startDate);
          let eD = new Date(jj.endDate);
          sD.setDate(d.getDate());
          sD.setMonth(d.getMonth());
          sD.setFullYear(d.getFullYear());
          eD.setDate(d.getDate());
          eD.setMonth(d.getMonth());
          eD.setFullYear(d.getFullYear());
          jj.startDate = sD;
          jj.endDate = eD;
          jj.posted_by = req.user.id;
          jj.invited = staff;
          jj.applicant = [];
          const nj = await Job.create(jj);
          for (let u of staff) {
            let JobIn = await JobInvite.create({
              invited: u,
              job: nj._id,
              by: nj.posted_by,
            });
            notification.push(
              u,
              `You have been invited for a job(${nj.title}).`,
              JobIn._id
            );
          }
        }
      }

      return response.ok(res, { message: "Jobs Created." });
    } catch (error) {
      return response.error(res, error);
    }
  },
  //(1) Net Income Generation Trend
  getStatsOfNetIncome: async (req, res) => {
    try {
      let org = req.params["org_id"];
      let view = req.params["view"];
      let message = "Yearly View";
      const matchCond = {
        $match: {
          posted_by: mongoose.Types.ObjectId(org),
        },
      };
      if (req.query["startDate"]) {
        view = "DAILY";
      }
      let pip = [
        matchCond,
        {
          $project: {
            startDate: 1,
            job_hrs: 1,
            amount: 1,
            client: 1,
            year: { $year: "$startDate" },
          },
        },
        {
          $lookup: {
            from: "clients",
            localField: "client",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: "$client" },
        {
          $project: {
            year: 1,
            "Net Income": { $multiply: ["$client.rate", "$job_hrs"] },
          },
        },
        {
          $group: {
            _id: "$year",
            "Net Income": { $sum: "$Net Income" },
          },
        },
        { $sort: { _id: 1 } },
      ];
      if (view == "MONTHLY") {
        message = "Monthly View";
        pip = [
          matchCond,
          {
            $project: {
              startDate: 1,
              job_hrs: 1,
              amount: 1,
              client: 1,
              year: { $year: "$startDate" },
              month: { $month: "$startDate" },
            },
          },
          { $match: { year: new Date().getFullYear() } },
          {
            $lookup: {
              from: "clients",
              localField: "client",
              foreignField: "_id",
              as: "client",
            },
          },
          { $unwind: "$client" },
          {
            $project: {
              month: 1,
              "Net Income": { $multiply: ["$client.rate", "$job_hrs"] },
            },
          },
          {
            $group: {
              _id: "$month",
              "Net Income": { $sum: "$Net Income" },
            },
          },
          { $sort: { _id: 1 } },
          {
            $project: {
              _id: {
                $arrayElemAt: [
                  [
                    "",
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                  ],
                  "$_id",
                ],
              },
              "Net Income": 1,
            },
          },
        ];
      } else if (view == "DAILY") {
        const [st, et] = getDateRange(req.query);
        matchCond.$match.startDate = { $gte: st, $lte: et };
        message = `${st.toDateString()} to ${et.toDateString()}`;
        pip = [
          matchCond,
          {
            $lookup: {
              from: "clients",
              localField: "client",
              foreignField: "_id",
              as: "client",
            },
          },
          { $unwind: "$client" },
          {
            $project: {
              startDate: 1,
              "Net Income": { $multiply: ["$client.rate", "$job_hrs"] },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$startDate" },
              },
              "Net Income": { $sum: "$Net Income" },
            },
          },
          { $sort: { _id: 1 } },
        ];
      }

      let stats = await Job.aggregate(pip);
      return response.ok(res, {
        stats,
        message: `Net Income Trend(£): ${message}`,
      });
    } catch (error) {
      return response.error(res, error);
    }
  },
  // REMOVED
  //(*) Count of Users, Staff & Client On-boarded
  getStatsOfResources: async (req, res) => {
    try {
      const org = req.params["org_id"];
      let view = req.params["view"];
      const obj = { $match: { organization: mongoose.Types.ObjectId(org) } };

      if (view == "MONTHLY") {
      }
      let clientP = Client.aggregate([
        obj,
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            clients: {
              $sum: 1,
            },
          },
        },
      ]);
      let usersP = User.aggregate([
        { $match: { isOrganization: true } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            users: {
              $sum: 1,
            },
          },
        },
      ]);

      let [clients, users] = await Promise.all([clientP, usersP]);
      const map = new Map();
      clients.forEach((item) => map.set(item._id, item));
      users.forEach((item) =>
        map.set(item._id, { ...map.get(item._id), ...item })
      );
      const stats = Array.from(map.values());
      return response.ok(res, {
        stats,
        message: "Count of Users, Staff & Client On-boarded.",
      });
    } catch (error) {
      return response.error(res, error);
    }
  },
  //(2) Net Income, Expense and Profit
  getStatsOfIncome: async (req, res) => {
    try {
      let org = req.params["org_id"];
      let view = req.params["view"];
      let message = "Yearly View";
      const matchCond = {
        $match: {
          posted_by: mongoose.Types.ObjectId(org),
        },
      };
      if (req.query["startDate"]) {
        view = "DAILY";
      }
      let pip = [
        matchCond,
        {
          $lookup: {
            from: "clients",
            localField: "client",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: "$client" },
        {
          $project: {
            year: { $year: "$startDate" },
            Vat: "$client.vat",
            Wages: { $multiply: ["$amount", "$job_hrs"] },
            Profit: {
              $subtract: [
                {
                  $multiply: [
                    {
                      $add: [
                        "$client.rate",
                        {
                          $multiply: [
                            "$client.rate",
                            { $divide: ["$client.vat", 100] },
                          ],
                        },
                      ],
                    },
                    "$job_hrs",
                  ],
                },
                { $multiply: ["$amount", "$job_hrs"] },
              ],
            },
          },
        },
        {
          $project: {
            year: 1,
            Wages: 1,
            Profit: 1,
            Vat: 1,
            "Net Income": { $add: ["$Wages", "$Profit"] },
          },
        },
        { $sort: { year: 1 } },
        {
          $group: {
            _id: "$year",
            Wage: { $sum: "$Wages" },
            Profit: { $sum: "$Profit" },
            Vat: { $sum: "$Vat" },
            "Net Income": { $sum: "$Net Income" },
          },
        },
      ];
      if (view == "MONTHLY") {
        message = "Monthly View";
        pip = [
          matchCond,
          {
            $project: {
              startDate: 1,
              job_hrs: 1,
              amount: 1,
              client: 1,
              month: { $month: "$startDate" },
              day: { $dayOfMonth: "$startDate" },
              year: { $year: "$startDate" },
            },
          },
          { $match: { year: new Date().getFullYear() } },
          {
            $lookup: {
              from: "clients",
              localField: "client",
              foreignField: "_id",
              as: "client",
            },
          },
          { $unwind: "$client" },
          {
            $project: {
              Vat: "$client.vat",
              month: 1,
              Wages: { $multiply: ["$amount", "$job_hrs"] },
              Profit: {
                $subtract: [
                  {
                    $multiply: [
                      {
                        $add: [
                          "$client.rate",
                          {
                            $multiply: [
                              "$client.rate",
                              { $divide: ["$client.vat", 100] },
                            ],
                          },
                        ],
                      },
                      "$job_hrs",
                    ],
                  },
                  { $multiply: ["$amount", "$job_hrs"] },
                ],
              },
            },
          },
          {
            $project: {
              Wages: 1,
              Profit: 1,
              Vat: 1,
              month: 1,
              "Net Income": { $add: ["$Wages", "$Profit"] },
            },
          },
          { $sort: { month: 1 } },
          {
            $group: {
              _id: {
                $arrayElemAt: [
                  [
                    "",
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                  ],
                  "$month",
                ],
              },
              Wage: { $sum: "$Wages" },
              Profit: { $sum: "$Profit" },
              Vat: { $sum: "$Vat" },
              "Net Income": { $sum: "$Net Income" },
            },
          },
        ];
      } else if (view == "DAILY") {
        const [st, et] = getDateRange(req.query);
        matchCond.$match.startDate = { $gte: st, $lte: et };
        message = `${st.toDateString()} to ${et.toDateString()}`;
        pip = [
          matchCond,
          {
            $lookup: {
              from: "clients",
              localField: "client",
              foreignField: "_id",
              as: "client",
            },
          },
          { $unwind: "$client" },
          {
            $project: {
              startDate: 1,
              Vat: "$client.vat",
              Wages: { $multiply: ["$amount", "$job_hrs"] },
              Profit: {
                $subtract: [
                  {
                    $multiply: [
                      {
                        $add: [
                          "$client.rate",
                          {
                            $multiply: [
                              "$client.rate",
                              { $divide: ["$client.vat", 100] },
                            ],
                          },
                        ],
                      },
                      "$job_hrs",
                    ],
                  },
                  { $multiply: ["$amount", "$job_hrs"] },
                ],
              },
            },
          },
          {
            $project: {
              startDate: 1,
              Wages: 1,
              Profit: 1,
              Vat: 1,
              "Net Income": { $add: ["$Wages", "$Profit"] },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$startDate" },
              },
              Wage: { $sum: "$Wages" },
              Profit: { $sum: "$Profit" },
              Vat: { $sum: "$Vat" },
              "Net Income": { $sum: "$Net Income" },
            },
          },
          { $sort: { _id: 1 } },
        ];
      }
      let stats = await Job.aggregate(pip);

      return response.ok(res, {
        stats,
        message: `Net Income, Expense and Profit(£): ${message}`,
      });
    } catch (error) {
      return response.error(res, error);
    }
  },
  //(3) Top 5 Clients by gross revenue contribution
  getStatsOfClients: async (req, res) => {
    try {
      let org = req.params["org_id"];
      const [st, et] = getDateRange(req.query);
      const matchCond = {
        posted_by: mongoose.Types.ObjectId(org),
      };
      let message = "Aggregate View";
      if (req.query["startDate"]) {
        matchCond.startDate = { $gte: st, $lte: et };
        message = `${st.toDateString()} to ${et.toDateString()}`;
      }
      // const clients = await Client.find({ organization: mongoose.Types.ObjectId(org) }).lean();
      // const c_ids = clients.map(c => c._id);
      // const cond = { client: { $in: c_ids } };
      const jobs = await Job.find(matchCond).populate("client").lean();
      let clients_with_revenue = {};
      jobs.forEach((j) => {
        const date1 = dayjs(j.startDate);
        const date2 = dayjs(j.endDate);
        let diff = date2.diff(date1, "hour", true);
        if (clients_with_revenue[j.client._id]) {
          clients_with_revenue[j.client._id].amount +=
            j.client.rate * j.person * diff;
        } else {
          clients_with_revenue[j.client._id] = {
            name: j.client.fullName,
            amount: j.client.rate * j.person * diff,
          };
        }
      });
      clients_with_revenue = Object.entries(clients_with_revenue).sort(
        (a, b) => {
          return b[1].amount - a[1].amount;
        }
      );
      let top_revenue = clients_with_revenue.slice(0, 5);
      let stats = top_revenue.map((t) => {
        return { name: t[1].name, revenue: t[1].amount };
      });
      return response.ok(res, {
        stats,
        message: `Top 5 Clients by gross revenue contribution(£): ${message}`,
      });
    } catch (error) {
      return response.error(res, error);
    }
  },
  dashboardStats: async (req, res) => {
    try {
      let pip = [
        {
          $match: {
            posted_by: mongoose.Types.ObjectId(req.user.id),
          },
        },
        {
          $lookup: {
            from: "clients",
            localField: "client",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: "$client" },
        {
          $project: {
            posted_by: 1,
            Wages: { $multiply: ["$amount", "$job_hrs"] },
            Profit: {
              $subtract: [
                {
                  $multiply: [
                    {
                      $add: [
                        "$client.rate",
                        {
                          $multiply: [
                            "$client.rate",
                            { $divide: ["$client.vat", 100] },
                          ],
                        },
                      ],
                    },
                    "$job_hrs",
                  ],
                },
                { $multiply: ["$amount", "$job_hrs"] },
              ],
            },
          },
        },
        {
          $project: {
            posted_by: 1,
            Wages: 1,
            Profit: 1,
            "Net Income": { $add: ["$Wages", "$Profit"] },
          },
        },
        {
          $group: {
            _id: "$posted_by",
            pay: { $sum: "$Wages" },
            income: { $sum: "$Net Income" },
          },
        },
      ];
      let stats = await Job.aggregate(pip);

      return response.ok(res, stats);
    } catch (error) {
      return response.error(res, error);
    }
  },
  gaurdPay: async (req, res) => {
    try {
      const st = new Date(req.query["startDate"]);
      const et = new Date(req.query["endDate"]);
      const jobs = await Job.find({
        posted_by: mongoose.Types.ObjectId(req.user.id),
        startDate: { $gte: st.getTime(), $lte: et.getTime() },
      }).populate("applicant", "_id username fullName");
      const gaurds = {};
      for (let job of jobs) {
        let wages = job.amount * job.job_hrs;
        for (let a of job.applicant) {
          if (gaurds[a.username]) {
            gaurds[a.username] = {
              name: a.fullName,
              wages: wages + gaurds[a.username].wages,
            };
          } else {
            gaurds[a.username] = { name: a.fullName, wages };
          }
          gaurds[a.username]._id = a._id;
        }
      }
      return response.ok(res, Object.values(gaurds));
    } catch (error) {
      return response.error(res, error);
    }
  },
  gaurdJobHistory: async (req, res) => {
    try {
      const gaurd = mongoose.Types.ObjectId(req.params["gaurd"]);
      const st = new Date(req.query["startDate"]);
      const et = new Date(req.query["endDate"]);
      let [gaurdDetails, identity] = await Promise.all([
        find({ _id: gaurd }).lean(),
        Identity.find({ user: gaurd }).lean(),
      ]);
      gaurdDetails.identity = identity.map((i) => {
        i.image = `${process.env.ASSET_ROOT}/${i.key}`;
        return i;
      });
      const jobs = await Job.find({
        invited: gaurd,
        startDate: { $gte: st.getTime(), $lte: et.getTime() },
      }).populate("client", "fullName rate");
      return response.ok(res, { gaurdDetails, jobs });
    } catch (error) {
      return response.error(res, error);
    }
  },

  createEvent: async (req, res) => {
    try {
      const allEvent = await Festa.find({});
      if (allEvent.length >= 4) {
        return response.error(res, {
          message: "Please remove any event then try again!",
        });
      }
      const payload = req.body || {};
      const festa = new Festa({
        ...payload,
      });
      await festa.save();
      return response.ok(res, { message: "Event created successfully" });
    } catch (error) {
      return response.error(res, error);
    }
  },

  getevent: async (req, res) => {
    try {
      const festa = await Festa.find({});
      return response.ok(res, festa);
    } catch (error) {
      return response.error(res, error);
    }
  },

  deleteEvent: async (req, res) => {
    try {
      await Festa.findByIdAndDelete(mongoose.Types.ObjectId(req.body.id));
      return response.ok(res, { message: "Event deleted successfully" });
    } catch (error) {
      return response.error(res, error);
    }
  },
};

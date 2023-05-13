
const OneSignal = require('@onesignal/node-onesignal');
const mongoose = require("mongoose");
const Device = mongoose.model('Device');
const Notification = mongoose.model('Notification');
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;

const app_key_provider = {
    getToken() {
        return process.env.ONESIGNAL_REST_API_KEY;
    }
};
const configuration = OneSignal.createConfiguration({
    authMethods: {
        app_key: {
            tokenProvider: app_key_provider
        }
    }
});
const client = new OneSignal.DefaultApi(configuration);

async function sendNotification(content, player_ids) {
    try {
        const notification = new OneSignal.Notification();
        notification.app_id = ONESIGNAL_APP_ID;
        notification.include_player_ids = player_ids;
        notification.contents = {
            en: content
        };
        notification.name = "swiftGaurd"
        return await client.createNotification(notification);
    } catch (err) {
        console.log("error in send notification", content);
        console.error("error in send notification", err);
    }
}
async function findDevices(user) {
    const devices = await Device.find({ user });
    return devices.map(d => d.player_id);
}

module.exports = {
    push: async (user, content, job = null) => {
        const player_ids = await findDevices(user);
        const notObj = { for: user, message: content };
        if (job) notObj.invited_for = job;
        await Notification.create(notObj);
        return sendNotification(content, player_ids);
    },
    notify: async (user, content) => {
        const player_ids = await findDevices(user);
        return sendNotification(content, player_ids);
    }
}

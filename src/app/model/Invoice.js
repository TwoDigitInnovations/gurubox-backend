'use strict';
const mongoose = require('mongoose');
const invoice = new mongoose.Schema({
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
    },
    jobDetails: {
        type: Array, default: []
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['unPaid', 'paid'],
        default: 'unPaid'
    },
    amount: {
        type: Number, default: 0
    },
    startDate: {
        type: Date
    },
    note:{
        type: String
    },
    endDate: {
        type: Date
    }
}, {
    timestamps: true
});

invoice.set('toJSON', {
    getters: true,
    virtuals: false,
    transform: (doc, ret, options) => {
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('Invoice', invoice);

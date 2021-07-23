const mongoose = require("mongoose");

const OtpSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "clients",
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now,
    expires: 900,
  },
  isUsed: { 
    type: Boolean,
    default: false,
  },
});

const Otp = mongoose.model('Otp', OtpSchema);

module.exports = { Otp }

const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
  {
    foodName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },

    quantity: {
      type: Number,
      required: true,
      min: 1
    },

    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },

    // Person who donated the food
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // Current donation status
    status: {
    type: String,
    enum: [
        "Available",
        "Requested",
        "Accepted",
        "Collected",
        "Completed"
    ],
    default: "Available"
},

    // Person who collected the food
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    // Date and time when food was collected
    collectedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Donation", donationSchema);
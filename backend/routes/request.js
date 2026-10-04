const express = require("express");
const Request = require("../models/Request");
const Donation = require("../models/Donation");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();


// ==========================================
// CREATE FOOD REQUEST
// NGO ONLY
// ==========================================

router.post("/", authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== "ngo") {
            return res.status(403).json({
                message: "Only NGO users can request food."
            });
        }

        const {
            donation,
            requestedQuantity,
            message
        } = req.body;

        if (!donation || !requestedQuantity) {
            return res.status(400).json({
                message: "Donation and quantity are required."
            });
        }

        const quantity = Number(requestedQuantity);

        if (!Number.isFinite(quantity) || quantity <= 0) {
            return res.status(400).json({
                message: "Please enter a valid quantity."
            });
        }

        const donationData = await Donation.findById(donation);

        if (!donationData) {
            return res.status(404).json({
                message: "Donation not found."
            });
        }

        if (donationData.status !== "Available") {
            return res.status(400).json({
                message: "This food is not available."
            });
        }

        if (quantity > donationData.quantity) {
            return res.status(400).json({
                message:
                    `Only ${donationData.quantity} quantity is available.`
            });
        }

        const existingRequest = await Request.findOne({
            donation: donation,
            ngo: req.user.userId,
            status: {
                $in: ["Pending", "Accepted"]
            }
        });

        if (existingRequest) {
            return res.status(409).json({
                message:
                    "You have already requested this donation."
            });
        }

        const newRequest = await Request.create({
            donation: donation,
            ngo: req.user.userId,
            requestedQuantity: quantity,
            message: message || "",
            status: "Pending"
        });

        donationData.status = "Requested";
        await donationData.save();

        res.status(201).json({
            message: "Food request submitted successfully.",
            request: newRequest
        });

    } catch (error) {
        console.error("Create request error:", error);

        res.status(500).json({
            message: "Server error."
        });
    }
});


// ==========================================
// GET REQUESTS
// ==========================================

router.get("/", authMiddleware, async (req, res) => {
    try {
        let requests;

        // NGO
        if (req.user.role === "ngo") {

            requests = await Request.find({
                ngo: req.user.userId
            })
                .populate(
                    "donation",
                    "foodName quantity location description status donor"
                )
                .populate(
                    "ngo",
                    "name email"
                )
                .sort({ createdAt: -1 });

        }

        // DONOR
        else if (req.user.role === "donor") {

            const donations = await Donation.find({
                donor: req.user.userId
            }).select("_id");

            const donationIds = donations.map(
                donation => donation._id
            );

            requests = await Request.find({
                donation: {
                    $in: donationIds
                }
            })
                .populate(
                    "donation",
                    "foodName quantity location description status donor"
                )
                .populate(
                    "ngo",
                    "name email"
                )
                .sort({ createdAt: -1 });

        }

        // ADMIN
        else if (req.user.role === "admin") {

            requests = await Request.find()
                .populate(
                    "donation",
                    "foodName quantity location description status donor"
                )
                .populate(
                    "ngo",
                    "name email"
                )
                .sort({ createdAt: -1 });

        }

        else {
            return res.status(403).json({
                message: "Access denied."
            });
        }

        res.json(requests);

    } catch (error) {
        console.error("Get requests error:", error);

        res.status(500).json({
            message: "Server error."
        });
    }
});


// ==========================================
// ACCEPT REQUEST
// DONOR / ADMIN ONLY
// ==========================================

router.patch("/:id/accept", authMiddleware, async (req, res) => {
    try {

        if (
            req.user.role !== "donor" &&
            req.user.role !== "admin"
        ) {
            return res.status(403).json({
                message:
                    "Only donor or admin can accept requests."
            });
        }

        const request = await Request.findById(
            req.params.id
        ).populate("donation");

        if (!request) {
            return res.status(404).json({
                message: "Request not found."
            });
        }

        const donation = request.donation;

        if (!donation) {
            return res.status(404).json({
                message: "Donation not found."
            });
        }

        if (
            req.user.role === "donor" &&
            donation.donor.toString() !== req.user.userId
        ) {
            return res.status(403).json({
                message:
                    "You can only manage requests for your own donations."
            });
        }

        if (request.status !== "Pending") {
            return res.status(400).json({
                message:
                    "This request is no longer pending."
            });
        }

        request.status = "Accepted";
        await request.save();

        donation.status = "Accepted";
        await donation.save();

        res.json({
            message:
                "Food request accepted successfully.",
            request: request
        });

    } catch (error) {
        console.error("Accept request error:", error);

        res.status(500).json({
            message: "Server error."
        });
    }
});


// ==========================================
// REJECT REQUEST
// DONOR / ADMIN ONLY
// ==========================================

router.patch("/:id/reject", authMiddleware, async (req, res) => {
    try {

        if (
            req.user.role !== "donor" &&
            req.user.role !== "admin"
        ) {
            return res.status(403).json({
                message:
                    "Only donor or admin can reject requests."
            });
        }

        const request = await Request.findById(
            req.params.id
        ).populate("donation");

        if (!request) {
            return res.status(404).json({
                message: "Request not found."
            });
        }

        const donation = request.donation;

        if (!donation) {
            return res.status(404).json({
                message: "Donation not found."
            });
        }

        if (
            req.user.role === "donor" &&
            donation.donor.toString() !== req.user.userId
        ) {
            return res.status(403).json({
                message:
                    "You can only manage requests for your own donations."
            });
        }

        if (request.status !== "Pending") {
            return res.status(400).json({
                message:
                    "This request is no longer pending."
            });
        }

        request.status = "Rejected";
        await request.save();

        donation.status = "Available";
        await donation.save();

        res.json({
            message: "Food request rejected.",
            request: request
        });

    } catch (error) {
        console.error("Reject request error:", error);

        res.status(500).json({
            message: "Server error."
        });
    }
});


// ==========================================
// COLLECT FOOD
// NGO ONLY
// ==========================================

router.patch("/:id/collect", authMiddleware, async (req, res) => {
    try {

        if (req.user.role !== "ngo") {
            return res.status(403).json({
                message:
                    "Only NGO users can collect food."
            });
        }

        const request = await Request.findById(
            req.params.id
        ).populate("donation");

        if (!request) {
            return res.status(404).json({
                message: "Request not found."
            });
        }

        if (
            request.ngo.toString() !== req.user.userId
        ) {
            return res.status(403).json({
                message:
                    "You can only collect your own accepted request."
            });
        }

        if (request.status !== "Accepted") {
            return res.status(400).json({
                message:
                    "Only accepted requests can be collected."
            });
        }

        request.status = "Completed";
        await request.save();

        if (request.donation) {
            request.donation.status = "Completed";
            await request.donation.save();
        }

        res.json({
            message: "Food collected successfully.",
            request: request
        });

    } catch (error) {
        console.error("Collect request error:", error);

        res.status(500).json({
            message: "Server error."
        });
    }
});


module.exports = router;
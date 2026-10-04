const express = require("express");
const Request = require("../models/Request");
const Donation = require("../models/Donation");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();


// ======================================================
// 1. NGO REQUEST FOOD
// ======================================================

router.post("/", authMiddleware, async (req, res) => {
    try {

        // Only NGO can request food
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


        // Check required fields
        if (!donation || !requestedQuantity) {
            return res.status(400).json({
                message: "Donation and quantity are required."
            });
        }


        // Convert quantity to number
        const quantity = Number(requestedQuantity);


        // Validate quantity
        if (!Number.isFinite(quantity) || quantity <= 0) {
            return res.status(400).json({
                message: "Please enter a valid quantity."
            });
        }


        // Find donation
        const donationData = await Donation.findById(donation);

        if (!donationData) {
            return res.status(404).json({
                message: "Donation not found."
            });
        }


        // Check food availability
        if (donationData.status !== "Available") {
            return res.status(400).json({
                message: "This food is not available."
            });
        }


        // Check requested quantity
        if (quantity > donationData.quantity) {
            return res.status(400).json({
                message:
                    `Only ${donationData.quantity} quantity is available.`
            });
        }


        // Check if same NGO already requested this donation
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


        // Create request
        const newRequest = await Request.create({
            donation: donation,
            ngo: req.user.userId,
            requestedQuantity: quantity,
            message: message || "",
            status: "Pending"
        });


        // ==================================================
        // IMPORTANT:
        // SUBTRACT REQUESTED FOOD FROM AVAILABLE QUANTITY
        // Example: 100 - 20 = 80
        // ==================================================

        donationData.quantity =
            donationData.quantity - quantity;


        // If no food is left, keep Requested status.
        // If some food is still left, make it Available.
        if (donationData.quantity > 0) {
            donationData.status = "Available";
        } else {
            donationData.status = "Requested";
        }


        await donationData.save();


        // Send response
        res.status(201).json({
            message: "Food request submitted successfully.",
            request: newRequest,
            remainingQuantity: donationData.quantity
        });

    } catch (error) {

        console.error("Create request error:", error);

        res.status(500).json({
            message: "Server error."
        });
    }
});


// ======================================================
// 2. GET REQUESTS
// ======================================================

router.get("/", authMiddleware, async (req, res) => {
    try {

        let requests;


        // NGO → See own requests
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


        // DONOR → See requests for own food
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


        // ADMIN → See all requests
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


// ======================================================
// 3. ACCEPT REQUEST
// ======================================================

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


        // Donor can only manage own donation
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


        // If this request accepted, donation becomes Accepted
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


// ======================================================
// 4. REJECT REQUEST
// ======================================================

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


        // Donor can only manage own donation
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


        // IMPORTANT:
        // We DO NOT add quantity back here.
        //
        // Because quantity was already reserved/subtracted
        // when NGO made the request.
        //
        // Example:
        // 100 → request 20 → 80
        // Reject → stays 80
        //
        // This keeps the available quantity correct.

        if (donation.quantity > 0) {
            donation.status = "Available";
        }

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


// ======================================================
// 5. COLLECT FOOD
// ======================================================

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


        // Complete request
        request.status = "Completed";

        await request.save();


        // Update donation
        if (request.donation) {

            request.donation.status = "Completed";

            request.donation.collectedBy = req.user.userId;

            request.donation.collectedAt = new Date();

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
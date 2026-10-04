const express = require("express");

const Donation = require("../models/Donation");

const {
  authMiddleware,
  adminOnly
} = require("../middleware/authMiddleware");

const router = express.Router();


// ==========================================
// GET ALL DONATIONS
// ==========================================

router.get("/", async (req, res) => {

  try {

    const donations = await Donation.find()
      .populate("donor", "name email")
      .populate("collectedBy", "name email")
      .sort({ createdAt: -1 });

    res.json(donations);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server error"
    });

  }

});


// ==========================================
// ADD FOOD DONATION
// ==========================================

router.post("/", authMiddleware, async (req, res) => {

  try {

    const foodName =
      String(req.body.foodName || "").trim();

    const quantity =
      Number(req.body.quantity);

    const location =
      String(req.body.location || "").trim();

    const description =
      String(req.body.description || "").trim();


    if (
      !foodName ||
      !quantity ||
      quantity < 1 ||
      !location
    ) {

      return res.status(400).json({
        message:
          "Please fill all required fields correctly"
      });

    }


    const donation = await Donation.create({

      foodName,

      quantity,

      location,

      description,

      donor: req.user.userId

    });


    const result =
      await donation.populate(
        "donor",
        "name email"
      );


    res.status(201).json({

      message:
        "Food donation added successfully",

      donation: result

    });


  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server error"
    });

  }

});


// ==========================================
// COLLECT FOOD
// ==========================================

router.patch(
  "/:id/collect",
  authMiddleware,
  async (req, res) => {

    try {

      const donation =
        await Donation.findById(req.params.id);


      if (!donation) {

        return res.status(404).json({
          message: "Donation not found"
        });

      }


      // Already collected
      if (donation.status === "Collected") {

        return res.status(400).json({
          message:
            "This food donation has already been collected"
        });

      }


      // Do not allow donor to collect their own donation
      if (
        donation.donor.toString() ===
        req.user.userId
      ) {

        return res.status(400).json({
          message:
            "You cannot collect your own food donation"
        });

      }


      // Update collection information
      donation.status = "Collected";

      donation.collectedBy =
        req.user.userId;

      donation.collectedAt =
        new Date();


      await donation.save();


      // Return complete information
      await donation.populate([
        {
          path: "donor",
          select: "name email"
        },
        {
          path: "collectedBy",
          select: "name email"
        }
      ]);


      res.json({

        message:
          "Food donation collected successfully",

        donation

      });


    } catch (error) {

      console.error(error);

      res.status(500).json({
        message: "Server error"
      });

    }

  }
);


// ==========================================
// DELETE DONATION - ADMIN ONLY
// ==========================================

router.delete(
  "/:id",
  authMiddleware,
  adminOnly,
  async (req, res) => {

    try {

      const donation =
        await Donation.findByIdAndDelete(
          req.params.id
        );


      if (!donation) {

        return res.status(404).json({
          message: "Donation not found"
        });

      }


      res.json({
        message: "Donation deleted"
      });


    } catch (error) {

      console.error(error);

      res.status(500).json({
        message: "Server error"
      });

    }

  }
);


module.exports = router;
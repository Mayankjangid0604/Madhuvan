const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const docService = require("../services/docNumber.service");

router.use(auth);

// GET /api/doc-number/next?type=invoice|receipt|bill|voucher
router.get("/next", (req, res) => {
  try {
    const type = req.query.type || "invoice";
    const number = docService.nextDocNumber(type);
    res.json({ success: true, data: { number } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const svc = require("../services/branch.service");

router.use(auth);

router.get("/", (req, res) => {
  try { res.json({ success: true, data: svc.listBranches() }); }
  catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post("/", (req, res) => {
  try { res.json({ success: true, data: svc.createBranch(req.body) }); }
  catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

router.put("/:id", (req, res) => {
  try { res.json({ success: true, data: svc.updateBranch(Number(req.params.id), req.body) }); }
  catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

router.delete("/:id", (req, res) => {
  try { res.json({ success: true, data: svc.deleteBranch(Number(req.params.id)) }); }
  catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

module.exports = router;

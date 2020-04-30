const express = require('express');
const router = express.Router();
const { requireSignin, adminMiddleware } = require('../controllers/auth');
const { create } = require('../controllers/category');
const { categoryCreateValidator } = require('../validators/category');
const { runValidator } = require('../validators');

router.post(
  '/category',
  categoryCreateValidator,
  runValidator,
  requireSignin,
  adminMiddleware,
  create
);

module.exports = router;

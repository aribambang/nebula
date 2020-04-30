const express = require('express');
const router = express.Router();
const { requireSignin, adminMiddleware } = require('../controllers/auth');
const { create, list, read, remove } = require('../controllers/tag');
const { categoryCreateValidator } = require('../validators/tag');
const { runValidator } = require('../validators');

router.post(
  '/tag',
  categoryCreateValidator,
  runValidator,
  requireSignin,
  adminMiddleware,
  create
);

router.get('/tags', list);

router.get('/tag/:slug', read);

router.delete('/tag/:slug', requireSignin, adminMiddleware, remove);

module.exports = router;

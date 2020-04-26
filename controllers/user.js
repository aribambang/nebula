const jwt = require('jsonwebtoken');
const expressJwt = require('express-jwt');
const User = require('../models/user');
const shortId = require('shortid');

const read = (req, res) => {
  req.profile.hashed_password = undefined;
  return res.json(req.profile);
};

exports.read = read;

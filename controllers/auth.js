const User = require('../models/user');
const Blog = require('../models/blog');
const jwt = require('jsonwebtoken');
const expressJwt = require('express-jwt');
const shortId = require('shortid');
const { errorHandler } = require('../helpers/dbErrorHandler');

const signup = (req, res) => {
  const { name, email, password } = req.body;

  User.findOne({ email }).exec((err, user) => {
    if (user) {
      return res.status(400).json({
        error: 'Email is taken',
      });
    }

    const username = shortId.generate();
    const profile = `${process.env.CLIENT_URL}/profile/${username}`;

    const newUser = new User({
      name,
      email,
      password,
      profile,
      username,
    });

    newUser.save((err, success) => {
      if (err) {
        return res.status(400).json({
          error: err,
        });
      }

      res.json({
        message: 'Signup success! Please signin.',
      });
    });
  });
};

const signin = (req, res) => {
  const { email, password } = req.body;
  // check if user exist
  const user = User.findOne({ email }).exec((err, user) => {
    if (err || !user) {
      res.status(400).json({
        error: 'User with that email does not exist: Please signup.',
      });
    }
    // authenticate
    if (!user.authenticate(password)) {
      return res.status(400).json({
        error: 'Email and password do not match.',
      });
    }
    // generate a token and send to client
    const jwtSecret = process.env.JWT_SECRET;
    const token = jwt.sign({ _id: user._id }, jwtSecret, { expiresIn: '1d' });

    res.cookie('token', token, { expiresIn: '1d' });
    const { _id, username, name, email, role } = user;
    res.json({
      token,
      user: {
        _id,
        username,
        name,
        email,
        role,
      },
    });
  });
};

const signout = (req, res) => {
  res.clearCookie('token');
  res.json({
    message: 'Signout success.',
  });
};

const requireSignin = expressJwt({
  secret: process.env.JWT_SECRET,
});

const authMiddleware = (req, res, next) => {
  const authUserId = req.user._id;
  User.findById({ _id: authUserId }).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: 'User not found',
      });
    }

    req.profile = user;
    next();
  });
};

const adminMiddleware = (req, res, next) => {
  const authUserId = req.user._id;
  User.findById({ _id: authUserId }).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: 'User not found',
      });
    }

    if (user.role !== 1) {
      return res.status(403).json({
        error: 'Admin resource. Access denied.',
      });
    }

    req.profile = user;
    next();
  });
};

const canUpdateDeleteBlog = (req, res, next) => {
  const slug = req.params.slug.toLowerCase();
  Blog.findOne({ slug }).exec((err, data) => {
    if (err) {
      return res.status(400).json({
        error: errorHandler(err),
      });
    }
    let authorizedUser =
      data.postedBy._id.toString() === req.profile._id.toString();
    if (!authorizedUser) {
      return res.status(400).json({
        error: 'You are not authorized',
      });
    }
    next();
  });
};

exports.signup = signup;
exports.signin = signin;
exports.signout = signout;
exports.requireSignin = requireSignin;
exports.authMiddleware = authMiddleware;
exports.adminMiddleware = adminMiddleware;
exports.canUpdateDeleteBlog = canUpdateDeleteBlog;

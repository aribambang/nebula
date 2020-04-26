const { check } = require('express-validator');

const userSignupValidator = [
  check('name').not().isEmpty().withMessage('Name is required'),
  check('email').isEmail().withMessage('Must be a valid email address'),
  check('password')
    .isLength({ min: 6 })
    .withMessage('Password must bet at least 6 characters long'),
];

const userSigninValidator = [
  check('email').isEmail().withMessage('Must be a valid email address'),
  check('password')
    .isLength({ min: 6 })
    .withMessage('Password must bet at least 6 characters long'),
];

exports.userSignupValidator = userSignupValidator;
exports.userSigninValidator = userSigninValidator;

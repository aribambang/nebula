const { check } = require('express-validator');

const tagCreateValidator = [
  check('name').not().isEmpty().withMessage('Name is required'),
];

exports.tagCreateValidator = tagCreateValidator;

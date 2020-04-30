const Category = require('../models/category');
const slugify = require('slugify');
const errorHandler = require('../helpers/dbErrorHandler');

const create = (req, res) => {
  const { name } = req.body;
  let slug = slugify(name).toLowerCase();

  let category = new Category({ name, slug });

  category.save((err, data) => {
    if (err) {
      return res.status(400).json({
        error: errorHandler(err),
      });
    }
    res.json(data);
  });
};

const list = (req, res) => {
  Category.find({}).exec((err, data) => {
    if (err) {
      return res.status(400).json({
        error: errorHandler(err),
      });
    }
    res.json(data);
  });
};

const read = (req, res) => {
  const slug = req.params.slug.toLowerCase();

  Category.findOne({ slug }).exec((err, data) => {
    if (err) {
      return res.status(400).json({
        error: errorHandler(err),
      });
    }
    res.json(data);
  });
};

const remove = (req, res) => {
  const slug = req.params.slug.toLowerCase();

  Category.findByIdAndRemove({ slug }).exec((err, data) => {
    if (err) {
      return res.status(400).json({
        error: errorHandler(err),
      });
    }
    res.json({ message: 'Category was deleted' });
  });
};

exports.create = create;

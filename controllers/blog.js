const Blog = require('../models/blog');
const Category = require('../models/category');
const Tag = require('../models/tag');
const formidable = require('formidable');
const slugify = require('slugify');
const stripHtml = require('string-strip-html');
const _ = require('lodash');
const { errorHandler } = require('../helpers/dbErrorHandler');
const fs = require('fs');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const UUID = require('uuid-v4');
const { smartTrim } = require('../helpers/blog');

const storage = new Storage({
  projectId: process.env.FIREBASE_ID,
  keyFilename: path.join(__dirname, '..', 'firebase.json'),
});
const bucket = storage.bucket(`${process.env.FIREBASE_ID}.appspot.com`);

const uploadImageToStorage = (file, userId) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject('No image file');
    }

    let uuid = UUID();
    bucket
      .upload(file.path, {
        destination: 'images/' + userId + '_' + Date.now(),
        metadata: {
          contentType: file.type,
          metadata: {
            firebaseStorageDownloadTokens: uuid,
          },
        },
      })
      .then((data) => {
        let file = data[0];

        resolve(
          'https://firebasestorage.googleapis.com/v0/b/' +
            bucket.name +
            '/o/' +
            encodeURIComponent(file.name) +
            '?alt=media&token=' +
            uuid
        );
      })
      .catch((error) => {
        reject(error);
      });
  });
};

exports.create = (req, res) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        error: 'Image could not upload',
      });
    }

    const { title, body, categories, tags } = fields;

    if (!title || !title.length) {
      return res.status(400).json({
        error: 'title is required',
      });
    }

    if (!body || body.length < 200) {
      return res.status(400).json({
        error: 'Content is too short',
      });
    }

    if (!categories || categories.length === 0) {
      return res.status(400).json({
        error: 'At least one category is required',
      });
    }

    if (!tags || tags.length === 0) {
      return res.status(400).json({
        error: 'At least one tag is required',
      });
    }

    let blog = new Blog();
    blog.title = title;
    blog.body = body;
    blog.excerpt = smartTrim(body, 320, ' ', ' ...');
    blog.slug = slugify(title).toLowerCase();
    blog.mtitle = `${title} | ${process.env.APP_NAME}`;
    blog.mdesc = stripHtml(body.substring(0, 160));
    blog.postedBy = req.user._id;
    // categories and tags
    let arrayOfCategories = categories && categories.split(',');
    let arrayOfTags = tags && tags.split(',');

    if (files.photo) {
      if (files.photo.size > 50000000) {
        return res.status(400).json({
          error: 'Image should be less then 5 Mb in size',
        });
      }

      uploadImageToStorage(files.photo, req.user._id)
        .then((url) => {
          blog.photo = url;
          blog.save((err, result) => {
            if (err) {
              return res.status(400).json({
                error: errorHandler(err),
              });
            }
            // res.json(result);
            Blog.findByIdAndUpdate(
              result._id,
              { $push: { categories: arrayOfCategories } },
              { new: true }
            ).exec((err, result) => {
              if (err) {
                console.log(err);
                return res.status(400).json({
                  error: errorHandler(err),
                });
              } else {
                Blog.findByIdAndUpdate(
                  result._id,
                  { $push: { tags: arrayOfTags } },
                  { new: true }
                ).exec((err, result) => {
                  if (err) {
                    console.log(err);
                    return res.status(400).json({
                      error: errorHandler(err),
                    });
                  } else {
                    res.json(result);
                  }
                });
              }
            });
          });
        })
        .catch((error) => {
          return res.status(400).json({
            error: 'Failed upload to server',
          });
        });
    }
  });
};

exports.list = (req, res) => {
  Blog.find({})
    .populate('categories', '_id name slug')
    .populate('tags', '_id name slug')
    .populate('postedBy', '_id name username')
    .select(
      '_id title slug excerpt categories tags postedBy createdAt updatedAt'
    )
    .exec((err, data) => {
      if (err) {
        return res.json({
          error: errorHandler(err),
        });
      }
      res.json(data);
    });
};

exports.listAllBlogsCategoriesTags = (req, res) => {
  let limit = req.body.limit ? parseInt(req.body.limit) : 10;
  let skip = req.body.skip ? parseInt(req.body.skip) : 0;

  let blogs;
  let categories;
  let tags;

  Blog.find({})
    .populate('categories', '_id name slug')
    .populate('tags', '_id name slug')
    .populate('postedBy', '_id name username profile')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select(
      '_id title slug excerpt photo categories tags postedBy createdAt updatedAt'
    )
    .exec((err, data) => {
      if (err) {
        return res.json({
          error: errorHandler(err),
        });
      }
      blogs = data; // blogs
      // get all categories
      Category.find({}).exec((err, c) => {
        if (err) {
          return res.json({
            error: errorHandler(err),
          });
        }
        categories = c; // categories
        // get all tags
        Tag.find({}).exec((err, t) => {
          if (err) {
            return res.json({
              error: errorHandler(err),
            });
          }
          tags = t;
          // return all blogs categories tags
          res.json({ blogs, categories, tags, size: blogs.length });
        });
      });
    });
};

exports.read = (req, res) => {
  const slug = req.params.slug.toLowerCase();
  Blog.findOne({ slug })
    .populate('categories', '_id name slug')
    .populate('tags', '_id name slug')
    .populate('postedBy', '_id name username')
    .select(
      '_id title body slug mtitle mdesc photo categories tags postedBy createdAt updatedAt'
    )
    .exec((err, data) => {
      if (err) {
        return res.json({
          error: errorHandler(err),
        });
      }
      res.json(data);
    });
};

exports.remove = (req, res) => {
  const slug = req.params.slug.toLowerCase();
  Blog.findOneAndRemove({ slug }).exec((err, data) => {
    if (err) {
      return res.json({
        error: errorHandler(err),
      });
    }
    res.json({
      message: 'Blog deleted successfully',
    });
  });
};

exports.update = (req, res) => {
  const slug = req.params.slug.toLowerCase();

  Blog.findOne({ slug }).exec((err, oldBlog) => {
    if (err) {
      return res.status(400).json({
        error: errorHandler(err),
      });
    }

    let form = new formidable.IncomingForm();
    form.keepExtensions = true;

    form.parse(req, (err, fields, files) => {
      if (err) {
        return res.status(400).json({
          error: 'Image could not upload',
        });
      }

      let slugBeforeMerge = oldBlog.slug;
      oldBlog = _.merge(oldBlog, fields);
      oldBlog.slug = slugBeforeMerge;

      const { body, desc, categories, tags } = fields;

      if (body) {
        oldBlog.excerpt = smartTrim(body, 320, ' ', ' ...');
        oldBlog.desc = stripHtml(body.substring(0, 160));
      }

      if (categories) {
        oldBlog.categories = categories.split(',');
      }

      if (tags) {
        oldBlog.tags = tags.split(',');
      }

      if (files.photo) {
        if (files.photo.size > 10000000) {
          return res.status(400).json({
            error: 'Image should be less then 1mb in size',
          });
        }
        uploadImageToStorage(files.photo)
          .then((url) => {
            oldBlog.photo = url;
            oldBlog.save((err, result) => {
              if (err) {
                return res.status(400).json({
                  error: errorHandler(err),
                });
              }
              // result.photo = undefined;
              res.json(result);
            });
          })
          .catch((error) => {
            return res.status(400).json({
              error: 'Failed upload to server',
            });
          });
      }
    });
  });
};

exports.listRelated = (req, res) => {
  let limit = req.body.limit ? parseInt(req.body.limit) : 3;
  const { _id, categories } = req.body.blog;

  Blog.find({ _id: { $ne: _id }, categories: { $in: categories } })
    .limit(limit)
    .populate('postedBy', '_id name profile')
    .select('title slug excerpt photo postedBy createdAt updatedAt')
    .exec((err, blogs) => {
      if (err) {
        return res.status(400).json({
          error: 'Blogs not found',
        });
      }
      res.json(blogs);
    });
};

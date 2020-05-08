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

const storage = new Storage({
  projectId: process.env.FIREBASE_ID,
  keyFilename: path.join(__dirname, '..', 'firebase.json'),
});
const bucket = storage.bucket(`${process.env.FIREBASE_ID}.appspot.com`);

const uploadImageToStorage = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject('No image file');
    }

    let uuid = UUID();
    bucket
      .upload(file.path, {
        destination: 'images/' + file.name,
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

      uploadImageToStorage(files.photo)
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

const fs = require('fs');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const UUID = require('uuid-v4');

const storage = new Storage({
  projectId: process.env.FIREBASE_ID,
  keyFilename: path.join(__dirname, '..', 'firebase.json'),
});
const bucket = storage.bucket(`${process.env.FIREBASE_ID}.appspot.com`);

exports.uploadImage = (file, userId) => {
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

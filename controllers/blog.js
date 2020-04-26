const time = (req, res) => {
  res.json({ time: Date.toString() });
};

exports.time = time;

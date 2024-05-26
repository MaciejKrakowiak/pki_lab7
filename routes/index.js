var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express', clientID: 'Ov23liBoj8bgUailpfhF' });
});

module.exports = router;

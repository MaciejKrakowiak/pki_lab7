var express = require('express');
var router = express.Router();

/* GET home page. */
const clientID = 'Ov23liBoj8bgUailpfhF'
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express', clientID: clientID });
});

module.exports = router;

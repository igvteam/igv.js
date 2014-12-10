var page = require('webpage').create();
page.open('http://www.apple.com', function() {
  page.render('www-apple-com.png');
  phantom.exit();
});


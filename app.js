var express = require('express');
var http = require('http');
var path = require('path');
var request = require('request').defaults({ encoding: null }); // force to buffer

// image processing
var cv = require('opencv');
var gm = require('gm');

// cache
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/thumborizer');
var imageSchema = mongoose.Schema({
    fileName: String,
    fileType: String,
    buffer: Buffer,
    signature: { type: String, unique: true },
    width: Number,
    height: Number,
    fileSize: String,
    url: { type: String, required: true }
});
var Photo = mongoose.model('Photo', imageSchema);

var app = express();

// all environments
app.set('port', process.env.PORT || 8888);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// facial deteciton
function detection(algorithm) {
  return path.join(__dirname, 'face_haar', algorithm);
}

// routing
app.get('/avatar/:size/:url(*)', function(req, res) {

  var size = req.params.size;
  var url = req.params.url;

  // before downloading the image, check if url was already loaded before
  Photo.findOne({ url: url }, function (err, photo) {
    if (err) return handleError(err);
    console.log(photo);
    // if null then save it
    if (!photo) {
      newImage(url, res);
    } else {
      // cached image
      cachedImage(url, photo, res);
    }

  });


  
});

app.get('/meta/:size/:image-url(*)', function() {

});

function cachedImage(url, photo, res) {
  // read image from imgBuffer
  cv.readImage(photo.buffer, function(err, image){
    // do facial detection
    image.detectObject(detection('haarcascade_frontalface_alt.xml'), {}, function(err, faces){
      // now crop it
      gm(photo.buffer, photo.fileName)
      .crop(faces[0].width, faces[0].height,  faces[0].x,  faces[0].y)
      .toBuffer(function (err, buff) {
        // show the output image on the imgBuffer
        res.setHeader('Content-Type', 'image/jpeg');
        res.send(buff);
      });
    });
    // end facial detection
  });
  // end read image from imgBuffer
}

function newImage(url, res) {
  // get image from url request
  request.get(url, function (error, response, imgBuffer) {

    // get the image data
    gm(imgBuffer).identify(function (err, data){
      var filename = path.basename(url);
      var signature = data.Signature;
      var size = data.size;
      var format = data.format;
      var filesize = data.Filesize;

      var photo = new Photo();
      photo.fileName = filename;
      photo.fileType = format;
      photo.buffer = imgBuffer;
      photo.signature = signature;
      photo.width = size.width;
      photo.height = size.height;
      photo.fileSize = filesize;
      photo.url = url;

      photo.save(function (err) {
        if (err) return console.log(err);
      });

    });

    // read image from imgBuffer
    cv.readImage(imgBuffer, function(err, image){
      // do facial detection
      image.detectObject(detection('haarcascade_frontalface_alt.xml'), {}, function(err, faces){
        console.log(faces);

        // now crop it
        gm(imgBuffer, 'image.jpg')
        .crop(faces[0].width, faces[0].height,  faces[0].x,  faces[0].y)
        .toBuffer(function (err, buff) {
          // show the output image on the imgBuffer
          res.setHeader('Content-Type', 'image/jpeg');
          res.send(buff);
        });

      });
      // end facial detection
    });
    // end read image from imgBuffer
    
  });
  // end get image from url request
}

http.createServer(app).listen(app.get('port'), function(){
  console.log('Thumborizer server listening on port ' + app.get('port'));
});

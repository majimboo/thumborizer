var express = require('express');
var http = require('http');
var path = require('path');
var request = require('request').defaults({ encoding: null }); // force to buffer

// config
var config = require('./config.json');

// image processing
var cv = require('opencv');
var gm = require('gm');

// cache
var mongoose = require('mongoose');
mongoose.connect(config.database);
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
app.set('port', process.env.PORT || config.port);
app.use(express.logger('dev'));
app.use(express.methodOverride());
app.use(app.router);

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// facial deteciton
function detection(algorithm) {
  return path.join(__dirname, 'face_haar', algorithm + '.xml');
}

// routing
app.get('/avatar/:size/:url(*)', function(req, res) {

  var size = req.params.size;
  var url = req.params.url;

  // format the sizes
  size = size.split("x");
  size = { width: size[0], height: size[1] }

  // before downloading the image, check if url was already loaded before
  Photo.findOne({ url: url }, function (err, photo) {
    if (err) return console.log(err);
    // if null then save it
    if (!photo) {
      newImage(url, size, res);
    } else {
      // cached image
      cachedImage(url, photo, size, res);
    }

  });
});

app.get('/meta/:size/:image-url(*)', function() {

});

function cachedImage(url, photo, size, res) {
  // read image from imgBuffer
  cv.readImage(photo.buffer, function(err, image){
    // do facial detection
    image.detectObject(detection(config.detection.face), {}, function(err, faces){
      // do facial detection
      if (faces.length < 0) {      
        console.log(faces);
        // now crop it
        gm(photo.buffer, photo.fileName)
        .crop(faces[0].width + 100, faces[0].height + 100, faces[0].x - (100/2),  faces[0].y - (100/2))
        .toBuffer(function (err, buff) {
          // now that the face is cropped, resize to specified size
          gm(buff, photo.fileName)
          .resize(size.width, size.height) // resize but keep the aspect ratio
          .toBuffer(function (err, rbuff) {
            // show the output image on the imgBuffer
            res.setHeader('Content-Type', photo.fileType);
            res.send(rbuff);
          });
        });
      }
      // do good feature deteciotn
      else {
        // now that the face is cropped, resize to specified size
        gm(photo.buffer, photo.fileName)
        .resize(size.width, size.height, '^') // resize to width but keep the aspect ratio
        .gravity('Center')
        .crop(size.width, size.height)
        .toBuffer(function (err, rbuff) {
          // show the output image on the imgBuffer
          res.setHeader('Content-Type', photo.fileType);
          res.send(rbuff);
        });        
      }
    });
    // end facial detection
  });
  // end read image from imgBuffer
}

function newImage(url, size, res) {
  // get image from url request
  request.get(url, function (error, response, imgBuffer) {
    var filename = path.basename(url);
    if (error) return console.log(error)

    // get the image data
    gm(imgBuffer).identify(function (err, data){
      
      var signature = data.Signature;
      var size = data.size;
      var format = data.format;
      var filesize = data.Filesize;

      var photo = new Photo();
      photo.fileName = filename;
      photo.fileType = 'image/' + format.toLowerCase();
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
      image.detectObject(detection(config.detection.face), {}, function(err, faces){
        // do facial detection
        if (faces.length < 0) {
          console.log(faces);
          // now crop it
          gm(imgBuffer, filename)
          .crop(faces[0].width + 100, faces[0].height + 100, faces[0].x - (100/2),  faces[0].y - (100/2))
          .toBuffer(function (err, buff) {
            // now that the face is cropped, resize to specified size
            gm(buff, filename)
            .resize(size.width, size.height)
            .toBuffer(function (err, rbuff) {
              // show the output image on the imgBuffer
              res.setHeader('Content-Type', 'image/jpeg');
              res.send(rbuff);
            });
          });          
        }
        // do good feature detection
        else {
          // now that the face is cropped, resize to specified size
          gm(imgBuffer, filename)
          .resize(size.width, size.height, '^') // resize to width but keep the aspect ratio
          .gravity('Center')
          .crop(size.width, size.height)
          .toBuffer(function (err, rbuff) {
            // show the output image on the imgBuffer
            res.setHeader('Content-Type', photo.fileType);
            res.send(rbuff);
          });  
        }
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

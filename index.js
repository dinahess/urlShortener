require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dns = require('dns');
const { EventEmitterAsyncResource } = require('events');
const app = express();
const mongoose = require('mongoose');
/* 
MongoDB structure is org -> project -> cluster -> databases -> collections
Dina's org -> Project FCC -> Node-Expess-FCC -> 1) sample_mflix, 2) test, 3) url_shortener -> url
*/
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
console.log('Connected to MongoDB');
}).catch(err => {
console.error('Error connecting to MongoDB', err);
});

const urlSchema = new mongoose.Schema({
  originalUrl: {
    type: String,
    required: true
  },
  shortUrl: {
    type: Number,
    required: true
  }
});
/*
The first argument is the singular name of the collection your model is for. Mongoose automatically looks for the plural, lowercased version of your model name. Thus, for the example above, the model Tank is for the tanks collection in the database.
*/
const UrlModel = mongoose.model("Url", urlSchema);

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));
// handles post requests
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.get('/api/shorturl/:id', async (req, res) => {
  if (Number(req.params.id)) {
    const urlExists = await UrlModel.findOne({shortUrl: req.params.id});
    if (urlExists) {
      const originalUrl = urlExists.originalUrl;
      res.redirect(originalUrl);
    } else {
      res.json({ error: "No short URL found for the given input"});
    }
  } else {
    res.json({ error: "Wrong format" });
  }
});

app.post('/api/shorturl', async (req, res) => {
  const lookupUrl = async url => {
    try {
      const urlObj = new URL(url);
      return new Promise((resolve, reject) => {
        dns.lookup(urlObj.hostname, (err, address, family) => {
            if(err) {
              reject(err);
            } else {
              resolve(address);
            }
        });
      });
    }
    catch(e) {
      return "Invalid";
    }
  };
  let validUrl;
  try {
    validUrl = await lookupUrl(req.body.url);
  } catch(err) {
    validUrl = "Invalid";
  }
  if (validUrl !== "Invalid") {
    let shortenedUrl;
    const urlExists = await UrlModel.findOne({originalUrl: req.body.url});
    if (urlExists) {
      shortenedUrl = urlExists.shortUrl;
    } 
    else {
      const urlCount = await UrlModel.countDocuments({}, { hint: "_id_" });
      shortenedUrl = urlCount + 1;
      var newUrl = new UrlModel({ originalUrl: req.body.url, shortUrl: shortenedUrl});
      await newUrl.save();
    }
    return res.json({ original_url : req.body.url, short_url : shortenedUrl });
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

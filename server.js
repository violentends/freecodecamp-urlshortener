"use strict";

var express = require("express");
var bodyParser = require("body-parser");
var sqlite3 = require("sqlite3");
var dbFile = "./db.sqlite3";
var dns = require("dns");

var cors = require("cors");
var app = express();

// Basic Configuration
var port = process.env.PORT || 3000;

/** this project needs a db !! **/
// mongoose.connect(process.env.DB_URI);
let db = new sqlite3.Database(dbFile);
db.run(`
  create table if not exists urls (
    url text,
    id integer primary key autoincrement
  );
`);
db.close();

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({ extended: false }));

app.use("/public", express.static(process.cwd() + "/public"));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// your first API endpoint...
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

app.post("/api/shorturl/new", function (req, res) {
  let url = "";
  let urlObj
  try {
    urlObj = new URL(req.body.url);
    if(urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      res.json({
        error: "invalid url",
      });
      return;
    }
    url = urlObj.toString();
  } catch (error) {
    res.json({
      error: "invalid url",
    });
    return;
  }
  dns.lookup(urlObj.hostname, (error) => {
    if (error) {
      console.log(error);
      res.json({ error: "invalid url" });
      return;
    }
    let db = new sqlite3.Database(dbFile);
    db.run(
      ` insert into urls (url)
  values (?);`,
      [url],
      function (err) {
        if (err) {
          console.log("error: ", err);
          res.json({ error: "db error" });
        }
      }
    );
    db.get(`select * from urls where url = ?`, [url], function (err, row) {
      if (err) {
        res.json({ error: "db error" });
      }
      res.json({
        original_url: row.url,
        short_url: row.id,
      });
    });
    db.close();
  });
});

app.get("/api/shorturl/:id", function (req, res) {
  let id = parseInt(req.params.id);
  let db = new sqlite3.Database(dbFile);
  db.get("select * from urls where id = ? ", [id], function (err, row) {
    if (err) {
      res.json({ error: "invalid url" });
      return
    } else {
      res.redirect(row.url);
    }
  });
});

app.listen(port, function () {
  console.log("Node.js listening ...", port);
});

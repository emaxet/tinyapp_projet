const express      = require("express"),
      app          = express(),
      PORT         = process.env.PORT || 3000, // 8080 is default. Otherwise if a port is specified as an environmental variable, it's used.
      bodyParser   = require("body-parser"),
      ejs          = require("ejs"),
      cookieParser = require('cookie-parser'),
      path         = require('path');

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

function generateRandomString() {
  let shortURL = "";
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
  for (let i = 0; i < 6; i++) {
    shortURL += possible[Math.floor(Math.random() * possible.length)];
  }
  return shortURL
};

function shortenURL(userID, shortURL, longURL) {
  urlDatabase[shortURL] = longURL;
  users[userID]["shortURLs"].push(shortURL);
}

// URL DALTA

let urlDatabase = {
    "b2xVn2": "http://www.lighthouselabs.ca",
    "9sm5xK": "http://www.google.com"
};

// USER DATA

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur",
    shortURLs: ["b2xVn2"]
  },
 "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk",
    shortURLs: ["9sm5xK"]
  }
};

// ROUTES

// INDEX

app.get("/", (req, res) => {
  res.send("<html><body><h1>Hi!</h1><p>Welcome to the page</p></body></html>");
});

// CREATE

// CREATE NEW SHORT URL

app.post("/urls", (req, res) => {

  var longURL  = req.body.longURL,
      shortURL = generateRandomString(),
      userID   = req.cookies.user_id;

  shortenURL(userID, shortURL, longURL);

  res.redirect(`/urls/${shortURL}`);
});

// REGISTER NEW USER

app.post("/register", (req, res) => {
  let email    = req.body.email,
      password = req.body.password,
      userID   = generateRandomString();

  if (email && password){
   users[userID] = {
    'id'       : userID,
    'email'    : email,
    'password' : password,
    'shortURLs': []
  }

  res.cookie("user_id", userID);
  res.redirect("/urls");
  } else {
    let error = true;
    res.status(400);
    res.render("register", { error: true, users: users, cookie: req.cookies.user_id });
  }
});

// LOG IN USER

app.post("/login", (req, res) => {

  var email    = req.body.email,
      password = req.body.password;

  for (var key in users) {
    if (users[key].email === email && users[key].password === password) {
      res.cookie("user_id", key);
      res.redirect("/urls");
    }
  }
    let error = true;
    res.status(400);
    res.render("login", { error: true, users: users, cookie: req.cookies.user_id });
});

// READ

app.get("/urls", (req, res) => {
  res.render("urls_index", {
    urls: urlDatabase,
    users: users,
    cookie: req.cookies.user_id,
    error: false,
    deleteError: false
  });
});

app.get("/urls/new", (req, res) => {
  if (req.cookies.user_id) {
    res.render("urls_new", { users: users, cookie: req.cookies.user_id });
  } else {
    res.render("urls_index", { error: true, users: users, cookie: req.cookies.user_id, urls: urlDatabase });
  }
});

app.get("/urls/:id", (req, res) => {

  res.render("urls_show", {
    shortURL: req.params.id,
    longURL: urlDatabase[req.params.id],
    users : users,
    cookie: req.cookies.user_id,
    error: false
  });
});

app.get("/u/:shortURL", (req, res) => {
  let shortURL = req.params.shortURL;
  res.redirect(urlDatabase[shortURL]);
});

app.get("/urls.json", (req, res) => {
  res.send(urlDatabase);
});

app.get("/register", (req, res) => {
  res.render("register", { users: users, error: false, cookie: req.cookies.user_id });
});

app.get("/login", (req, res) => {
  res.render("login", { users: users, error: false, cookie: req.cookies.user_id });
});

// UPDATE

app.post("/urls/:id/update", (req,res) => {
  let shortURL = req.params.id,
      userURLs = users[req.cookies.user_id]['shortURLs'],
      newURL   = req.body.update;

  userURLs.forEach((url) => {
    if (url === shortURL) {
      urlDatabase[shortURL] = req.body.update;
      res.redirect("/urls");
    }
  });
  res.render("urls_show", {
    shortURL: req.params.id,
    longURL: urlDatabase[shortURL],
    users : users,
    cookie: req.cookies.user_id,
    error: true
  });
});

// DELETE

app.post("/urls/:id/delete", (req, res) => {
  let shortURL = req.body.delete,
      userURLs = users[req.cookies.user_id]['shortURLs'];

  userURLs.forEach((url) => {
    if (url === shortURL) {
      let urlIndex = userURLs.indexOf(url);
      userURLs.splice(urlIndex, 1);
      delete urlDatabase[shortURL];
      res.redirect("/urls");
    }
  });
  res.render("urls_index", {
    urls: urlDatabase,
    users: users,
    cookie: req.cookies.user_id,
    error: false,
  });
});

app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/urls");
});


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
const express       = require("express"),
      app           = express(),
      PORT          = process.env.PORT || 3000,
      bodyParser    = require("body-parser"),
      path          = require('path'),
      bcrypt        = require('bcrypt'),
      cookieSession = require('cookie-session');

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieSession({
  name: 'user_id',
  keys: ['key1', 'key2'],
}));

// ---------------------------------- HELPER FUNCTIONS

function generateRandomString() {
  let shortURL = "";
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
  for (let i = 0; i < 6; i++) {
    shortURL += possible[Math.floor(Math.random() * possible.length)];
  }
  return shortURL
}

function shortenURL(userID, shortURL, longURL) {
  urlDatabase[shortURL] = longURL;
  users[userID]["shortURLs"].push(shortURL);
}

// ----------------------------------- DATABASE

// URL DATA

let urlDatabase = {};

// USER DATA

const users = {};

// ----------------------------------- ROUTES

// INDEX

app.get("/", (req, res) => {
  (req.session.user_id) ? res.redirect("/urls") : res.redirect("/login");
});

// --------------- CREATE

// CREATE NEW SHORT URL

app.post("/urls", (req, res) => {

  var longURL  = req.body.longURL,
      shortURL = generateRandomString(),
      userID   = req.session.user_id;

  if (userID) {
    shortenURL(userID, shortURL, longURL);
    res.redirect(`/urls/${shortURL}`);
  } else {
    res.render("urls_index", {
      urls: urlDatabase,
      users: users,
      cookie: req.session.user_id,
      error: false
    });
  }
});

// REGISTER NEW USER

app.post("/register", (req, res) => {
  let email          = req.body.email,
      userID         = generateRandomString(),
      password       = req.body.password,
      hashedPassword = bcrypt.hashSync(password, 10);

  for (var key in users) {
    if (users[key]['email'] === email) {
      res.render("register", {
        users: users,
        error: false,
        cookie: req.session.user_id,
        emailExists: true
      });
    }
  }

  if (email && password){
   users[userID] = {
    'id'       : userID,
    'email'    : email,
    'password' : hashedPassword,
    'shortURLs': []
  }

  req.session.user_id = userID;
  res.redirect("/urls");
  } else {
    res.status(400);
    res.render("register", {
      error: true,
      users: users,
      cookie: req.session.user_id
    });
  }
});

// LOG IN USER

app.post("/login", (req, res) => {

  const email    = req.body.email,
        password = req.body.password;

  for (var key in users) {
    if (users[key].email === email && bcrypt.compareSync(password, users[key].password)) {
      req.session.user_id = key;
      res.redirect("/urls");
    }
  }
    let error = true;
    res.status(400);
    res.render("login", {
      error: true,
      users: users,
      cookie: req.session.user_id
    });
});

// --------------- READ

// READ INDEX_URLS

app.get("/urls", (req, res) => {
  res.render("urls_index", {
    urls: urlDatabase,
    users: users,
    cookie: req.session.user_id,
    error: false
  });
});

// READ NEW URL FORM

app.get("/urls/new", (req, res) => {
  if (req.session.user_id) {
    res.render("urls_new", {
      users: users,
      cookie: req.session.user_id });
  } else {
    res.render("urls_index", {
      error: true,
      users: users,
      cookie: req.session.user_id,
      urls: urlDatabase
    });
  }
});

// READ URL BREAKDOWN (SHORT URL & LONG URL)

app.get("/urls/:id", (req, res) => {

  res.render("urls_show", {
    shortURL: req.params.id,
    longURL: urlDatabase[req.params.id],
    users : users,
    cookie: req.session.user_id,
    error: false
  });
});

// REDIRECT USER TO SPECIFIED URL

app.get("/u/:shortURL", (req, res) => {
  let shortURL = req.params.shortURL;

  if (urlDatabase[shortURL]) {
    res.redirect(urlDatabase[shortURL]);
  } else {
  res.status(404).send("The requested URL was not found.");
  }
});

// READ URL DATABASE

app.get("/urls.json", (req, res) => {
  res.send(urlDatabase);
});

// READ REGISTRATION PAGE

app.get("/register", (req, res) => {
  res.render("register", {
    users: users,
    error: false,
    cookie: req.session.user_id,
    emailExists: false
  });
});

// READ LOGIN PAGE

app.get("/login", (req, res) => {
  res.render("login", {
    users: users,
    error: false,
    cookie: req.session.user_id
  });
});

// --------------- UPDATE

// UPDATE LONG URL

app.post("/urls/:id/update", (req,res) => {
  let shortURL = req.params.id,
      userURLs = users[req.session.user_id]['shortURLs'],
      newURL   = req.body.update;

  userURLs.forEach((url) => {
    if (url === shortURL) {
      urlDatabase[shortURL] = newURL;
      res.redirect("/urls");
    }
  });
  res.render("urls_show", {
    shortURL: req.params.id,
    longURL: urlDatabase[shortURL],
    users : users,
    cookie: req.session.user_id,
    error: true
  });
});

// --------------- DELETE

// DELETE SPECIFIED URL

app.post("/urls/:id/delete", (req, res) => {
  let shortURL = req.body.delete,
      userURLs = users[req.session.user_id]['shortURLs'];

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
      cookie: req.session.user_id,
      error: false
    });
});

// USER LOGOUT (REMOVE USER_ID COOKIE)

app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/urls");
});

// ----------------------------------- APP LISTENER

app.listen(PORT, () => {
  console.log(`TinyApp is listening on port ${PORT}!`);
});


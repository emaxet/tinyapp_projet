const express       = require("express");
const bodyParser    = require("body-parser");
const path          = require('path');
const bcrypt        = require('bcrypt');
const cookieSession = require('cookie-session');

const PORT = process.env.PORT || 8080;
const app  = express();

// ----------------------------------- DATABASE

// URL DATA

let urlDatabase = {};

// USER DATA

const users = {};

// ---------------------------------- MIDDLEWARE

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieSession({
  name: 'user_id',
  keys: ['key1']
}));
app.use((req, res, next) => {
  res.locals.email = req.session.user_id ? users[req.session.user_id].email : null;
  next();
});

// ---------------------------------- HELPER FUNCTIONS

function generateRandomString() {
  let shortURL = "";
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
  for (let i = 0; i < 6; i++) {
    shortURL += possible[Math.floor(Math.random() * possible.length)];
  }
  return shortURL;
}

function logShortURL(userID, shortURL, longURL) {
  urlDatabase[shortURL] = {
    'longURL': longURL,
    'viewCount': 0
  };
  users[userID]["shortURLs"].push(shortURL);
}

function urlViewCount(shortURL, viewCount) {
  urlDatabase[shortURL][viewCount] += 1;
}

function urlUniqueViews (userID, shortURL) {

}


// ----------------------------------- ROUTES

// INDEX

app.get("/", (req, res) => {
  (req.session.user_id) ? res.redirect("/urls") : res.redirect("/login");
});

// --------------- CREATE

// CREATE NEW SHORT URL

app.post("/urls", (req, res) => {

  let longURL  = req.body.longURL;
  let shortURL = generateRandomString();
  let userID   = req.session.user_id;
  let passVars = {
    urls: urlDatabase,
    users: users,
    userID: req.session.user_id,
    loggedOut: true
  };

  if (userID) {
    logShortURL(userID, shortURL, longURL);
    res.redirect(`/urls/${shortURL}`);
  } else {
    res.render("urls_index", passVars);
  }
});

// REGISTER NEW USER

app.post("/register", (req, res) => {
  let email          = req.body.email;
  let userID         = generateRandomString();
  let password       = req.body.password;
  let hashedPassword = bcrypt.hashSync(password, 10);
  let passVars       = {
    users: users,
    emptyInputs: false,
    userID: req.session.user_id,
    emailExists: false
  };

  for (var key in users) {
    if (users[key]['email'] === email) {
      passVars['emailExists'] = true;
      return res.render("register", passVars);
    }
  }

  if (email && password){
    users[userID] = {
      'id': userID,
      'email': email,
      'password': hashedPassword,
      'shortURLs': []
    };

    req.session.user_id = userID;
    res.redirect("/urls");
  } else {
    passVars['emptyInputs'] = true;
    res.status(400);
    res.render("register", passVars);
  }
});

// LOG IN USER

app.post("/login", (req, res) => {

  let email    = req.body.email;
  let password = req.body.password;
  let passVars = {
    error: true,
    users: users,
    userID: req.session.user_id
  };

  for (var key in users) {
    if (users[key].email === email && bcrypt.compareSync(password, users[key].password)) {
      req.session.user_id = key;
      return res.redirect("/urls");
    }
  }
  let error = true;
  res.status(400);
  res.render("login", passVars);
});

// --------------- READ

// READ INDEX_URLS

app.get("/urls", (req, res) => {
  let passVars = {
    urls: urlDatabase,
    users: users,
    userID: req.session.user_id,
    loggedOut: false
  };
  res.render("urls_index", passVars);
});

// READ NEW URL FORM

app.get("/urls/new", (req, res) => {
  let passVars = {
    users: users,
    userID: req.session.user_id
  };

  if (req.session.user_id) {
    res.render("urls_new", { passVars });
  } else {
    passVars["loggedOut"] = true;
    passVars["urls"] = urlDatabase;
    res.render("urls_index", passVars);
  }
});

// READ SHORT URL

app.get("/urls/:id", (req, res) => {
  let shortURL = req.params.id;
  let passVars = {
    shortURL: shortURL,
    users: users,
    userID: req.session.user_id,
    error: false
  };

  if (urlDatabase[shortURL]) {
    urlViewCount(shortURL, "viewCount");
    passVars['urlNotFound'] = false;
    passVars['viewCount'] = urlDatabase[shortURL]["viewCount"];
    passVars['longURL'] = urlDatabase[shortURL].longURL;

    res.render("urls_show", passVars);
  } else {
    passVars['urlNotFound'] = true;
    res.status(404);
    res.render("urls_show", passVars);
  }
});

// REDIRECT USER TO SPECIFIED URL

app.get("/u/:shortURL", (req, res) => {
  let shortURL = req.params.shortURL;

  if (urlDatabase[shortURL]) {
    res.redirect(urlDatabase[shortURL]);
  } else {
    res.status(404);
    res.redirect(`/urls/${shortURL}`);
  }
});

// READ URL DATABASE

app.get("/urls.json", (req, res) => {
  res.send(urlDatabase);
});

// READ REGISTRATION PAGE

app.get("/register", (req, res) => {
  let passVars = {
    users: users,
    userID: req.session.user_id,
    emailExists: false,
    emptyInputs: false
  };

  res.render("register", passVars);
});

// READ LOGIN PAGE

app.get("/login", (req, res) => {
  let passVars = {
    users: users,
    error: false,
    userID: req.session.user_id
  };
  res.render("login", passVars);
});

// --------------- UPDATE

// UPDATE LONG URL

app.post("/urls/:id/update", (req, res) => {
  let shortURL = req.params.id;
  let userURLs = users[req.session.user_id]['shortURLs'];
  let newURL   = req.body.update;
  let passVars = {
    shortURL: req.params.id,
    longURL: urlDatabase[shortURL],
    viewCount: urlDatabase[shortURL].viewCount,
    users: users,
    userID: req.session.user_id,
    error: true
  };

  userURLs.forEach((url) => {
    if (url === shortURL) {
      urlDatabase[shortURL] = newURL;
      res.redirect("/urls");
    }
  });
  res.render("urls_show", passVars);
});

// --------------- DELETE

// DELETE SPECIFIED URL

app.post("/urls/:id/delete", (req, res) => {
  if (!req.session.user_id) {
    res.status(401).send("401 Error: You aren't authorized to perform this action");
  }

  let shortURL = req.body.delete;
  let userURLs = users[req.session.user_id]['shortURLs'];

  userURLs.forEach((url) => {
    if (url === shortURL) {
      let urlIndex = userURLs.indexOf(url);
      userURLs.splice(urlIndex, 1);
      delete urlDatabase[shortURL];
      return res.redirect("/urls");
    }
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



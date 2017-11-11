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
  app.locals.email = req.session.user_id ? users[req.session.user_id].email : null;
  app.locals.viewCount = null;
  app.locals.uniqueViews = null;
  app.locals.timeStamp = null;
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

function urlTimeStamp (shortURL) {
  let monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  let date = new Date();
  let year = date.getFullYear();
  let month = date.getMonth();
  let day = date.getDate();
  let hours = date.getHours();
  let mins = date.getMinutes();

  return `${monthNames[month]} ${day}, ${year} at ${hours}:${mins}`;
}

function logShortURL(userID, shortURL, longURL, timeStamp) {
  urlDatabase[shortURL] = {
    'longURL': longURL,
    'viewCount': 0,
    'viewerIDs': [],
    'timeStamp': urlTimeStamp()
  };
  users[userID]["shortURLs"].push(shortURL);
}

function urlViewCount(shortURL, viewCount) {
  urlDatabase[shortURL][viewCount] += 1;
}

function urlUniqueViews (userID, shortURL) {
  let viewerArray = urlDatabase[shortURL]['viewerIDs'];
  if (viewerArray.indexOf(userID) === -1) {
    viewerArray.push(userID);
  }
  return viewerArray.length;
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

  if (app.locals.email) {
    logShortURL(userID, shortURL, longURL);
    res.redirect(`/urls/${shortURL}`);
  } else {
    res.redirect("/urls");
  }
});

// REGISTER NEW USER

app.post("/register", (req, res) => {
  let email          = req.body.email;
  let userID         = generateRandomString();
  let password       = req.body.password;
  let hashedPassword = bcrypt.hashSync(password, 10);
  let passVars       = {
    emptyInputs: false,
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

  for (var key in users) {
    if (users[key].email === email && bcrypt.compareSync(password, users[key].password)) {
      req.session.user_id = key;
      return res.redirect("/urls");
    }
  }
  passVars['noMatch'] = true;
  res.status(400);
  res.render("login", { noMatch: false } );
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
    urls: urlDatabase,
    userID: req.session.user_id
  };

  if (app.locals.email) {
    res.render("urls_new");
  } else {
    passVars["loggedOut"] = true;
    res.render("urls_index", passVars);
  }
});

// READ SHORT URL

app.get("/urls/:id", (req, res) => {
  let shortURL = req.params.id;
  let userID = req.session.user_id;
  let passVars = {
    shortURL: shortURL,
    users: users,
    userID: userID
  };

  if (urlDatabase[shortURL]) {

    urlViewCount(shortURL, "viewCount");
    passVars['urlNotFound'] = false;
    passVars['viewCount']   = urlDatabase[shortURL]["viewCount"];
    passVars['uniqueViews'] = urlUniqueViews(userID, shortURL);
    passVars['longURL']     = urlDatabase[shortURL].longURL;
    passVars['timeStamp']   = urlDatabase[shortURL]["timeStamp"];

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
  res.render("register", { emailExists: false, emptyInputs: false });
});

// READ LOGIN PAGE

app.get("/login", (req, res) => {
  res.render("login", { noMatch: false } );
});

// READ MOST POPULAR (UNIQUE VIEWS) URLS

app.get("/urls/popular", (req, res) => {

  res.render("popular", )
});

// --------------- UPDATE

// UPDATE LONG URL

app.post("/urls/:id/update", (req, res) => {

  if (!app.locals.email) {
    return res.status(401).send("401 Error: You aren't authorized to perform this action");
  }

  let shortURL = req.params.id;
  let userURLs = users[req.session.user_id]['shortURLs'];
  let newURL   = req.body.update;

  userURLs.forEach((url) => {
    if (url === shortURL) {
      urlDatabase[shortURL]['longURL'] = newURL;
    }
  });
  return res.redirect("/urls");
});

// --------------- DELETE

// DELETE SPECIFIED URL

app.post("/urls/:id/delete", (req, res) => {
  if (!app.locals.email) {
    return res.status(401).send("401 Error: You aren't authorized to perform this action");
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



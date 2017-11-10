const express       = require("express"),
      app           = express(),
      PORT          = process.env.PORT || 3000,
      bodyParser    = require("body-parser"),
      path          = require('path'),
      bcrypt        = require('bcrypt'),
      cookieSession = require('cookie-session');

// ---------------------------------- MIDDLEWARE

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieSession({
  name: 'user_id',
  keys: ['key1'],
}));

app.use((req, res, next) => {
  res.locals.email = req.session.user_id ? users[req.session.user_id].email : null
  next();
});

// ---------------------------------- HELPER FUNCTIONS

function generateRandomString() {
  let shortURL = "";
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
  for (let i = 0; i < 6; i++) {
    shortURL += possible[Math.floor(Math.random() * possible.length)];
  }
  return shortURL
}

function logShortURL(userID, shortURL, longURL) {
  urlDatabase[shortURL] = {
    'longURL': longURL,
    'viewCount': 0,
  }
  users[userID]["shortURLs"].push(shortURL);
}

function urlViewCount(shortURL, viewCount) {
  urlDatabase[shortURL][viewCount] += 1;
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

  let longURL  = req.body.longURL,
      shortURL = generateRandomString(),
      userID   = req.session.user_id,
      passVars = {
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
  let email          = req.body.email,
      userID         = generateRandomString(),
      password       = req.body.password,
      hashedPassword = bcrypt.hashSync(password, 10);
      passVars       = {
        users: users,
        emptyInputs: false,
        userID: req.session.user_id,
        emailExists: false
      }

  for (var key in users) {
    if (users[key]['email'] === email) {
      passVars['emailExists'] = true;
      return res.render("register", passVars);
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
    passVars['emptyInputs'] = true;
    res.status(400);
    res.render("register", passVars);
  }
});

// LOG IN USER

app.post("/login", (req, res) => {

  const email    = req.body.email,
        password = req.body.password;
        passVars = {
          error : true,
          users : users,
          userID: req.session.user_id
        }

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
  }
  res.render("urls_index", passVars);
});

// READ NEW URL FORM

app.get("/urls/new", (req, res) => {
  let passVars = {
    users: users,
    userID: req.session.user_id,
  }

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
  let shortURL = req.params.id,
      passVars = {
        shortURL : shortURL,
        longURL  : urlDatabase[shortURL].longURL,
        users    : users,
        userID   : req.session.user_id,
        error    : false,
      };

  console.log(urlDatabase);
  console.log

  if (urlDatabase[shortURL]) {
    urlViewCount(shortURL, "viewCount");
    passVars['urlNotFound'] = false;
    passVars['viewCount'] = urlDatabase[shortURL]["viewCount"];

    res.render("urls_show", passVars);
  } else {
    passVars['urlNotFound'] = true;
    res.render("urls_show", passVars);
  }
});

// REDIRECT USER TO SPECIFIED URL

app.get("/u/:shortURL", (req, res) => {
  let shortURL = req.params.shortURL;

  if (urlDatabase[shortURL]) {
    res.redirect(urlDatabase[shortURL]);
  } else {
  res.status(404).send("Error 404: The requested URL was not found.");
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

app.post("/urls/:id/update", (req,res) => {
  let shortURL = req.params.id,
      userURLs = users[req.session.user_id]['shortURLs'],
      newURL   = req.body.update;
      passVars = {
        shortURL: req.params.id,
        longURL: urlDatabase[shortURL],
        viewCount: urlDatabase[shortURL].viewCount,
        users : users,
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
  let shortURL = req.body.delete,
      userURLs = users[req.session.user_id]['shortURLs'];
      passVars = {
        urls: urlDatabase,
        users: users,
        userID: req.session.user_id,
        loggedOut: false
      };

  userURLs.forEach((url) => {
    if (url === shortURL) {
      let urlIndex = userURLs.indexOf(url);
      userURLs.splice(urlIndex, 1);
      delete urlDatabase[shortURL];
      res.redirect("/urls");
    }
  });
    res.render("urls_index", passVars);
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



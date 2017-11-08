const express    = require("express"),
      app        = express(),
      PORT       = process.env.PORT || 8080, // 8080 is default. Otherwise if a port is specified as an environmental variable, it's used.
      bodyParser = require("body-parser"),
      ejs        = require("ejs");

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

function generateRandomString() {
  let shortURL = "";
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
  for (let i = 0; i < 6; i++) {
    shortURL += possible[Math.floor(Math.random() * possible.length)];
  }
  return shortURL
}

let urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

// ROUTES

// INDEX

app.get("/", (req, res) => {
  res.send("<html><body><h1>Hi!</h1><p>Welcome to the page</p></body></html>");
});

// CREATE

app.post("/urls", (req, res) => {
  let longURL = req.body.longURL;
  let shortURL = generateRandomString();
  urlDatabase[shortURL] = longURL;
  res.redirect(`/urls/${shortURL}`);
});

app.post("/login", (req, res) => {
  res.cookie("username", req.body.username);
  res.redirect("/urls");
});

// READ

app.get("/urls", (req, res) => {
  let templateVars = { urls: urlDatabase };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  res.render("urls_new");
});

app.get("/urls/:id", (req, res) => {
  res.render("urls_show", {
    shortURL: req.params.id,
    longURL: urlDatabase[req.params.id]
  });
});

app.get("/u/:shortURL", (req, res) => {
  shortURL = req.params.shortURL;
  res.redirect(urlDatabase[shortURL]);
});

app.get("/urls.json", (req, res) => {
  res.send(urlDatabase);
});

// UPDATE

app.post("/urls/:id/update", (req,res) => {
  var newURL = req.body.update;
  urlDatabase[req.params.id] = req.body.update;
  res.redirect("/urls");
});

// DELETE

app.post("/urls/:id/delete", (req, res) => {
  let id = req.body.delete;
  delete urlDatabase[id];
  res.redirect("/urls");
});



app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
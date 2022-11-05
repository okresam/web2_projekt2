const express = require("express");
const app = express();
const port = 3000;
const { auth, requiresAuth } = require('express-openid-connect');
const fs = require('fs')
const bodyParser = require('body-parser')
const db = require('./db');
const crypto = require('crypto'); 

require('dotenv').config();

app.set('veiw engine', 'ejs')

app.use(bodyParser.urlencoded({ extended: false }))

const config = {
  authRequired : false,
  idpLogout : true, //login not only from the app, but also from identity provider
  secret: process.env.SECRET,
  baseURL: `http://localhost:${port}`,
  clientID: process.env.CLIENT_ID,
  issuerBaseURL: 'https://dev-mlhpkl87steqsy2q.eu.auth0.com',
  clientSecret: process.env.CLIENT_SECRET,
  authorizationParams: {
  response_type: 'code'
  ,
  //scope: "openid profile email"
  },
};

app.use(auth(config));

app.get("/", async (req, res) => {
  res.render('index.ejs')
});

app.get("/xss", requiresAuth(), async (req, res) => {
  let komentari = (await db.query("SELECT * FROM komentari", [])).rows
  res.render('xss.ejs', { komentari: komentari, user: req.oidc.user, xss: req.query.xss})
});

app.post("/xss", requiresAuth(), async (req, res) => {
  let currentdate = new Date()
  let timenow = currentdate.getDate() + "/" + (currentdate.getMonth()+1)  + "/" + currentdate.getFullYear() + " "  + currentdate.getHours() + ":"  + currentdate.getMinutes() + ":" + currentdate.getSeconds()
  await db.query("INSERT INTO public.komentari(komentar, korisnik, vrijeme) VALUES ($1, $2, $3);",
  [req.body.komentar, req.oidc.user.name, timenow])

  res.redirect('/xss')
});

app.get("/ba/login", async (req, res) => {
  res.render('ba-login.ejs', { ba: req.query.ba, message: undefined})
});

app.get("/ba/register", async (req, res) => {
  res.render('ba-register.ejs', { ba: req.query.ba, message: undefined})
});

app.post("/ba/register", async (req, res) => {
  if (req.body.ba == 'vulnerability-disabled') {
    let passRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})");
    if (passRegex.test(req.body.password)) {
      let salt = crypto.randomBytes(16).toString('hex')
      let hash = crypto.pbkdf2Sync(req.body.password, salt, 1000, 64, 'sha512').toString('hex')

      try {
        await db.query("INSERT INTO public.korisnici(email, lozinka, salt) VALUES ($1, $2, $3);",
        [req.body.email, hash, salt])
        res.render('ba-register.ejs', { ba: req.body.ba, message: "Račun je uspješno registriran!"})
      } catch(e) {
        res.render('ba-register.ejs', { ba: req.body.ba, message: "Korisnik s navedenim emailom več postoji!"})
      }
      
    } else {
      res.render('ba-register.ejs', { ba: req.body.ba, message: "Lozinka nije dovoljno snažna!"})
    }
  } else {
    let salt = crypto.randomBytes(16).toString('hex')
    let hash = crypto.pbkdf2Sync(req.body.password, salt, 1000, 64, 'sha512').toString('hex')

    try {
      await db.query("INSERT INTO public.korisnici(email, lozinka, salt) VALUES ($1, $2, $3);",
        [req.body.email, hash, salt])
      res.render('ba-register.ejs', { ba: req.body.ba, message: "Račun je uspješno registriran!" })
    } catch (e) {
      res.render('ba-register.ejs', { ba: req.body.ba, message: "Korisnik s navedenim emailom več postoji!" })
    }

  }
});

app.post("/ba/login", async (req, res) => {
  let user = (await db.query("SELECT * FROM public.korisnici WHERE email = $1", [req.body.email])).rows

  if (user.length != 0) {
    let storedHash = user[0].lozinka
    let storedSalt = user[0].salt
    let typedHash = crypto.pbkdf2Sync(req.body.password, storedSalt, 1000, 64, 'sha512').toString('hex')

    if (storedHash == typedHash) {
      res.render('ba-login.ejs', { ba: req.body.ba, message: "Uspješna prijava!" })
    } else if (req.body.ba == 'vulnerability-disabled') {
      res.render('ba-login.ejs', { ba: req.body.ba, message: "Krivi email ili lozinka!" })
    } else {
      res.render('ba-login.ejs', { ba: req.body.ba, message: "Kriva lozinka za navedeni email!" })
    }
  } else {
    console.log(req.body.ba)
    if (req.body.ba == 'vulnerability-disabled') {
      res.render('ba-login.ejs', { ba: req.body.ba, message: "Krivi email ili lozinka!" })
    } else {
      res.render('ba-login.ejs', { ba: req.body.ba, message: "Korisnik s navedenim emailom ne postoji!" })
    }
  }
  
});

app.listen(port, () => {
  console.log("Started on port: " + port);
});
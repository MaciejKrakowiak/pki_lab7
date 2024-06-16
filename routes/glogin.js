const { google } = require('googleapis');
const express = require('express')
const OAuth2Data = require('./google_key.json');
const router  = express.Router();
const { Client } = require("pg")
const dotenv = require("dotenv")
dotenv.config()


const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris;

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL)
var authed = false;

router.get('/', (req, res) => {
    if (!authed) {
        // Generate an OAuth URL and redirect there
        const url = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: 'https://www.googleapis.com/auth/userinfo.profile'
        });
        console.log(url)
        res.redirect(url);
    } else {
        var oauth2 = google.oauth2({auth: oAuth2Client, version: 'v2'})
        oauth2.userinfo.v2.me.get(function(err,result){
          if(err)
            {
              console.log('Niestety Blad!!')
              console.log(err)
            }
            else{
              loggedUser = result.data.name
              console.log(loggedUser)
               
              const connectDb = async () => {
                  try {
                      const client = new Client({
                          user: process.env.PGUSER,
                          host: process.env.PGHOST,
                          database: process.env.PGDATABASE,
                          password: process.env.PGPASSWORD,
                          port: process.env.PGPORT
                      })
               
                      await client.connect()
                      const r = await client.query('SELECT * FROM users where name=$1', loggedUser)
                      if(r.rows.length==0)
                        {
                            const now = new Date();
                            await client.query('INSERT INTO users (id, name, joined, lastvisit, counter) VALUES (null,$1,$2,$3,1)',loggedUser,now,now)
                        }
                      else if(r.rows.length>0)
                      {
                        await client.query('UPDATE users SET lastvisit=$1, counter = counter + 1 where id = $2 ',now,r.rows.at(0).id)
                      }
                      const r2 = await client.query('SELECT * FROM users')
                    //   const result = await client.query('SELECT * FROM users')
                    //   console.log(result)
                    //   await client.end()
                      
                  } catch (error) {
                      console.log(error)
                  }
                  connectDb()
              }
               
              
            }
            // res.send('Logged in:'.concat(loggedUser,'<img.src="',result.data.picture,'"height="23" width="23">','<br>','<a href = /glogin/logout>logout</a>','<br>','<a href = />home</a>'))
            res.render('user', { loggedUser, pictureUrl, users : r2.rows, success: true});
            // res.render("google",{user : result.rows})
        })
    }
})

router.get('/logout', (req, res) => {
    oAuth2Client.setCredentials(null);
    authed = false;
    res.redirect('/glogin');
})

router.get('/auth/google/callback', function (req, res) {
    const code = req.query.code
    if (code) {
        // Get an access token based on our OAuth code
        oAuth2Client.getToken(code, function (err, tokens) {
            if (err) {
                console.log('Error authenticating')
                console.log(err);
            } else {
                console.log('Successfully authenticated');
                oAuth2Client.setCredentials(tokens);
                authed = true;
                res.redirect('/glogin')
            }
        });
    }
});
module.exports = router
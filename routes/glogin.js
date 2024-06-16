const { google } = require('googleapis');
const express = require('express');
const OAuth2Data = require('./google_key.json');
const router = express.Router();
const { Client } = require("pg");
const dotenv = require("dotenv");
dotenv.config();

const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris[0];

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);
let authed = false;

router.get('/', async (req, res) => {
    try {
        if (!authed) {
            const url = oAuth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: 'https://www.googleapis.com/auth/userinfo.profile'
            });
            res.redirect(url);
        } else {
            const oauth2 = google.oauth2({ auth: oAuth2Client, version: 'v2' });
            oauth2.userinfo.v2.me.get(async (err, result) => {
                if (err) {
                    console.error('Error retrieving user info:', err);
                    res.status(500).send('Error retrieving user info');
                    return;
                }

                const loggedUser = result.data.name;
                const pictureUrl = result.data.picture;

                const client = new Client({
                    user: process.env.PGUSER,
                    host: process.env.PGHOST,
                    database: process.env.PGDATABASE,
                    password: process.env.PGPASSWORD,
                    port: process.env.PGPORT,
                    ssl: { rejectUnauthorized: false }
                });

                try {
                    await client.connect();
                    const now = new Date().toISOString();

                    const userQuery = await client.query('SELECT * FROM users WHERE name = $1', [loggedUser]);
                    if (userQuery.rows.length === 0) {
                        await client.query('INSERT INTO users (name, joined, lastvisit, counter) VALUES ($1, $2, $3, 1)', [loggedUser, now, now]);
                    } else {
                        await client.query('UPDATE users SET lastvisit = $1, counter = counter + 1 WHERE name = $2', [now, loggedUser]);
                    }

                    const r2 = await client.query('SELECT * FROM users');
                    const users = r2.rows;

                    await client.end();

                    connectDb()

                    res.render('google', { loggedUser, pictureUrl, users });
                } catch (error) {
                    console.error('Database error:', error);
                    res.status(500).send('Database error');
                }
            });
        }
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).send('Server error');
    }
});

router.get('/logout', (req, res) => {
    oAuth2Client.setCredentials(null);
    authed = false;
    res.redirect('/glogin');
});

router.get('/auth/google/callback', (req, res) => {
    const code = req.query.code;
    if (code) {
        oAuth2Client.getToken(code, (err, tokens) => {
            if (err) {
                console.error('Error authenticating:', err);
                res.status(500).send('Error authenticating');
            } else {
                console.log('Successfully authenticated');
                oAuth2Client.setCredentials(tokens);
                authed = true;
                res.redirect('/glogin');
            }
        });
    }
});

module.exports = router;

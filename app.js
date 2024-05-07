const { google } = require('googleapis');
const express = require('express');
const OAuth2Data = require('./google_key.json');

const app = express();

const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris[0];

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);
var authed = false;

app.set('view engine', 'ejs');
var access_token = "";

const axios = require('axios')


const GITHUB_CLIENT_ID = 'Ov23ligvIsDIXrZbv2Jl';
const GITHUB_CLIENT_SECRET = '49ea434bd71dfcb02cec39cb4b8e17f6497f1b10';


app.get('/', (req, res) => {
    if (!authed) {
        res.send('<a href="/login">Login with Google</a><a href="/loginGithub">Login with Github</a>');
    } else {
        var oauth2 = google.oauth2({ auth: oAuth2Client, version: 'v2' });
        oauth2.userinfo.v2.me.get(function (err, result) {
            if (err) {
                console.log('Niestety bład!');
                console.log(err);
            } else {
                loggedUser = result.data.name;
                console.log(loggedUser);
            }
            res.send('Logged in: '.concat(loggedUser, '<img src="', result.data.picture, '"height="23" width="23"> <br><a href="/logout">Logout</a>'));
        });
    }
});

app.get('/login', (req, res) => {
    const url = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: 'https://www.googleapis.com/auth/userinfo.profile'
    });
    res.redirect(url);
});

app.get('/auth/google/callback', function (req, res) {
    const code = req.query.code;
    if (code) {
        oAuth2Client.getToken(code, function (err, tokens) {
            if (err) {
                console.log('Error authenticating');
                console.log(err);
            } else {
                console.log('Successfully authenticated');
                oAuth2Client.setCredentials(tokens);
                authed = true;
                res.redirect('/');
            }
        });
    }
});

app.get('/logout', (req, res) => {
    if (authed) {
        oAuth2Client.revokeCredentials(function(err, result) {
            if (err) {
                console.error('Error revoking credentials:', err);
            } else {
                console.log('Credentials successfully revoked');
            }
            authed = false;
            res.redirect('/');
        });
    } else {
        res.redirect('/');
    }
});

app.get('/loginGithub', (req, res) => {
    res.redirect(`https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&prompt=consent`);
});


app.get('/github/callback', (req, res) => {
    const requestToken = req.query.code;

    axios({
        method: 'post',
        url: `https://github.com/login/oauth/access_token?client_id=${GITHUB_CLIENT_ID}&client_secret=${GITHUB_CLIENT_SECRET}&code=${requestToken}`,
        headers: {
            accept: 'application/json'
        }
    }).then((response) => {
        const accessToken = response.data.access_token;
        return axios.get('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
    }).then((userDataResponse) => {
        const userData = userDataResponse.data;
        const htmlContent = `
            <strong>Name</strong>: ${userData.name}<br>
            <strong>Username</strong>: ${userData.login}<br>
            <strong>Company</strong>: ${userData.company}<br>
            <strong>Bio</strong>: ${userData.bio}<br>
            <button onclick="window.location.href='/logoutGithub'">Logout</button>
        `;
        res.send(htmlContent);
    }).catch((error) => {
        console.error('Error during GitHub authentication:', error);
        res.redirect('/');
    });
});

 app.get("/logoutGithub", function (req, res) {
     access_token = ""
     res.redirect('/');
   })



const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running at ${port}`));

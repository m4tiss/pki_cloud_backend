const { google } = require('googleapis');
const express = require('express');
const OAuth2Data = require('./google_key.json');
const { Client } = require("pg")
const axios = require('axios')
const dotenv = require("dotenv")

const app = express();

const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris[0];

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);
var authed = false;

app.set('view engine', 'ejs');
var access_token = "";


dotenv.config()


const client = new Client({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: 5432,
    ssl: true
});
 
const connectDb = async () => {
    try {
        await client.connect();
        console.log('Połączenie z bazą danych ustanowione.');
    } catch (error) {
        console.error('Błąd połączenia z bazą danych:', error);
    }
};


connectDb()
 


const GITHUB_CLIENT_ID = 'Ov23ligvIsDIXrZbv2Jl';
const GITHUB_CLIENT_SECRET = '49ea434bd71dfcb02cec39cb4b8e17f6497f1b10';


const getUsers = (callback) => {
    client.query('SELECT * FROM Users', (error, res) => {
        if (error) {
            callback(error, null);
        } else {
            callback(null, res.rows);
        }
    });
};

const findUserByName = (name, callback) => {
    client.query('SELECT * FROM Users WHERE name = $1', [name], (error, result) => {
        if (error) {
            console.error('Błąd podczas wyszukiwania użytkownika w bazie danych:', error);
            callback(error, null);
        } else {
            callback(null, result.rows);
        }
    });
};

const updateUser = async (userInfo) => {
    try {
        findUserByName(userInfo.name, async (error, existingUser) => {
            if (error) {
                console.error('Błąd podczas wyszukiwania użytkownika:', error);
                return;
            }

            if (existingUser.length === 0) {
                const currentTime = new Date().toISOString();
                await client.query(
                    'INSERT INTO Users (name, joined, lastvisit, counter) VALUES ($1, $2, $3, $4)',
                    [userInfo.name, currentTime, currentTime, 1]
                );
                console.log('Nowy użytkownik został dodany do tabeli.');
            } else {
                const currentTime = new Date().toISOString();
                await client.query(
                    'UPDATE Users SET lastvisit = $1, counter = counter + 1 WHERE name = $2',
                    [currentTime, userInfo.name]
                );
                console.log('Dane istniejącego użytkownika zostały zaktualizowane.');
            }
        });
    } catch (error) {
        console.error('Błąd podczas aktualizacji użytkownika:', error);
    }
};



app.get('/', (req, res) => {
    getUsers((error, users) => {
        if (error) {
            console.error('Błąd podczas pobierania danych:', error);
            res.status(500).send('Wystąpił błąd podczas pobierania danych użytkowników.');
        } else {
            if (!authed) {
                res.send(`<a href="/login">Login with Google</a><a href="/loginGithub">Login with Github</a>`);
            } else {
                var oauth2 = google.oauth2({ auth: oAuth2Client, version: 'v2' });
                oauth2.userinfo.v2.me.get(function (err, result) {
                    if (err) {
                        console.log('Niestety bład!');
                        console.log(err);
                        res.status(500).send('Wystąpił błąd podczas pobierania danych użytkownika.');
                    } else {
                        loggedUser = result.data.id;
                        console.log(loggedUser);

                        let response = `Logged in: ${loggedUser.name} <img src="${result.data.picture}" height="23" width="23"> <br><a href="/logout">Logout</a><br><br>`;

                        response += '<h2>Users:</h2>';
                        users.forEach(user => {
                            response += `ID: ${user.id}, Name: ${user.name}, Joined: ${user.joined}, Last Visit: ${user.lastvisit}, Counter: ${user.counter}<br>`;
                        });

                        res.send(response);
                    }
                });
            }
        }
    });
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

                var oauth2 = google.oauth2({ auth: oAuth2Client, version: 'v2' });
                oauth2.userinfo.v2.me.get(function (err, result) {
                    if (err) {
                        console.log('Niestety bład!');
                        console.log(err);
                    } else {
                        loggedUser = result.data;
                        console.log(loggedUser);
                        updateUser(loggedUser);
                    }});
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
        updateUser(userData);

        let htmlContent = `
            <strong>Name</strong>: ${userData.name}<br>
            <strong>Username</strong>: ${userData.login}<br>
            <strong>Company</strong>: ${userData.company}<br>
            <strong>Bio</strong>: ${userData.bio}<br>
            <button onclick="window.location.href='/logoutGithub'">Logout</button>
        `;

        getUsers((error, users) => {
            if (error) {
                console.error('Błąd podczas pobierania danych:', error);
                res.status(500).send('Wystąpił błąd podczas pobierania danych użytkowników.');
            } else {
                htmlContent += '<h2>Users:</h2>';
                users.forEach(user => {
                    htmlContent += `ID: ${user.id}, Name: ${user.name}, Joined: ${user.joined}, Last Visit: ${user.lastvisit}, Counter: ${user.counter}<br>`;
                });
                res.send(htmlContent);
            }
        });
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

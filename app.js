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
                res.send(`<a href="/login">Login with Google</a><br/><a href="/loginGithub">Login with Github</a>`);
            } else {
                var oauth2 = google.oauth2({ auth: oAuth2Client, version: 'v2' });
                oauth2.userinfo.v2.me.get(function (err, result) {
                    if (err) {
                        console.log('Niestety bład!');
                        console.log(err);
                        res.status(500).send('Wystąpił błąd podczas pobierania danych użytkownika.');
                    } else {
                        loggedUser = result.data;
                        console.log(loggedUser);

                        let response = `
                        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
                        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"></script>
                        <nav class="navbar navbar-expand-lg navbar-light bg-light">
                    <div class="container-fluid">
                        <a class="navbar-brand"> Logged in: ${loggedUser.name} <img src="${result.data.picture}" height="23" width="23">
                        <a href="/logout">Logout</a>
                        </div>
                    </div>
                    </nav>`;

                    response += `
                    <div class="container">
                      <h2>Users:</h2>
                      <div class="row">
                        <div class="col">
                          <table class="table table-striped table-hover table-primary">
                            <thead>
                              <tr>
                                <th scope="col">ID</th>
                                <th scope="col">Name</th>
                                <th scope="col">Joined</th>
                                <th scope="col">Last Visit</th>
                                <th scope="col">Counter</th>
                              </tr>
                            </thead>
                            <tbody>
                    `;
                    
                    users.forEach(user => {
                        response += `
                              <tr>
                                <td>${user.id}</td>
                                <td>${user.name}</td>
                                <td>${user.joined}</td>
                                <td>${user.lastvisit}</td>
                                <td>${user.counter}</td>
                              </tr>
                    `;
                    });
                    
                    response += `
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                    
                    <div class="modal fade" id="successModal" aria-labelledby="successModalLabel" aria-modal="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="successModalLabel">Success</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                Połączenie z bazą danych zostało ustanowione.
                            </div>
                        </div>
                    </div>
                </div>
                
                <script>
                    window.onload = function() {
                        var myModal = new bootstrap.Modal(document.getElementById('successModal'));
                        myModal.show();
                    };
                </script>

                    `;
                    

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
                console.log('Autentykacja nieudana');
                console.log(err);
            } else {
                console.log('Autentykacja udana');
                oAuth2Client.setCredentials(tokens);
                authed = true;

                var oauth2 = google.oauth2({ auth: oAuth2Client, version: 'v2' });
                oauth2.userinfo.v2.me.get(function (err, result) {
                    if (err) {
                        console.log(err);
                    } else {
                        loggedUser = result.data;
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
                console.error('Bład usuwania referncji:', err);
            } else {
                console.log('Usuwania referncji pomyślne');
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
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
         <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"></script>

            <nav class="navbar navbar-expand-lg navbar-light bg-light">
            <div class="container-fluid">
                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav">
                        <li class="nav-item">
                            <a class="nav-link active" aria-current="page"><strong>Name</strong>: ${userData.name}</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link"><strong>Username</strong>: ${userData.login}</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link"><strong>Company</strong>: ${userData.company}</a>
                        </li>
                        <li class="nav-item">
                        <a class="nav-link"> <strong>Bio</strong>: ${userData.bio}</a>
                    </li>
                    </ul>
                    <button type="button" class="btn btn-outline-dark" onclick="window.location.href='/logoutGithub'">Logout</button>
                </div>
            </div>
        </nav>`;

        getUsers((error, users) => {
            if (error) {
                console.error('Błąd podczas pobierania danych:', error);
                res.status(500).send('Wystąpił błąd podczas pobierania danych użytkowników.');
            } else {
                htmlContent += `
                    <div class="container">
                      <h2>Users:</h2>
                      <div class="row">
                        <div class="col">
                          <table class="table table-striped table-hover table-primary">
                            <thead>
                              <tr>
                                <th scope="col">ID</th>
                                <th scope="col">Name</th>
                                <th scope="col">Joined</th>
                                <th scope="col">Last Visit</th>
                                <th scope="col">Counter</th>
                              </tr>
                            </thead>
                            <tbody>
                    `;
                    
                    users.forEach(user => {
                        htmlContent += `
                              <tr>
                                <td>${user.id}</td>
                                <td>${user.name}</td>
                                <td>${user.joined}</td>
                                <td>${user.lastvisit}</td>
                                <td>${user.counter}</td>
                              </tr>
                    `;
                    });
                    
                    htmlContent += `
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>               
                        <div class="modal fade" id="successModal" aria-labelledby="successModalLabel" aria-modal="true">
                        <div class="modal-dialog">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title" id="successModalLabel">Success</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div class="modal-body">
                                    Połączenie z bazą danych zostało ustanowione.
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <script>
                        window.onload = function() {
                            var myModal = new bootstrap.Modal(document.getElementById('successModal'));
                            myModal.show();
                        };
                    </script>
                  </div>
                    `;
                res.send(htmlContent);
            }
        });
    }).catch((error) => {
        console.error('Blad autentykacji github:', error);
        res.redirect('/');
    });
});

 app.get("/logoutGithub", function (req, res) {
     access_token = ""
     res.redirect('/');
   })



const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Serwer dziala na porcie ${port}`));

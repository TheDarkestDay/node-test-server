const uuidV1 = require('uuid/v1');
const fs = require('fs');
const dbData = JSON.parse(fs.readFileSync('db.json', 'utf8'));
const users = dbData.users;

const sessionTokenName = 'session-token';

var authorizedUsers = {};

function isValidUser(login, password) {
    var isValid = false;
    users.forEach(function(user) {
        if(user.login === login && user.password === password) {
            isValid = true;
        }
    });
    return isValid;
}

function checkLoginAuth(login, sessionToken) {
    const token = authorizedUsers[login];

    return !!token && token === sessionToken;
}

function checkTokenAuth(sessionToken){
    for(i in authorizedUsers){
        if(authorizedUsers.hasOwnProperty(i)) {
            var token = authorizedUsers[i];

            if(token === sessionToken) {
                return true;
            }
        }
    }
    return false;
}

function login(req, res, next) {
    const login = req.body.login;
    const password = req.body.password;
    const sessionToken = req.headers[sessionTokenName];

    if (checkLoginAuth(login, sessionToken)) {
        res.sendStatus(200);
        return;
    }

    if(!isValidUser(login, password)) {
        res.status(400).json({
            message: 'Wrong login or password'
        });
        return;
    }

    const newSessionToken = uuidV1();
    authorizedUsers[login] = newSessionToken;

    res.set(sessionTokenName, newSessionToken);
    res.status(200).json({token: newSessionToken});
}

function logout(req, res, next) {
    const login = req.body.login;
    const sessionToken = req.headers[sessionTokenName];

    if (!checkLoginAuth(login, sessionToken)) {
        res.sendStatus(400);
        return;
    }

    delete authorizedUsers[login];
    res.sendStatus(200);
}

function isAuthorized(req, res, next) {
    const sessionToken = req.headers[sessionTokenName];

    if (sessionToken && checkTokenAuth(sessionToken)) {
        next();
    } else {
        res.status(401).json({
            message: 'Access denied'
        });
    }
}

function whoAmI(req, res, next) {
    const sessionToken = req.headers[sessionTokenName];
    const login = Object.keys(authorizedUsers).find((name) => authorizedUsers[name] === sessionToken);

    const userInfo = {
        ...dbData.users.find((user) => user.login === login)
    };
    userInfo.role = dbData.roles.find((role) => role.id === userInfo.roleId);

    delete userInfo.password;

    res.status(200).json(userInfo);
}

module.exports = {
    login: login,
    logout: logout,
    isAuthorized: isAuthorized,
    whoAmI: whoAmI,
};
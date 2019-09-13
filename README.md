# GOAL
The goal of this middleware is to limit requests count on an API for users by applying couldown on recurrent requests.
The users are identified by their remote address.

# INSTALL

COMMING SOON (NPM)

# IMPORT AND FUNCTIONS
`const expressIpAttempts = require('express-ip-attempts')`

Accessible functions :

Proto | Description
--- | ---
config(\<Object> config) | Override default module config
protectGlobal(\<Object> request, \<Object> res, \<Function> next) | Apply the limit for whole app
protectOne(\<Object> request, \<Object> res, \<Object> config) | Apply the limit for one route
purge() | Purge the request counter object
autoPurge(\<Number> period) | Enable automatic purge at interval
stopAutoPurge() | Shut down auto purge

### config()
The module has a default config, this function help you to override it.

Usage : 

```
const express = require('express');
const expressIpAttempts = require('../index');
const app = express();

expressIpAttempts.config({
    maxRequests: 5,
    timeBetweenRequests: 3000,
    couldown: 15000,
});
```

- maxRequests defines the amount of consecutive request authorised before couldown.
- timeBetweenRequests(ms) defines the maximum time between two request to be considered as consecutive.
- couldown(ms) defines the couldown time to apply when `maxRequests` is reached.

The call to `expressIpAttempts.config` is not mandatory, the default settings are : 
```
{
    maxRequests: 5,
    timeBetweenRequests: 3000,
    couldown: 15000,
}
```

### protectGlobal()
Called as a classic express middleware, every route declared after `expressIpAttempts.protectGlobal`
is securised by it. If the amount of request has been reached, the request is skipped with a 403 status.

Usage :
```
const express = require('express');
const expressIpAttempts = require('../index');
const app = express();

expressIpAttempts.config({
    maxRequests: 10,
    timeBetweenRequests: 3000,
    couldown: 15000,
});

app.use(expressIpAttempts.protectGlobal);

app.get('/login', (req, res) => res.status(200).send('LOGIN'));
app.get('/hello', (req, res) => res.status(200).send('HELLO'));
app.get('/world', (req, res) => res.status(200).send('WORLD'));
app.listen(3051, () => console.log(`Server is listening on port 3051`));

```

In this case the routes `/login, /hello and /world` are under control.

```
const express = require('express');
const expressIpAttempts = require('../index');
const app = express();

expressIpAttempts.config({
    maxRequests: 10,
    timeBetweenRequests: 3000,
    couldown: 15000,
});

app.get('/login', (req, res) => res.status(200).send('LOGIN'));
app.get('/hello', (req, res) => res.status(200).send('HELLO'));

app.use(expressIpAttempts.protectGlobal);

app.get('/world', (req, res) => res.status(200).send('WORLD'));
app.listen(3051, () => console.log(`Server is listening on port 3051`));

```

In this case only the route `/world` is under control.

The settings used by `expressIpAttempts.protectGlobal` are theses defined with a `expressIpAttempts.config` call. If the where not defined, the default settings are used.

### protectOne
This function has the same role as `expressIpAttempts.protectGlobal` but is used to secure only one route.

Usage :
```
const express = require('express');
const expressIpAttempts = require('../index');
const app = express();

app.get('/login',
    (req, res) => expressIpAttempts
        .protectOne(req, res, {
            maxRequests: 5,
            timeBetweenRequests: 3000,
            couldown: 15000,
        })
        .with((req, res) => res.status(200).send('LOGIN'))
);
app.get('/hello', (req, res) => res.status(200).send('HELLO'));
app.get('/world', (req, res) => res.status(200).send('WORLD'));
app.listen(3051, () => console.log(`Server is listening on port 3000`));

```
In this case only the route `/login` is under control.

Note that the function `expressIpAttempts.protectOne` return an object containing a function 
named `with`. The function passed to `with` is called if the request max is not reached, 
otherwise the request is skipped with a 403 status.

Here is the order used for the settings used by `expressIpAttempts.protectOne` :
- Theses defined as third parameters of the call
- The defined in a `expressIpAttempts.config` call
- If none is defined, the defaults are used

The `expressIpAttempts.protectOne` function can also be used to control multiple routes.
The attempts can be counted on the same "channel" or not.

If they are counted on different channel, attempts on a route have no impact on other routes. In the other case, the counts are added each other.

Defining a different channel is made by adding a key named "key" in the config passed to the function.

Example with same channel : 

```
const express = require('express');
const expressIpAttempts = require('../index');
const app = express();

app.get('/login',
    (req, res) => expressIpAttempts
        .protectOne(req, res, {
            maxRequests: 5,
            timeBetweenRequests: 3000,
            couldown: 15000,
        })
        .with((req, res) => res.status(200).send('LOGIN'))
);

app.get('/hello',
    (req, res) => expressIpAttempts
        .protectOne(req, res, {
            maxRequests: 10,
            timeBetweenRequests: 3000,
            couldown: 30000,
        })
        .with((req, res) => res.status(200).send('HELLO'))
);
app.get('/world', (req, res) => res.status(200).send('WORLD'));
app.listen(3051, () => console.log(`Server is listening on port 3000`));

```

In this case, making 5 attempts on route `/login` will block the two route (they are on the same channel). But making 8 attempts on the `/hello` route will block no route.
The couldown applied in this cas is this from the last call having blocked the channel.

Example with multiple channels : 

```
const express = require('express');
const expressIpAttempts = require('../index');
const app = express();

app.get('/login',
    (req, res) => expressIpAttempts
        .protectOne(req, res, {
            maxRequests: 5,
            timeBetweenRequests: 3000,
            couldown: 15000,
            key: 'routeLogin',
        })
        .with((req, res) => res.status(200).send('LOGIN'))
);

app.get('/hello',
    (req, res) => expressIpAttempts
        .protectOne(req, res, {
            maxRequests: 10,
            timeBetweenRequests: 3000,
            couldown: 30000,
            key: 'routeHello',
        })
        .with((req, res) => res.status(200).send('HELLO'))
);
app.get('/world', (req, res) => res.status(200).send('WORLD'));
app.listen(3051, () => console.log(`Server is listening on port 3000`));

```

In this cas, the route are independents and can bee blocked separately.

### purge
The module need to store the channels, they are growing up with time and taking useless space.
Indeed, when a user is no more using the API, the information about it's last attempts are no more useful but still stored (the module can not know itself if the user is still using the API).

When calling this function, the module will remove all useless data. It only removes the data when the module is sure not to interfere with current sessions.

```
expressIpAttempts.purge();
```

### autoPurge
This function will periodically clean the module (calling the purge function).

You can pass a number in milliseconds defining the period, if none is passed, the period used is : `10 * defaultConfig.couldown`.

```
expressIpAttempts.autoPurge();
//OR
expressIpAttempts.autoPurge(60000);
```

### stopAutoPurge
Simply stop the autoPurge cycle.

```
expressIpAttempts.stopAutoPurge();
```

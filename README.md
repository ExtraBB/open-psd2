# Open PSD2

This is a library for using open banking api's of various banks. These API's are built for PSD2 regulation but they are not compatible with each other. Therefore I've started this package. Feel free to submit PR's and help build up this package!

## Contributing
This package is still a **Work in Progress**! All contributors are welcome. Feel free to submit a PR or send me a message on Github if you have any questions.

## Installation

Run the following:

```
npm install
```

## Usage

Import the banking API that you need like this: 

```javascript
import { ING } from "open-psd2";
```

Create a new instance of it using your certificates:

```javascript
const ing = new ING(true, fs.readFileSync("./secrets/example_client_signing.key"), "changeit", fs.readFileSync("./secrets/example_client_tls.cer"), fs.readFileSync("./secrets/example_client_tls.key"), "example_client_id");
```

Then you can start using the built in functions to request data. For the ING API it is necessary to request both an access token and then a customer access token. Note that in this example we are using the sandbox and therefore do not require a user authorization code: 

```javascript
app.get('/accounts', function (req, res) {
    ing.requestAccessToken("view_balance").then(access_token => {
        ing.requestCustomerAccessToken(null, access_token).then((customer_access_token) => {
            ing.requestAccounts(customer_access_token).then(accounts => {
                res.send(accounts);
            }).catch((error) => { res.send("Could not retrieve accounts"); console.log(error); });
        }).catch((error) => { res.send("Could not retrieve customer access token"); console.log(error); });
    }).catch((error) => { res.send("Could not retrieve access token"); console.log(error); });
});
```

## Roadmap
For future development I plan the following. First build up a few more Bank API's besides the ING api. Afterwards, see if we can create one unifying API that rules them all and in the darkness binds them. 

## Licence
GNU General Public License v3.0 - Copyright (C) 2018  Bruno dos Santos Carvalhal (See `LICENSE.md`)
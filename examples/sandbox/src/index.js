import { ING } from "open-psd2";

const fs = require("fs");
const express = require('express');
const app = express();

// Sandbox
const bank = new ING(true, fs.readFileSync("./secrets/example_client_signing.key"), "changeit", fs.readFileSync("./secrets/example_client_tls.cer"), fs.readFileSync("./secrets/example_client_tls.key"), "example_client_id");

app.get('/', function (req, res) {
    res.send(`
    <h1>Available Urls</h1>
    <ul>
        <li><a href="/greetings">Greetings (non-sandbox)</a></li>
        <li><a href="/accounts">Accounts (sandbox)</a></li>
        <li><a href="/authorization-url">Authorization-url (sandbox)</a></li>
    </ul>
    `)
});

app.get('/greetings', function (req, res) {
    bank.requestAccessToken("greetings:view").then(access_token => {
        bank.requestShowcase(access_token).then((greetings) => {
            res.send(greetings);
        }).catch((error) => { res.send("Could not retrieve greetings"); console.log(error); });
    }).catch((error) => { res.sendlog("Could not retrieve access token"); console.log(error); });
});

app.get('/accounts', function (req, res) {
    bank.requestAccessToken("view_balance").then(access_token => {
        bank.requestCustomerAccessToken(null, access_token).then((customer_access_token) => {
            bank.requestAccounts(customer_access_token).then(accounts => {
                let html = "<h1>Accounts</h1><ul>"
                accounts.forEach(account => {
                    html += `
                    <li>
                        ${account.name} (${account.iban}) 
                        <a href="/accounts/${account.accountId}/balances">Balances</a>
                        <a href="/accounts/${account.accountId}/transactions">Transactions</a>
                    </li>`
                })
                html += "</ul>";
                res.send(html);
            }).catch((error) => { res.send("Could not retrieve accounts"); console.log(error); });
        }).catch((error) => { res.send("Could not retrieve customer access token"); console.log(error); });
    }).catch((error) => { res.send("Could not retrieve access token"); console.log(error); });
});

app.get('/accounts/:accountId/balances', function (req, res) {
    bank.requestAccessToken("view_balance").then(access_token => {
        bank.requestCustomerAccessToken(null, access_token).then((customer_access_token) => {
            bank.requestBalances(customer_access_token, req.params.accountId).then(data => {
                res.send(data);
            }).catch((error) => { res.send("Could not retrieve balances"); console.log(error); });
        }).catch((error) => { res.send("Could not retrieve customer access token"); console.log(error); });
    }).catch((error) => { res.send("Could not retrieve access token"); console.log(error); });
});

app.get('/accounts/:accountId/transactions', function (req, res) {
    bank.requestAccessToken("view_balance").then(access_token => {
        bank.requestCustomerAccessToken(null, access_token).then((customer_access_token) => {
            bank.requestTransactions(customer_access_token, req.params.accountId).then(data => {
                res.send(data);
            }).catch((error) => { res.send("Could not retrieve transactions"); console.log(error); });
        }).catch((error) => { res.send("Could not retrieve customer access token"); console.log(error); });
    }).catch((error) => { res.send("Could not retrieve access token"); console.log(error); });
});

app.get('/authorization-url', function (req, res) {
    bank.requestAccessToken("view_balance").then(access_token => {
        bank.requestAuthorizationUrl("view_balance", "nl", access_token).then(url => {
            res.send(url);
        }).catch((error) => { res.send("Could not retrieve authorization url"); console.log(error); });
    }).catch((error) => { res.send("Could not retrieve access token"); console.log(error); });
});

/**
 * Start Express server.
 */
app.listen(1337, () => {
    console.log("The server is running at: localhost:1337");
});

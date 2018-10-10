const https = require('https');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const qs = require('qs');

import { guid } from "./utils";

// Constants
let SANDBOX, apiBasePath, signingKey, signingPassphrase, tlsCert, tlsKey, clientId, agent;

export default class ING {

    constructor(useSandbox, _signingKey, _signingPassphrase, _tlsCertificate, _tlsKey, _clientId) {
        SANDBOX = useSandbox;
        apiBasePath = useSandbox ? "https://api.sandbox.ing.com" : "https://api.ing.com";
        signingKey = _signingKey;
        signingPassphrase = _signingPassphrase;
        tlsCert = _tlsCertificate;
        tlsKey = _tlsKey;
        clientId = _clientId;

        // Create HTTPS agent
        agent = new https.Agent({
            rejectUnauthorized: false,
            cert: tlsCert,
            key: tlsKey
        });
    }

    async requestShowcase(access_token) {
        return await this.requestAPI("get", "/greetings/single", access_token);
    }

    async requestAuthorizationUrl(scope, countryCode, accessToken) {
        const urlParams = qs.stringify({
            scope,
            "country_code": countryCode
        });
        const result = await this.requestAPI("get", `/oauth2/authorization-server-url?${urlParams}`, accessToken);
        return result.location;
    }

    async requestCustomerAccessToken(authorizationCode, accessToken) {
        if (SANDBOX) {
            authorizationCode = "694d6ca9-1310-4d83-8dbb-e819c1ee6b80";
        }

        const bodyData = {
            "grant_type": "authorization_code",
            "code": authorizationCode,
            "redirect_uri": "xxx"
        }

        const result = await this.requestAPI("post", "/oauth2/token", accessToken, bodyData);
        return result.access_token;
    }

    async requestAccounts(customerAccessToken) {
        const result = await this.requestAPI("get", "/v1/accounts", customerAccessToken);
        return result.accounts;
    }

    async requestBalances(customerAccessToken, accountId) {
        const result = await this.requestAPI("get", "/v1/accounts/" + accountId + "/balances", customerAccessToken);
        return result.accounts;
    }

    async requestTransactions(customerAccessToken, accountId) {
        const result = await this.requestAPI("get", "/v1/accounts/" + accountId + "/transactions", customerAccessToken);
        return result.accounts;
    }

    async requestAPI(httpMethod, reqPath, access_token, bodyData = {}) {

        // URL encode body
        const body = qs.stringify(bodyData);

        // Create parameters
        const digest = crypto.createHash('sha256').update(body).digest('base64');
        const reqId = guid();
        const dateString = new Date().toUTCString();

        // Create signature
        const signature = this.generateSignature(httpMethod, reqPath, dateString, digest, reqId);

        // Create options
        const options = {
            method: httpMethod,
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Signature': `keyId="${clientId}",algorithm="rsa-sha256",headers="(request-target) date digest x-ing-reqid",signature="${signature}"`,
                'X-ING-ReqID': reqId,
                'Date': dateString,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Digest': `SHA-256=${digest}`
            },
            data: body,
            url: apiBasePath + reqPath,
            httpsAgent: agent
        };

        // Return result
        const result = await axios(options);
        return result.data;
    }

    // Request Access Token
    async requestAccessToken(scope) {
        const bodyData = {
            grant_type: 'client_credentials',
            scope
        }

        // URL encode body
        let body = qs.stringify(bodyData);
        if (SANDBOX) {
            body = 'grant_type=client_credentials&scope=create_order+granting+payment-requests+payment-requests%3Aview+payment-requests%3Acreate+payment-requests%3Aclose+virtual-ledger-accounts%3Afund-reservation%3Acreate+virtual-ledger-accounts%3Afund-reservation%3Adelete+virtual-ledger-accounts%3Abalance%3Aview';
        }

        // Create parameters
        const digest = crypto.createHash('sha256').update(body).digest('base64');
        const reqId = guid();
        const dateString = new Date().toUTCString();

        // Create signature
        const signature = this.generateSignature('post', "/oauth2/token", dateString, digest, reqId);

        // Create options
        let options = {
            method: 'post',
            headers: {
                'Authorization': `Signature keyId="${clientId}",algorithm="rsa-sha256",headers="(request-target) date digest x-ing-reqid",signature="${signature}"`,
                'X-ING-ReqID': reqId,
                'Date': dateString,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Digest': `SHA-256=${digest}`
            },
            data: body,
            url: apiBasePath + "/oauth2/token",
            httpsAgent: agent
        };

        // SANDBOX API is a bit different :?
        if (SANDBOX) {
            options = {
                method: 'post',
                headers: {
                    'Signature': `keyId="${clientId}",algorithm="rsa-sha256",headers="(request-target) date digest x-ing-reqid",signature="${signature}"`,
                    'X-ING-ReqID': reqId,
                    'Date': dateString,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Digest': `SHA-256=${digest}`
                },
                data: body,
                url: apiBasePath + "/oauth2/token",
                httpsAgent: agent
            };
        }

        // Return result
        const result = await axios(options);
        return result.data.access_token;
    }

    generateSignature(httpMethod, reqPath, dateString, digest, reqId) {
        const signingString = `(request-target): ${httpMethod} ${reqPath}\ndate: ${dateString}\ndigest: SHA-256=${digest}\nx-ing-reqid: ${reqId}`;

        const hash = crypto.createSign('SHA256');
        hash.update(signingString);
        return hash.sign({ key: signingKey, passphrase: signingPassphrase }, "base64");
    }
}
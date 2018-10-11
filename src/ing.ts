const https = require('https');
const axios = require('axios');
const crypto = require('crypto');
const qs = require('qs');

import { guid } from "./utils";

export default class ING {

    // Member variables
    SANDBOX: boolean;
    apiBasePath: string;
    signingKey: string;
    signingPassphrase: string;
    tlsCert: string;
    tlsKey: string;
    clientId: string;
    agent: any;


    constructor(useSandbox: boolean, _signingKey: string, _signingPassphrase: string, _tlsCertificate: string, _tlsKey: string, _clientId: string) {
        this.SANDBOX = useSandbox;
        this.apiBasePath = useSandbox ? "https://api.sandbox.ing.com" : "https://api.ing.com";
        this.signingKey = _signingKey;
        this.signingPassphrase = _signingPassphrase;
        this.tlsCert = _tlsCertificate;
        this.tlsKey = _tlsKey;
        this.clientId = _clientId;

        // Create HTTPS agent
        this.agent = new https.Agent({
            rejectUnauthorized: false,
            cert: this.tlsCert,
            key: this.tlsKey
        });
    }

    async requestShowcase(access_token: string) {
        return await this.requestAPI("get", "/greetings/single", access_token);
    }

    async requestAuthorizationUrl(scope: string, countryCode: string, accessToken: string) {
        const urlParams = qs.stringify({
            scope,
            "country_code": countryCode
        });
        const result = await this.requestAPI("get", `/oauth2/authorization-server-url?${urlParams}`, accessToken);
        return result.location;
    }

    async requestCustomerAccessToken(authorizationCode: string, accessToken: string) {
        if (this.SANDBOX) {
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

    async requestAccounts(customerAccessToken: string) {
        const result = await this.requestAPI("get", "/v1/accounts", customerAccessToken);
        return result.accounts;
    }

    async requestBalances(customerAccessToken: string, accountId: string) {
        const result = await this.requestAPI("get", "/v1/accounts/" + accountId + "/balances", customerAccessToken);
        return result.accounts;
    }

    async requestTransactions(customerAccessToken: string, accountId: string) {
        const result = await this.requestAPI("get", "/v1/accounts/" + accountId + "/transactions", customerAccessToken);
        return result.accounts;
    }

    async requestAPI(httpMethod: string, reqPath: string, access_token: string, bodyData = {}) {
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
                'Signature': `keyId="${this.clientId}",algorithm="rsa-sha256",headers="(request-target) date digest x-ing-reqid",signature="${signature}"`,
                'X-ING-ReqID': reqId,
                'Date': dateString,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Digest': `SHA-256=${digest}`
            },
            data: body,
            url: this.apiBasePath + reqPath,
            httpsAgent: this.agent
        };

        // Return result
        const result = await axios(options);
        return result.data;
    }

    // Request Access Token
    async requestAccessToken(scope: string) {
        const bodyData = {
            grant_type: 'client_credentials',
            scope
        }

        // URL encode body
        let body = qs.stringify(bodyData);
        if (this.SANDBOX) {
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
                'Authorization': `Signature keyId="${this.clientId}",algorithm="rsa-sha256",headers="(request-target) date digest x-ing-reqid",signature="${signature}"`,
                'X-ING-ReqID': reqId,
                'Date': dateString,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Digest': `SHA-256=${digest}`
            },
            data: body,
            url: this.apiBasePath + "/oauth2/token",
            httpsAgent: this.agent
        };

        // SANDBOX API is a bit different :?
        if (this.SANDBOX) {
            options = {
                method: 'post',
                headers: {
                    'Signature': `keyId="${this.clientId}",algorithm="rsa-sha256",headers="(request-target) date digest x-ing-reqid",signature="${signature}"`,
                    'X-ING-ReqID': reqId,
                    'Date': dateString,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Digest': `SHA-256=${digest}`
                } as any,
                data: body,
                url: this.apiBasePath + "/oauth2/token",
                httpsAgent: this.agent
            };
        }

        // Return result
        const result = await axios(options);
        return result.data.access_token;
    }

    generateSignature(httpMethod: string, reqPath: string, dateString: string, digest: string, reqId: string) {
        const signingString = `(request-target): ${httpMethod} ${reqPath}\ndate: ${dateString}\ndigest: SHA-256=${digest}\nx-ing-reqid: ${reqId}`;

        const hash = crypto.createSign('SHA256');
        hash.update(signingString);
        return hash.sign({ key: this.signingKey, passphrase: this.signingPassphrase }, "base64");
    }
}
/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014-2015 Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import google from "./google/googleUtils.js"

const oauth = {

    oauthTokens: {},

    setToken: function (token, host) {

        if (!host) {
            this.google.access_token = token;
        } else {
            this.oauthTokens[host] = token;
        }

    },

    getToken: function (host) {

        let token;

        if (!host) {
            token = this.google.access_token;
        } else {
            for (let key in this.oauthTokens) {
                const regex = wildcardToRegExp(key);
                if (regex.test(host)) {
                    token = this.oauthTokens[key];
                    break;
                }
            }
        }

        return token;

    },

    removeToken: function (host) {

        if (!host) {
            delete oauth.google["access_token"];
        } else {
            delete this.oauthTokens[host];

        }
    },

    // Special object for google -- legacy support
    google: {
        setToken: function (token) {
            this.access_token = token;
        }
    }
};


/**
 * Creates a RegExp from the given string, converting asterisks to .* expressions,
 * and escaping all other characters.
 *
 * credit https://gist.github.com/donmccurdy/6d073ce2c6f3951312dfa45da14a420f
 */
function wildcardToRegExp(s) {
    return new RegExp('^' + s.split(/\*+/).map(regExpEscape).join('.*') + '$');
}

/**
 * RegExp-escapes all characters in the given string.
 *
 * credit https://gist.github.com/donmccurdy/6d073ce2c6f3951312dfa45da14a420f
 */
function regExpEscape(s) {
    return s.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

export default oauth;

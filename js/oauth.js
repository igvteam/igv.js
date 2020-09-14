// Support for oauth token based authorization
// This class supports explicit setting of an oauth token either globally or for specific hosts.
//
// The variable oauth.google.access_token, which becomes igv.oauth.google.access_token on ES5 conversion is
// supported for backward compatibility


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

var oauth = (function (oauth) {

    // Define singleton object for google oauth

    if (!oauth.google) {

        var OAUTHURL = 'https://accounts.google.com/o/oauth2/auth?';
        var VALIDURL = 'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=';
        var SCOPE = 'https://www.googleapis.com/auth/genomics';
        var CLIENTID = '661332306814-8nt29308rppg325bkq372vli8nm3na14.apps.googleusercontent.com';
        var REDIRECT = 'http://localhost/igv-web/emptyPage.html'
        var LOGOUT = 'http://accounts.google.com/Logout';
        var TYPE = 'token';
        var _url = OAUTHURL +
            "scope=https://www.googleapis.com/auth/genomics https://www.googleapis.com/auth/userinfo.profile&" +
            "state=%2Fprofile&" +
            "redirect_uri=http%3A%2F%2Flocalhost%2Figv-web%2FemptyPage.html&" +
            "response_type=token&" +
            "client_id=661332306814-8nt29308rppg325bkq372vli8nm3na14.apps.googleusercontent.com";

        var tokenType;
        var expiresIn;
        var user;
        var loggedIn = false;

        oauth.google = {

            login: function () {
                var win = window.open(_url, "windowname1", 'width=800, height=600');

                var pollTimer = window.setInterval(function () {
                    try {
                        console.log(win.document.URL);
                        if (win.document.URL.indexOf(REDIRECT) != -1) {
                            window.clearInterval(pollTimer);
                            var url = win.document.URL;
                            oauth.google.access_token = oauth.google.gup(url, 'access_token');
                            tokenType = oauth.google.gup(url, 'token_type');
                            expiresIn = oauth.google.gup(url, 'expires_in');
                            win.close();

                            oauth.google.validateToken(oauth.google.access_token);
                        }
                    } catch (e) {
                    }
                }, 500);
            },

            validateToken: function (token) {
                $.ajax({

                    url: VALIDURL + token,
                    data: null,
                    success: function (responseText) {
                        oauth.google.getUserInfo();
                        loggedIn = true;
                        //$('#loginText').hide();
                        //$('#logoutText').show();
                    },
                    dataType: "jsonp"
                });
            },

            getUserInfo: function () {
                $.ajax({
                    url: 'https://www.googleapis.com/oauth2/v1/userinfo?access_token=' + oauth.google.access_token,
                    data: null,
                    success: function (resp) {
                        user = resp;
                        console.log(user);
                        //$('#uName').text('Welcome ' + user.name);
                        //$('#imgHolder').attr('src', user.picture);
                    },
                    dataType: "jsonp"
                });
            },

            //credits: http://www.netlobo.com/url_query_string_javascript.html
            gup: function (url, name) {
                name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
                var regexS = "[\\#&]" + name + "=([^&#]*)";
                var regex = new RegExp(regexS);
                var results = regex.exec(url);
                if (results == null)
                    return "";
                else
                    return results[1];
            },

            startLogoutPolling: function () {
                $('#loginText').show();
                $('#logoutText').hide();
                loggedIn = false;
                $('#uName').text('Welcome ');
                $('#imgHolder').attr('src', 'none.jpg');
            }
        }

    }

    return oauth;
})(oauth || {});

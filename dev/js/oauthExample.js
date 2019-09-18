/**
 * Created by jrobinso on 6/2/18.
 */


function initClient() {

    var scope =
        "https://www.googleapis.com/auth/devstorage.read_only " +
        "https://www.googleapis.com/auth/userinfo.profile " +
        "https://www.googleapis.com/auth/drive.readonly";

    igv.google.loadGoogleProperties("https://s3.amazonaws.com/igv.org.app/web_client_google")

        .then(function (properties) {

            var foo = {
                'clientId': properties["client_id"],
                'scope': scope

            };

            return gapi.client.init(foo);
        })
        .then(function () {

            gapi.signin2.render('signInButton', {
                'scope': scope,
                'width': 120,
                'height': 30,
                'longtitle': false,
                'theme': 'dark',
                'onsuccess': handleSignInClick,
                'onfailure': function (error) {
                    console.log(error)
                }
            });

            var div, options, browser;

            div = $("#myDiv")[0];
            options = {

                genome: "hg19",
                locus: 'myc',
                apiKey: igv.google.properties["api_key"],
            };

            browser = igv.createBrowser(div, options);

            gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
        })


    function handleSignInClick(event) {
        // Nothing to do
    }

    function updateSigninStatus(isSignedIn) {

        const user = gapi.auth2.getAuthInstance().currentUser.get();
        const token = user.getAuthResponse().access_token;
        igv.oauth.google.setToken(token);
        // igv.oauth.setToken(token, "*googleapis*");
    }

}


function signOut() {

    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut().then(function () {
        igv.oauth.google.removeToken();
        //igv.oauth.removeToken("*googleapis*");
        console.log('User signed out.');
    });
}

// Create and render a Picker object for picking files.
function createPicker() {
    var view, accessToken;

    getAccessToken()

        .then(function (accessToken) {

            if (accessToken) {

                view = new google.picker.View(google.picker.ViewId.DOCS);

                picker = new google.picker
                    .PickerBuilder()
                    .setAppId(igv.google.properties["project_number"])
                    .setOAuthToken(igv.oauth.google.access_token)
                    .addView(view)
                    .setDeveloperKey(igv.google.properties["developer_key"])
                    .setCallback(pickerCallback)
                    .build();

                picker.setVisible(true);
            } else {
                igv.browser.presentAlert("Sign into Google before using picker");
            }
        })
        .catch(function (error) {
            console.log(error)
        })


    function getAccessToken() {

        if (igv.oauth.google.access_token) {
            return Promise.resolve(igv.oauth.google.access_token);
        } else {
            var scope, options;

            scope = "https://www.googleapis.com/auth/devstorage.read_only https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.readonly";

            options = new gapi.auth2.SigninOptionsBuilder();
            //options.setAppPackageName('com.example.app');
            //options.setFetchBasicProfile(true);
            options.setPrompt('select_account');
            options.setScope(scope);

            return gapi.auth2.getAuthInstance().signIn(options)

                .then(function (user) {

                    var authResponse = user.getAuthResponse();
                    var profile = user.getBasicProfile();
                    var username = profile.getName();          // TODO -- display username along with sign-out button

                    igv.setGoogleOauthToken(authResponse["access_token"]);

                    return authResponse["access_token"];
                })
        }

    }

    function pickerCallback(data) {
        var url, doc, name, format, id, downloadURL;

        if (data[google.picker.Response.ACTION] === google.picker.Action.PICKED) {
            doc = data[google.picker.Response.DOCUMENTS][0];
            url = doc[google.picker.Document.URL];
            name = doc[google.picker.Document.NAME];
            id = doc[google.picker.Document.ID];

            format = igv.inferFileFormat(name);

            if (!format) {
                alert("Unrecognized file format: " + name);
            } else {

                downloadURL = "https://www.googleapis.com/drive/v3/files/" + id + "?alt=media";

                igv.browser.loadTrack({
                    url: downloadURL,
                    name: name,
                    format: format
                })
            }
        }

    }

}



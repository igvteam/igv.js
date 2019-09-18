// TODO -- eliminate dependence on getBrowser
import {getBrowser} from "../igv-create.js"

const Alert = {
    presentAlert: function (message) {
        getBrowser().presentAlert("Authorization is required, but Google oAuth has not been initalized.  Contact your site administrator for assistance.")
    },

// TODO -- eliminate dependence on getBrowser
    presentMessageWithCallback: function (message, fn) {
        getBrowser().presentMessageWithCallback("Google Login required", function () {
        })
    }
}

export default Alert;
// TODO -- eliminate dependence on getBrowser
import {getBrowser} from "../igv-create.js"

function presentAlert(message) {
    getBrowser().presentAlert("Authorization is required, but Google oAuth has not been initalized.  Contact your site administrator for assistance.")
}

// TODO -- eliminate dependence on getBrowser
function presentMessageWithCallback(message, fn) {
    getBrowser().presentMessageWithCallback("Google Login required", function () {
    })
}

export {presentAlert, presentMessageWithCallback};
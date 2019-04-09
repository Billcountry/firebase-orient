# [Firebase Orient](https://github.com/Billcountry/firebase-orient#readme) *1.0.0*

Firebase Orient is an object oriented implementation of Google's firebase and firestore database.
Bias admission, the firestore models are made to simulate the behaviour of datastore models in python as much as possible.

## Getting Started
Install firebase orient
    - `npm install firebase-orient`

At the entry of your application, set the firebase config as follows:
```js
import {setUp} from "firebase-orient"

/**
 * @param {object} props                    Properties required to initialize firebase
 * @param {string} props.appID              The ID of your app usually appID.firebaseapp.com
 * @param {string} props.messagingSenderId  Firebase messaging ID, provided as part of your config
 * @param {string} props.apiKey             Ofcourse firebase won't just let us connect to their servers like hippies
 * @param {bool}   props.google             If you have enabled google login, set this value to true
 */
setUp({
    appID: "<app_id>",
    messagingSenderId: "<messagingSenderId>",
    apiKey: "<messagingSenderId>",
    google: <True | False>
})
```
Doing this setup means that you wont need to provide a firebase config every time you call the firebase class

### The Firebase class
This class allows you to do various user management functions including:
    - login
    - registration
    - manage user session
The class can be imported and initialized as follows:
```js
import Firebase from "firebase-orient"

const firebase = new Firebase()
```
This can be done without any properties or you can choose to provide a config similar to the one in [Getting Started](#Getting-Started) section.
An error will be thrown if you didn't `setUp` the application and fail to provide a config during initialization


#### Authentication
Firebase allows you to use several authentication methods including; `Email and Password`, `Google`, `Github`, `Phone` et cetera, et cetera.
You can read further about firebase authentication [here](https://firebase.google.com/docs/auth).
This library however supports `Google Auth` and `Email and Password Auth` at the moment.
You can still implement other authentication systems on your own by accessing the firebase auth variable directly as shown:
```js
firebase.auth.onAuthStateChanged(user => console.log(user))
```

**All authentication function returns a user object which documentation can be found [here](https://firebase.google.com/docs/reference/js/firebase.User)**

However here are the simplified methods supported by this library:
##### Email and Password Auth
Registration:
```js
firebase.auth_email_register("your@e.mail", "Password").then(user => {
    console.log(user)
})
```

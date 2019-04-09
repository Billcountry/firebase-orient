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

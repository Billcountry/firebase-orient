# [Firebase Orient](https://github.com/Billcountry/firebase-orient#readme) *1.0.0*

[Issues](https://github.com/Billcountry/firebase-orient/issues)
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
 * @param {string} props.apiKey             Ofcourse firebase won't just let us connect to their servers like hippies
 * @param {bool}   props.google             If you have enabled google login, set this value to true
 */
setUp({
    appID: "<app_id>",
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
    - upload files to firebase storage
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

Login:
```js
firebase.auth_email_signin("your@e.mail", "Password").then(user => {
    console.log(user)
})
```

#### Google Auth
Google auth doesn't separate registration and login so you just:
```js
firebase.auth_google_login().then(user => {
    console.log(user)
})
```

#### Authentication State
Often you need to know whether your user is still logged in or not.
The function is called immediately with the current user, then incase of a change.
```js
firebase.auth_state(user => {
    if(user){
        console.log(user)
    }else{
        // There's no user logged in, do something about it
    }
})
```

#### Storage
You can access firebase storage, upload files, track upload progress and get the download url
The upload functions takes the following parameters:
* `path`(*String*) The path to save the file relative to the bucket root including the filename
* `file`(*FileObject*) A javascript binary file object from input of drop or other sources
* `task_id`(*any*) An upload is a task, this will be used to track the progress
* `actions`(*Object.<functions>*) All actions are called with the task_id as the first var
    * `actions.pause` Will be called if the upload is paused
    * `actions.complete` Will be called with the download link once the upload is done
    * `actions.progress` Will be called with progress value on progress update
    * `actions.error` Will be called with the error string if an error occurs

The function returns an [upload task](https://firebase.google.com/docs/storage/web/upload-files#manage_uploads) you can use to control the download.
```js
const file = document.querySelector("#some-file-input").files[0]
firebase.upload("users/images/random.png", file, "upload1", {
    pause: task_id => {
        console.log("Task paused", task_id)
    },
    complete: (task_id, download_url) => {
        console.log("File upload done", download_url)
    }
})
```
**Actions functions are nullable, *you however shouldn't null the on complete functions***

### The FireStore class
This is an extension of Firestore that *IMO* makes it feel more database like

To create a model simply do:
```js
import {db} from "firebase-orient"

class User extends db.Model {
    constructor(name, email){
        super({
            name: db.stringField(),
            email: db.stringField(),
            height: db.numberField({default: 5.1}),
            date_registered: db.datetimeField(),
            interests: db.listField(),
            contact: db.objectField(),
        })
        this.name = name
        this.email = email
    }
}

class Session extends db.Model {
    constructor(){
        super({
            user: db.refferenceField(User),
            start: db.datetimeField()
        })
    }
}
```
**NB:**
- You must define fields in a `super` call in your constructor
- If a field is not defined then it won't be submitted on put

You can then proceed to use your models as shown:
```js
const user = new User("Some Name", "some@names.email")
user.put()

const session = new Session()
session.user = user
session.start = db.currentTimestamp()
```


#### Release Notes:
- v1.0.1
    - Fixed bugs on model referencing
- v1.0.2
    - Fixed error on getting models
    - Fixed errors on saving updated models
- v1.0.3
    - Enforced model name provision to prevent webpack overwrite

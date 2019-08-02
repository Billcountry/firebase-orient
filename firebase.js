import firebase from "firebase/app"
import "firebase/database"
import "firebase/firestore"
import "firebase/auth"
import "firebase/storage"

/**
 * Fail function for errors in various calls
 * @callback failCallback
 * @param {string} error A string describing the error that occurred
 */

export default class Firebase {
    /**
     * Intializes a single firebase app with given props from constants
     * If using multiple firebase apps provide the config in the constructor
     *
     * @param {object || undefined} props                    Properties required to initialize firebase
     * @param {string} props.appID              The ID of your app usually appID.firebaseapp.com
     * @param {string} props.apiKey             Ofcourse firebase won't just let us connect to their servers like hippies
     * @param {bool}   props.google             If you have enabled google login, set this value to true
     */
    constructor(props) {
        if (!props) {
            if (window.default_firebase_orient_props) {
                props = window.default_firebase_orient_props
            } else {
                throw new Error("Firebase configuration not set")
            }
        }
        const config = {
            apiKey: props.apiKey,
            authDomain: `${props.appID}.firebaseapp.com`,
            databaseURL: `https://${props.appID}.firebaseio.com`,
            projectId: props.appID,
            storageBucket: `${props.appID}.appspot.com`,
        }

        if (!firebase.apps.length) {
            firebase.initializeApp(config)
        }

        this.db = firebase.firestore()

        this.rtdb = firebase.database()
        this.auth = firebase.auth()
        this.storage = firebase.storage().ref()

        if (props.google) {
            this.google = new firebase.auth.GoogleAuthProvider()
        }
    }

    /**
     * Listen for the authentication state changes of the current user
     *
     * @param {function} callback Your function will be called with the user object everytime the user logs in or out
     */
    auth_state(callback) {
        callback(this.auth.currentUser)
        this.auth.onAuthStateChanged(user => {
            if (user) {
                callback(user)
            } else {
                callback(null)
            }
        })
    }

    /**
     * Signout the current user
     * @returns {Promise}
     */
    sign_out() {
        return this.auth.signOut()
    }

    handle_auth_response(result) {
        let user = null
        try {
            user = result.user
        } catch (error) {
            return Promise.reject(error)
        }

        return user
    }

    /**
     * Launch a google authentication popup
     *
     * @param {function} callback Function called with the user object on successful login
     * @param {failCallback} fail Function called with an error string if login fails
     * @returns {Promise}
     */
    auth_google_login() {
        return this.auth
            .signInWithPopup(this.google)
            .then(result => {
                return this.handle_auth_response(result)
            })
            .catch(function(error) {
                const { code, message } = error
                let err_message = ""
                switch (code) {
                    case "auth/popup-closed-by-user":
                    case "auth/cancelled-popup-request":
                        err_message = "Login request canceled"
                        break
                    default:
                        err_message = message
                        console.log(message)
                }
                return Promise.reject(new Error(err_message))
            })
    }

    /**
     * Sign in a user with an email and a pasword
     *
     * @param {string} email A valid email address
     * @param {string} password A password, min 6 characters
     * @returns {Promise}
     */
    auth_email_signin(email, password) {
        return this.auth
            .signInWithEmailAndPassword(email, password)
            .then(result => {
                return this.handle_response(result)
            })
    }

    /**
     * Register a user with an email and a pasword
     *
     * @param {string} email A valid email address
     * @param {string} password A password, min 6 characters
     * @returns {Promise}
     */
    auth_email_register(email, password) {
        this.auth_alt
            .createUserWithEmailAndPassword(email, password)
            .then(result => {
                return this.handle_response(result)
            })
    }

    /**
     * Upload a file to firebase storage
     *
     * @param {string} path The path to save the file relative to the bucket root including the filename
     * @param {object} file A javascript binary file object from input of drop or oter sources
     * @param {string} task_id An upload is a task, this will be used to track the progress
     * @param {object} actions All actions are called with the task_id as the first var
     * @param {function} actions.pause Will be called if the upload is paused
     * @param {function} actions.complete Will be called with the download link once the upload is done
     * @param {function} actions.progress Will be called with progress value on progress update
     * @param {function} actions.error Will be called with the error string if an error occurs
     * @return A firebase upload task that you can call to pause and resume the task
     */
    upload(path, file, task_id, actions) {
        actions = actions ? actions : {}
        const upload_ref = this.storage.child(path)
        const upload_task = upload_ref.put(file)
        upload_task.on(
            "state_changed",
            snapshot => {
                const progress =
                    (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                switch (snapshot.state) {
                    case firebase.storage.TaskState.PAUSED:
                        if (actions.paused) actions.paused(task_id, progress)
                        break
                    case firebase.storage.TaskState.RUNNING:
                        if (actions.progress)
                            actions.progress(task_id, progress)
                        break
                    default:
                        console.log(snapshot.state)
                        break
                }
            },
            error => {
                if (actions.error) {
                    actions.error(task_id, error)
                } else {
                    console.log(error)
                }
            },
            () => {
                upload_task.snapshot.ref.getDownloadURL().then(url => {
                    if (actions.complete) {
                        actions.complete(task_id, url)
                    } else {
                        console.log("Upload successful: ", url)
                    }
                })
            }
        )
        return upload_task
    }
}

export const CURRENT_TIMESTAMP = firebase.database.ServerValue.TIMESTAMP

class FirestoreModel {
    /**
     * Creates a firestore database model
     * @param {object} fields The definition of your fields
     */
    constructor(fields, config) {
        this._fields = {}
        this.__name__ = this.constructor.name

        Object.keys(fields).forEach(key => {
            const field = fields[key]
            if (field instanceof FieldType) {
                this.createField(key, field)
            } else {
                throw new Error("Invalid field type for " + key)
            }
        })

        const firebase = new Firebase(config)
        this.db = firebase.db
    }

    /**
     * @private
     * @param  {object} data Remote data from firestore
     * @return {Model} This model with updated data
     */
    merge_remote_data(data) {
        const remote_keys = Object.keys(data)

        Object.keys(this._fields).forEach(key => {
            const value = data[key]
            if (remote_keys.includes(key)) {
                this[key] = data[key]
            }
        })
        return this
    }

    /**
     * Will get the data from the database and return a porpulated model,
     * Use db.get if reading a model for the first time
     * @param  {string || null} key     The key to the record you want to fetch, leave blank if already set
     * @return {Promise.<Model>}        Resolves to the model with database data updated
     */
    get(key) {
        if (!key) {
            key = this.key
        }
        return this.db
            .collection(this.__name__)
            .doc(key)
            .get()
            .then(doc => {
                if (doc.exists) {
                    return this.merge_remote_data(doc.data())
                }
                Promise.reject("This record does not exist in the database")
            })
    }

    createField(name, field) {
        this._fields[name] = field
        this[name] = field.default
    }

    /**
     * Create a query to the model
     * @param  {list} conditions  Your conditions
     * @return {Promise.[<Model>]}  Resolves to a list of model items
     */
    query(conditions) {
        const ref = this.db.collection(this.__name__)
        validateQuery(conditions)
        let limit_set = false
        conditions.forEach(condition => {
            if (condition.limit) {
                ref.limit(condition.limit)
                limit_set = true
                return
            }
            if (condition.order) {
                const {
                    order: { field, direction },
                } = condition
                if (direction) {
                    ref.orderBy(field, direction)
                } else {
                    ref.orderBy(field)
                }
                return
            }
            const [field, operand, value] = condition
            ref.where(field, operand, value)
        })

        if (!limit_set) {
            ref.limit(1000)
        }

        return ref.get().then(snapShots => {
            snapShots.forEach(doc => {})
        })
    }

    /**
     * Will push the data to firestore database
     * @returns {Promise.<Model>} The model that called the put function
     */
    put() {
        let put_fields = {}
        Object.keys(this._fields).forEach(key => {
            let current_value = this[key]
            const field = this._fields[key]
            if (current_value !== field.value) {
                if (!current_value) {
                    current_value = field.type === FieldTypes.number ? 0 : null
                }
                put_fields[key] = current_value
            }
        })
        if (this.key) {
            return this.db
                .collection(this.__name__)
                .doc(this.key)
                .set(put_fields, { merge: true })
                .then(doc_ref => {
                    return this.merge_remote_data(doc_ref.data())
                })
        } else {
            return this.db
                .collection(this.__name__)
                .add(put_fields)
                .then(doc_ref => {
                    return this.merge_remote_data(doc_ref.data())
                })
        }
    }
}

class FieldType {
    constructor(field_type, field_props) {
        this.type = field_type
        field_props = field_props | {}
        if (field_props.default !== undefined)
            this.default = field_props.default
    }
}

const FieldTypes = {
    string: "string",
    number: "number",
    json: "json",
    list: "list",
    datetime: "datetime",
    refference: "refference",
}

/**
 * Validates that the query is a valid firestore query
 * @param  {list} conditions A list of query conditions
 * @throws {Error} Throws an invalid query error and the reason
 * @returns {bool} True, when a query passes
 */
const validateQuery = conditions => {
    let in_array = 0
    const range_queries = [">", ">=", "<", "<="]
    conditions.forEach(condition => {
        if (condition.limit || condition.order) return // An order or limit command

        if (condition[1] === "array-contains") {
            in_array++
        }

        if (range_queries.includes(condition[1])) {
            range_queries.push(condition[0])
        }
    })

    if (in_array > 1) {
        console.log(
            "For more information about firestore queries see: https://firebase.google.com/docs/firestore/query-data/queries"
        )
        throw new Error(
            "Invalid query: Only one inList condition is allowed in a query"
        )
    }

    if (range_queries.length > 1) {
        console.log(
            "For more information about firestore queries see: https://firebase.google.com/docs/firestore/query-data/queries"
        )
        throw new Error(
            `Rang queries i.e  [">", ">=", "<", "<="] can only be performed on one field, Affected fields: [${range_queries.join(
                ", "
            )}]`
        )
    }

    return true
}

const helpers = {
    /**
     * Less than query comparison
     * @param  {string} field Field to compare
     * @param  {any} value Value to compare to
     * @return {query_condition} A query representation
     */
    lessThan: (field, value) => [field, "<", value],

    /**
     * Less than or equal to query comparison
     * @param  {string} field Field to compare
     * @param  {any} value Value to compare to
     * @return {query_condition} A query representation
     */
    lessThanOrEqualTo: (field, value) => [field, "<=", value],

    /**
     * Equality comparison
     * @param  {string} field Field to compare
     * @param  {any} value Value to compare to
     * @return {query_condition} A query representation
     */
    equalTo: (field, value) => [field, "==", value],

    /**
     * Greater than query comparison
     * @param  {string} field Field to compare
     * @param  {any} value Value to compare to
     * @return {query_condition} A query representation
     */
    greaterThan: (field, value) => [field, ">", value],

    /**
     * Greater than or equal to comparison
     * @param  {string} field Field to compare
     * @param  {any} value Value to compare to
     * @return {query_condition} A query representation
     */
    greaterThanOrEqualTo: (field, value) => [field, ">=", value],

    /**
     * Equality comparison
     * @param  {string} list_field A list type Field to check in
     * @param  {any} value Value to compare to
     * @return {query_condition} A query representation
     */
    inList: (list_field, value) => [list_field, "==", value],

    validate: validateQuery,

    /**
     * Limit the number of reslts, default 2000
     * @param  {number} limit The maximum number of fields you need at any given time
     * @returns {query_limit}
     */
    limit: limit => limit,

    /**
     * Define an order for your query, multiple allowed
     * @param  {string} field        The field to order
     * @param  {direction} direction Available from db.helpers.direction[asc || desc]
     * @returns {query_order}
     */
    order: (field, direction) => ({
        order: {
            field,
            direction,
        },
    }),
    direction: {
        asc: "asc",
        desc: "desc",
    },
    /**
     * The last model in a previous query, start after it
     * @param  {Model || integer} last_visible  A model instance or the position from where the query continues
     * @return {query_offset}
     */
    startAfter: last_visible => {
        return {
            startAfter: last_visible
                .db(last_visible.name)
                .doc(last_visible.key),
        }
    },
}

export const db = {
    /**
     * Use this to get a model instance with the data from a specific key
     * @param  {string} key     Unique key representing the record
     * @param  {db.Model} Model The model the key belongs to
     * @return {Promise}        A promise that resolves a model instance
     */
    get: (key, Model) => {
        const model = new Model()
        console.log(model.__name__)
        return model.get(key)
    },

    /**
     * [description]
     * @param  {db.Model} Model       A firestore Model to run this query on
     * @param  {*args} conditions   Query conditions, can be derived from db.helpers
     * @return {Promise.<[Models]>} A promise that resolves to a list of models
     */
    query: function(Model, ...conditions) {
        const model = new Model()
        return model.query(conditions)
    },

    Model: FirestoreModel,
    /**
     * A string field
     * @param  {object} field_props An object with string Properties
     * @param   {string} field_props.default The default value of this field
     * @return {FieldType} A field type accessible to the firestore model
     */
    stringField: field_props => {
        return new FieldType(FieldTypes.string, field_props)
    },

    /**
     * A Number field
     * @param  {object} field_props An object with number Properties
     * @param   {number} field_props.default The default value of this field
     * @return {FieldType} A field type accessible to the firestore model
     */
    numberField: field_props => {
        return new FieldType(FieldTypes.number, field_props)
    },

    /**
     * A json field
     * @param  {object} field_props An object with number Properties
     * @param   {object} field_props.default The default value of this field
     * @return {FieldType} A field type accessible to the firestore model
     */
    objectField: field_props => {
        return new FieldType(FieldTypes.json, field_props)
    },

    /**
     * A date time field
     * @param  {object} field_props An object with number Properties
     * @param   {object} field_props.default The default value of this field
     * @return {FieldType} A field type accessible to the firestore model
     */
    datetimeField: field_props => {
        return new FieldType(FieldTypes.datetime, field_props)
    },

    /**
     * A list field of strings or numbers
     * @param  {FieldType} field The field type for the contents of the list
     * @param  {object} field_props An object with number Properties
     * @param  {object} field_props.default The default value of the list
     * @return {FieldType} A field type accessible to the firestore model
     */
    listField: (field, field_props) => {
        return new FieldType(FieldTypes.list, { field, field_props })
    },

    /**
     * A field refferencing another model
     * @param  {Model} model The model this field reffrences
     * @return {FieldType} A field type accessible to the firestore model
     */
    refferenceField: (model, props) => {
        return new FieldType(FieldTypes.refference, { model, ...(props || {}) })
    },

    /**
     * [currentTimestamp description]
     * @return {firestoreTimestamp} [description]
     */
    currentTimestamp: () => firebase.firestore.FieldValue.serverTimestamp(),
    helpers,
}

/**
 * Set's up firebase orient to always use these properties on making calls to firebase
 *
 * @param {object} props                    Properties required to initialize firebase
 * @param {string} props.appID              The ID of your app usually appID.firebaseapp.com
 * @param {string} props.messagingSenderId  Firebase messaging ID, provided as part of your config
 * @param {string} props.apiKey             Ofcourse firebase won't just let us connect to their servers like hippies
 * @param {bool}   props.google             If you have enabled google login, set this value to true
 */
export const setUp = props => {
    window.default_firebase_orient_props = props
}

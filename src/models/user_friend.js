const db = require('../db');

module.exports = {
    get collection() {
        return db.user_friends_collection;
    }
};
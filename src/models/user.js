const db = require('../db');

module.exports = {
    get collection() {
        return db.user_collection;
    }
};
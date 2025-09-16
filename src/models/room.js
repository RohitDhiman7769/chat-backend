const db = require('../db');

module.exports = {
    get collection() {
        return db.rooms_collection;
    }
};
const db = require('../db');

module.exports = {
    get collection() {
        return db.room_member_Ids_collection;
    }
};
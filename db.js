const pg = require('pg');
const { Pool } = pg;

require('dotenv').config();

const pool = new Pool({
    user: process.env.DBUSER,
    host: process.env.DBHOST,
    database: process.env.DBNAME,
    password: process.env.DBPASSWORD,
    port: 5432,
});

module.exports = {
    query: (text, params) => {
        return pool.query(text, params)
            .then(res => {
                return res;
            }).catch(err => {
                console.error(err);
                throw err;
            });
    }
}
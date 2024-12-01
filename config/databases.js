const mysql = require('mysql2/promise');

const node1 = mysql.createPool({
    host: "ccscloud.dlsu.edu.ph",
    port: 22072,
    user: "remote_user",
    password: "123",
    database: "steamgames_dw"
});

const node2 = mysql.createPool({
    host: "ccscloud.dlsu.edu.ph",
    port: 22082,
    user: "user",
    password: "password",
    database: "steamgames_2020before"
});

const node3 = mysql.createPool({
    host: "ccscloud.dlsu.edu.ph",
    user: "user",
    port: 22092,
    password: "password",
    database: "steamgames_2020onwards"
});

module.exports = { node1, node2, node3 };

const mysql = require('mysql2/promise');

const node1 = mysql.createPool({
    host: "ccscloud.dlsu.edu.ph",
    port: 22072,
    user: "remote_user",
    password: "123",
    database: "central_db",
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10, 
    idleTimeout: 60000, 
    queueLimit: 0
});

const node2 = mysql.createPool({
    host: "ccscloud.dlsu.edu.ph",
    port: 22082,
    user: "user",
    password: "password",
    database: "steamgames_2020before",
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10, 
    idleTimeout: 60000, 
    queueLimit: 0
});

const node3 = mysql.createPool({
    host: "ccscloud.dlsu.edu.ph",
    user: "user",
    port: 22092,
    password: "password",
    database: "steamgames_2020onwards",
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10, 
    idleTimeout: 60000, 
    queueLimit: 0
});

const node_utils = {
    pingNode: async function (n) {
        
        try {
            const [rows, fields] = await nodes[n - 1].query(`SELECT 1`);
            return true;
        }
        catch (err) {
            console.log(`Error: Node ${n} is not available`);
            return false;
        }
    },

    getConnection: async function(n) {
        switch (n) {
            case 1: return await node1.getConnection();
            case 2: return await node2.getConnection();
            case 3: return await node3.getConnection();
        }
    }
}



module.exports = { node1, node2, node3, node_utils };

const { node1, node2, node3 } = require('../config/databases'); 

async function insertGame(gameData) {
    const { name, release_year, price, windows, mac, linux } = gameData;


    const result = await node1.query('SELECT MAX(app_id) AS max_app_id FROM games');
    const app_id = result[0].max_app_id + 1; // Increment the max

    // Log the insert into the correct query log in Node 1 (Centralized Node)
    if (release_year < 2020) {
        await node1.query(`
            INSERT INTO query_log_node2 (action, action_time, app_id, name, release_date_year, price, windows, mac, linux)
            VALUES ('insert', NOW(), ?, ?, ?, ?, ?, ?, ?)`,
            [app_id, name, release_year, price, windows, mac, linux]
        );
    } else {
        await node1.query(`
            INSERT INTO query_log_node3 (action, action_time, app_id, name, release_date_year, price, windows, mac, linux)
            VALUES ('insert', NOW(), ?, ?, ?, ?, ?, ?, ?)`,
            [app_id, name, release_year, price, windows, mac, linux]
        );
    }

    // Replicate the insert in Node 2 or Node 3 based on release year
    if (release_year < 2020) {
        await node2.query(`
            INSERT INTO query_log (action, action_time, app_id, name, release_date_year, price, windows, mac, linux)
            VALUES ('insert', NOW(), ?, ?, ?, ?, ?, ?, ?)`,
            [app_id, name, release_year, price, windows, mac, linux]
        );
    } else {
        await node3.query(`
            INSERT INTO query_log (action, action_time, app_id, name, release_date_year, price, windows, mac, linux)
            VALUES ('insert', NOW(), ?, ?, ?, ?, ?, ?, ?)`,
            [app_id, name, release_year, price, windows, mac, linux]
        );
    }

    // Optionally: Query and compare logs between query_log_node2 or query_log_node3 on Node 1 and query_log on Node 2 or Node 3 for consistency
    if (release_year < 2020) {
        const logFromCentralNode = await node1.query(`
            SELECT * FROM query_log_node2 WHERE app_id = ?`,
            [app_id]
        );
        const logFromNode2 = await node2.query(`
            SELECT * FROM query_log WHERE app_id = ?`,
            [app_id]
        );

        // Compare logs or perform validation here
        if (logFromCentralNode.length !== logFromNode2.length) {
            console.error('Log mismatch between Node 1 and Node 2!');
            // Additional handling can be done here, e.g., retry, alert, etc.
        }
    } else {
        const logFromCentralNode = await node1.query(`
            SELECT * FROM query_log_node3 WHERE app_id = ?`,
            [app_id]
        );
        const logFromNode3 = await node3.query(`
            SELECT * FROM query_log WHERE app_id = ?`,
            [app_id]
        );

        // Compare logs or perform validation here
        if (logFromCentralNode.length !== logFromNode3.length) {
            console.error('Log mismatch between Node 1 and Node 3!');
            // Additional handling can be done here, e.g., retry, alert, etc.
        }
    }
}

async function updateGame(gameData) {
    const { app_id, name, release_year, price, windows, mac, linux } = gameData;

    // Log the update into the correct query log in Node 1 (Centralized Node)
    if (release_year < 2020) {
        await node1.query(`
            INSERT INTO query_log_node2 (action, action_time, app_id, name, release_date_year, price, windows, mac, linux)
            VALUES ('update', NOW(), ?, ?, ?, ?, ?, ?, ?)`,
            [app_id, name, release_year, price, windows, mac, linux]
        );
    } else {
        await node1.query(`
            INSERT INTO query_log_node3 (action, action_time, app_id, name, release_date_year, price, windows, mac, linux)
            VALUES ('update', NOW(), ?, ?, ?, ?, ?, ?, ?)`,
            [app_id, name, release_year, price, windows, mac, linux]
        );
    }

    // Replicate update in Node 2 or Node 3 based on release year (No updates to games table)
    if (release_year < 2020) {
        await node2.query(`
            INSERT INTO query_log (action, action_time, app_id, name, release_date_year, price, windows, mac, linux)
            VALUES ('update', NOW(), ?, ?, ?, ?, ?, ?, ?)`,
            [app_id, name, release_year, price, windows, mac, linux]
        );
    } else {
        await node3.query(`
            INSERT INTO query_log (action, action_time, app_id, name, release_date_year, price, windows, mac, linux)
            VALUES ('update', NOW(), ?, ?, ?, ?, ?, ?, ?)`,
            [app_id, name, release_year, price, windows, mac, linux]
        );
    }
}

async function deleteGame(app_id, release_year) {
    // Log the delete into the correct query log in Node 1 (Centralized Node)
    if (release_year < 2020) {
        await node1.query(`
            INSERT INTO query_log_node2 (action, action_time, app_id, name, release_date_year, price, windows, mac, linux)
            VALUES ('delete', NOW(), ?, ?, ?, ?, ?, ?, ?)`,
            [app_id, 'Game Name', release_year, 0, false, false, false]
        );
    } else {
        await node1.query(`
            INSERT INTO query_log_node3 (action, action_time, app_id, name, release_date_year, price, windows, mac, linux)
            VALUES ('delete', NOW(), ?, ?, ?, ?, ?, ?, ?)`,
            [app_id, 'Game Name', release_year, 0, false, false, false]
        );
    }

    // Replicate delete in Node 2 or Node 3 based on release year (No delete from games table)
    if (release_year < 2020) {
        await node2.query(`
            INSERT INTO query_log (action, action_time, app_id, name, release_date_year, price, windows, mac, linux)
            VALUES ('delete', NOW(), ?, ?, ?, ?, ?, ?, ?)`,
            [app_id, 'Game Name', release_year, 0, false, false, false]
        );
    } else {
        await node3.query(`
            INSERT INTO query_log (action, action_time, app_id, name, release_date_year, price, windows, mac, linux)
            VALUES ('delete', NOW(), ?, ?, ?, ?, ?, ?, ?)`,
            [app_id, 'Game Name', release_year, 0, false, false, false]
        );
    }
}

module.exports = { insertGame, updateGame, deleteGame };

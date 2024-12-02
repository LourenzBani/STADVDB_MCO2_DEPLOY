
const { node1, node2, node3 } = require('../config/databases'); 
const { logAction, replicateData } = require('./helpers');

async function insertGame(gameData) {
    const { name, release_date_year, price, windows, mac, linux, metacritic_score } = gameData;

    // const [result] = await node1.query('SELECT MAX(app_id) AS max_app_id FROM games');
    // const maxAppId = result[0].max_app_id || 0; // Ensure maxAppId is a number
    // const app_id = maxAppId + 1;
    // Determine the target node based on the release year
    const targetNode = release_date_year < 2020 ? node2 : node3;

    // Insert into Node 1 (Centralized Node)
    const [result] = await node1.query(`
        INSERT INTO games (name, release_date_year, price, windows, mac, linux, metacritic_score)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, release_date_year, price, windows, mac, linux, metacritic_score]
    );

    const app_id = result.insertId;

    // Log the insert into the correct query log in Node 1 (Centralized Node)
    const logTable = release_date_year < 2020 ? 'query_log_node2' : 'query_log_node3';
    await logAction(node1, logTable, 'insert', app_id, name, release_date_year, price, windows, mac, linux, metacritic_score);
    await logAction(targetNode, 'query_log', 'insert', app_id, name, release_date_year, price, windows, mac, linux, metacritic_score);


    // Replicate the insert in Node 2 or Node 3 based on release year
    await replicateData(targetNode, `
        INSERT INTO games (app_id, name, release_date_year, price, windows, mac, linux, metacritic_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [app_id, name, release_date_year, price, windows, mac, linux, metacritic_score]
    );

    // Optionally: Query and compare logs between query_log_node2 or query_log_node3 on Node 1 and query_log on Node 2 or Node 3 for consistency
    if (release_date_year < 2020) {
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
    const { app_id, name, release_year, price, windows, mac, linux, metacritic_score } = gameData;

    // Update in Node 1 (Centralized Node)
    await node1.query(`
        UPDATE games
        SET name = ?, release_date_year = ?, price = ?, windows = ?, mac = ?, linux = ?, metacritic_score = ?
        WHERE app_id = ?`,
        [name, release_year, price, windows, mac, linux, app_id, metacritic_score]
    );

    // Log the update into the correct query log in Node 1 (Centralized Node)
    const logTable = release_year < 2020 ? 'query_log_node2' : 'query_log_node3';
    await logAction(node1, logTable, 'update', app_id, name, release_year, price, windows, mac, linux, metacritic_score);

    // Replicate update in Node 2 or Node 3 based on release year
    const targetNode = release_year < 2020 ? node2 : node3;
    await replicateData(targetNode, `
        UPDATE games
        SET name = ?, release_date_year = ?, price = ?, windows = ?, mac = ?, linux = ?, metacritic_score = ?
        WHERE app_id = ?`,
        [name, release_year, price, windows, mac, linux, app_id, metacritic_score]
    );
    await logAction(targetNode, 'query_log', 'update', app_id, name, release_year, price, windows, mac, linux, metacritic_score);
}


async function deleteGame(app_id, release_year) {
    // Delete from Node 1 (Centralized Node)
    await node1.query(`
        DELETE FROM games WHERE app_id = ?`,
        [app_id]
    );

    // Log the delete into the correct query log in Node 1 (Centralized Node)
    const logTable = release_year < 2020 ? 'query_log_node2' : 'query_log_node3';
    await logAction(node1, logTable, 'delete', app_id, 'Game Name', release_year, 0, false, false, false, 0);

    // Replicate deletion in Node 2 or Node 3 based on release year
    const targetNode = release_year < 2020 ? node2 : node3;
    await replicateData(targetNode, `
        DELETE FROM games WHERE app_id = ?`,
        [app_id]
    );
    await logAction(targetNode, 'query_log', 'delete', app_id, 'Game Name', release_year, 0, false, false, false, 0);
}

module.exports = { insertGame, updateGame, deleteGame };

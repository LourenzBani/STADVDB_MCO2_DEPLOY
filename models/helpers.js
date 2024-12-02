const { node1, node2, node3 } = require('../config/databases');

async function logAction(node, table, action, app_id, name, release_date_year, price, windows, mac, linux, metacritic_score) {
    await node.query(`
        INSERT INTO ${table} (action, action_time, app_id, name, release_date_year, price, windows, mac, linux, metacritic_score)
        VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)`,
        [action, app_id, name, release_date_year, price, windows, mac, linux, metacritic_score]
    );
}

async function replicateData(node, query, params) {
    await node.query(query, params);
}

module.exports = { logAction, replicateData };
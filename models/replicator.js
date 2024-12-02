
const { node1, node2, node3 } = require('../config/databases'); 
const { logAction, replicateData } = require('./helpers');

async function insertGame(gameData) {
    const { name, release_date_year, price, windows, mac, linux, metacritic_score } = gameData;

    const [result] = await node1.query('SELECT MAX(app_id) AS max_app_id FROM games');
    const maxAppId = result[0].max_app_id || 0; // Ensure maxAppId is a number
    const app_id = maxAppId + 1;

    // Log the insert into the correct query log in Node 1 (Centralized Node)
    const targetNode = release_date_year < 2020 ? node2 : node3;
    const logTable = release_date_year < 2020 ? 'query_log_node2' : 'query_log_node3';
    await logAction(node1, logTable, 'insert', app_id, name, release_date_year, price, windows, mac, linux, metacritic_score);
    await logAction(targetNode, 'query_log', 'insert', app_id, name, release_date_year, price, windows, mac, linux, metacritic_score);

    
}


async function updateGame(gameData) {
    const { app_id, name, release_year, price, windows, mac, linux, metacritic_score } = gameData;

    // Log the update into the correct query log in Node 1 (Centralized Node)
    const targetNode = release_year < 2020 ? node2 : node3;
    const logTable = release_year < 2020 ? 'query_log_node2' : 'query_log_node3';
    await logAction(node1, logTable, 'update', app_id, name, release_year, price, windows, mac, linux, metacritic_score);
    await logAction(targetNode, 'query_log', 'update', app_id, name, release_year, price, windows, mac, linux, metacritic_score);
}


async function deleteGame(app_id, release_year) {
    
    // Log the delete into the correct query log in Node 1 (Centralized Node)
    const targetNode = release_year < 2020 ? node2 : node3;
    const logTable = release_year < 2020 ? 'query_log_node2' : 'query_log_node3';
    await logAction(node1, logTable, 'delete', app_id, 'Game Name', release_year, 0, false, false, false, 0);
    await logAction(targetNode, 'query_log', 'delete', app_id, 'Game Name', release_year, 0, false, false, false, 0);
}

module.exports = { insertGame, updateGame, deleteGame };

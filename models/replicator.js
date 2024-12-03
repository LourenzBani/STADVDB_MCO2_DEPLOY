
const { node1, node2, node3 } = require('../config/databases'); 
const { logAction, replicateData } = require('./helpers');

// Simulated node status object
let nodeStatus = {
    node1: true,
    node2: true,
    node3: true,
};


async function isNode1Available(nodeName) {
    try {
        const isAvailable = nodeStatus[nodeName]; // You can use the actual check here
        if (!isAvailable) {
            throw new Error(`${nodeName} is unavailable.`);
        }

        // Example for a MySQL node
        const result = await node1.query('SELECT 1'); // A simple query to test the connection
        if (result) {
            return true; // Node is available
        } else {
            throw new Error('Failed to query database');
        }
    } catch (error) {
        console.error(`Error checking ${nodeName} availability: ${error.message}`);
        return false; // Node is not available
    }
}


async function insertGame(gameData) {
    const { name, release_date_year, price, windows, mac, linux, metacritic_score } = gameData;
    const targetNode = release_date_year < 2020 ? node2 : node3;
    const targetNodeName = release_date_year < 2020 ? 'node2' : 'node3';
    const logTable = release_date_year < 2020 ? 'query_log_node2' : 'query_log_node3';
    if(!(await isNode1Available('node1'))){ 
        const [result] = await targetNode.query('SELECT MAX(app_id) AS max_app_id FROM games');
        const maxAppId = result[0].max_app_id || 0; // Ensure maxAppId is a number
        const app_id = maxAppId + 1;

        await targetNode.query(`
            INSERT INTO games (app_id, name, release_date_year, price, windows, mac, linux, metacritic_score)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [app_id, name, release_date_year, price, windows, mac, linux, metacritic_score]);
        await logAction(targetNode, targetNodeName, 'query_log', 'insert', app_id, name, release_date_year, price, windows, mac, linux, metacritic_score);
    }else{
        const [result] = await node1.query('SELECT MAX(app_id) AS max_app_id FROM games');
        const maxAppId = result[0].max_app_id || 0; // Ensure maxAppId is a number
        const app_id = maxAppId + 1;
        await node1.query(`
            INSERT INTO games (app_id, name, release_date_year, price, windows, mac, linux, metacritic_score)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [app_id, name, release_date_year, price, windows, mac, linux, metacritic_score]);
        // Log the insert into the correct query log in Node 1 (Centralized Node)
        await logAction(node1, 'node1', logTable, 'insert', app_id, name, release_date_year, price, windows, mac, linux, metacritic_score);
    }

    
    
    
}


async function updateGame(gameData) {
    const { app_id, name, release_year, price, windows, mac, linux, metacritic_score } = gameData;
    const targetNode = release_year < 2020 ? node2 : node3;
    const targetNodeName = release_year < 2020 ? 'node2' : 'node3';
    const logTable = release_year < 2020 ? 'query_log_node2' : 'query_log_node3';
    if(!(await isNode1Available('node1'))){ 
        console.log('Cant access node 1');
        await targetNode.query(`
            UPDATE games 
            SET name = ?, release_date_year = ?, price = ?, windows = ?, mac = ?, linux = ?, metacritic_score = ?
            WHERE app_id = ?`,
            [name, release_year, price, windows, mac, linux, metacritic_score, app_id]);
            await logAction(targetNode, targetNodeName, 'query_log', 'update', app_id, name, release_year, price, windows, mac, linux, metacritic_score);
    }else{
        await node1.query(`
            UPDATE games 
            SET name = ?, release_date_year = ?, price = ?, windows = ?, mac = ?, linux = ?, metacritic_score = ?
            WHERE app_id = ?`,
            [name, release_year, price, windows, mac, linux, metacritic_score, app_id]);
        await logAction(node1, 'node1', logTable, 'update', app_id, name, release_year, price, windows, mac, linux, metacritic_score);
    }


    

    
}


async function deleteGame(app_id, release_year) {
    
    // Log the delete into the correct query log in Node 1 (Centralized Node)

    const targetNode = release_year < 2020 ? node2 : node3;
    const targetNodeName = release_year < 2020 ? 'node2' : 'node3';
    const logTable = release_year < 2020 ? 'query_log_node2' : 'query_log_node3';
    if(!(await isNode1Available('node1'))){ 
        console.log('Cant access node 1');
        await targetNode.query(`
            DELETE FROM games WHERE app_id = ?`,
            [app_id]);
        await logAction(targetNode, targetNodeName, 'query_log', 'delete', app_id, 'Game Name', release_year, 0, false, false, false, 0);
    }
    else{
        await node1.query(`
            DELETE FROM games WHERE app_id = ?`,
            [app_id]);
        await logAction(node1, 'node1', logTable, 'delete', app_id, 'Game Name', release_year, 0, false, false, false, 0);
    }
    
    
}

module.exports = { insertGame, updateGame, deleteGame };

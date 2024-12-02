const { node1, node2, node3 } = require('../config/databases');

// Helper function to perform the action on the corresponding node
async function performAction(action, log) {
    const { app_id, name, release_date_year, price, windows, mac, linux, metacritic_score} = log;

    try {
        if (action === 'insert') {
            // Insert the game data into the corresponding node
            if (release_date_year < 2020) {
                await node2.query(`
                    INSERT INTO games (app_id, name, release_date_year, price, windows, mac, linux, metacritic_score)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                    [app_id, name, release_date_year, price, windows, mac, linux, metacritic_score]);
                await node1.query(`
                    INSERT INTO games (app_id, name, release_date_year, price, windows, mac, linux, metacritic_score)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                    [app_id, name, release_date_year, price, windows, mac, linux, metacritic_score]);
            } else {
                await node3.query(`
                    INSERT INTO games (app_id, name, release_date_year, price, windows, mac, linux, metacritic_score)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                    [app_id, name, release_date_year, price, windows, mac, linux, metacritic_score]);
                await node1.query(`
                    INSERT INTO games (app_id, name, release_date_year, price, windows, mac, linux, metacritic_score)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                    [app_id, name, release_date_year, price, windows, mac, linux, metacritic_score]);
            }
        } else if (action === 'update') {
            // Update the game data in the corresponding node
            if (release_date_year < 2020) {
                await node2.query(`
                    UPDATE games 
                    SET name = ?, release_date_year = ?, price = ?, windows = ?, mac = ?, linux = ?, metacritic_score = ?
                    WHERE app_id = ?`, 
                    [name, release_date_year, price, windows, mac, linux, metacritic_score, app_id]);
                await node1.query(`
                    UPDATE games 
                    SET name = ?, release_date_year = ?, price = ?, windows = ?, mac = ?, linux = ?, metacritic_score = ?
                    WHERE app_id = ?`, 
                    [name, release_date_year, price, windows, mac, linux, metacritic_score, app_id]);
            } else {
                await node3.query(`
                    UPDATE games 
                    SET name = ?, release_date_year = ?, price = ?, windows = ?, mac = ?, linux = ?, metacritic_score = ?
                    WHERE app_id = ?`, 
                    [name, release_date_year, price, windows, mac, linux, metacritic_score, app_id]);
                await node1.query(`
                    UPDATE games 
                    SET name = ?, release_date_year = ?, price = ?, windows = ?, mac = ?, linux = ?, metacritic_score = ?
                    WHERE app_id = ?`, 
                    [name, release_date_year, price, windows, mac, linux, metacritic_score, app_id]);
            }
        } else if (action === 'delete') {
            // Delete the game data from the corresponding node
            if (release_date_year < 2020) {
                await node2.query(`
                    DELETE FROM games WHERE app_id = ?`, 
                    [app_id]);
                await node1.query(`
                    DELETE FROM games WHERE app_id = ?`, 
                    [app_id]);
            } else {
                await node3.query(`
                    DELETE FROM games WHERE app_id = ?`, 
                    [app_id]);
                await node1.query(`
                    DELETE FROM games WHERE app_id = ?`, 
                    [app_id]);
            }
        }
    } catch (error) {
        console.error(`Error performing action: ${action} for app_id: ${app_id}`, error);
    }
}

// Function to synchronize the logs and perform actions
async function synchronizeLogs() {
    try {
        // Fetch the logs from query_log_node2 and query_log_node3 in Node 1
        const [logFromNode2] = await node1.query('SELECT * FROM query_log_node2');
        const [logFromNode3] = await node1.query('SELECT * FROM query_log_node3');

        // Process the logs for Node 2
        for (const log of logFromNode2) {
            await performAction(log.action, log);
            // Log the action performed
            console.log(`Processed log from node2: ${log.log_id}`);
        }

        // Process the logs for Node 3
        for (const log of logFromNode3) {
            await performAction(log.action, log);
            // Log the action performed
            console.log(`Processed log from node3: ${log.log_id}`);
        }

        console.log('Synchronization completed successfully');
    } catch (error) {
        console.error('Error synchronizing logs:', error);
    }
}




// Run the synchronizer
synchronizeLogs();

module.exports = { synchronizeLogs};

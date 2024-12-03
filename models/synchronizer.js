const { node1, node2, node3 } = require('../config/databases');
const { logAction, replicateData } = require('./helpers');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function setIsolationLevel(connection, level) {
    await connection.query(`SET TRANSACTION ISOLATION LEVEL ${level}`);
}

// Helper function to perform the action on the corresponding node
async function performAction(action, log) {
    const { app_id, name, release_date_year, price, windows, mac, linux, metacritic_score} = log;

    let connection;
    try {
        // Start a transaction
        connection = await node1.getConnection();
        await setIsolationLevel(connection, 'READ COMMITTED'); // dont forget to comment out comit stt to simulate dirty read
        await connection.beginTransaction(); // Start transaction

        if (action === 'insert') {
            // Check if the app_id already exists
            const [existingRecordNode1] = await connection.query(`SELECT app_id FROM games WHERE app_id = ?`, [app_id]);
            const [existingRecordNode2] = await node2.query(`SELECT app_id FROM games WHERE app_id = ?`, [app_id]);
            const [existingRecordNode3] = await node3.query(`SELECT app_id FROM games WHERE app_id = ?`, [app_id]);

            // Insert the game data into the corresponding node
            if (release_date_year < 2020) {
                if(existingRecordNode1.length > 0){
                    await node2.query(
                        `INSERT INTO games (app_id, name, release_date_year, price, windows, mac, linux, metacritic_score)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [app_id, name, release_date_year, price, windows, mac, linux, metacritic_score]
                    );
                }else if(existingRecordNode2.length > 0){
                    const result = await connection.query(
                        `INSERT INTO games (app_id, name, release_date_year, price, windows, mac, linux, metacritic_score)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [app_id, name, release_date_year, price, windows, mac, linux, metacritic_score]
                    );
                    console.log('Insert Result:', result);
                }else{
                    const result = await connection.query(
                        `INSERT INTO games (app_id, name, release_date_year, price, windows, mac, linux, metacritic_score)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [app_id, name, release_date_year, price, windows, mac, linux, metacritic_score]
                    );
                    await node2.query(
                        `INSERT INTO games (app_id, name, release_date_year, price, windows, mac, linux, metacritic_score)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [app_id, name, release_date_year, price, windows, mac, linux, metacritic_score]
                    );
                    console.log('Insert Result:', result);
                }
            } else {
                if(existingRecordNode1.length > 0){
                    await node3.query(
                        `INSERT INTO games (app_id, name, release_date_year, price, windows, mac, linux, metacritic_score)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [app_id, name, release_date_year, price, windows, mac, linux, metacritic_score]
                    );
                }else if(existingRecordNode3.length > 0){
                    const result = await connection.query(
                        `INSERT INTO games (app_id, name, release_date_year, price, windows, mac, linux, metacritic_score)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [app_id, name, release_date_year, price, windows, mac, linux, metacritic_score]
                    );
                    console.log('Insert Result:', result);
                }else{
                    const result = await connection.query(
                        `INSERT INTO games (app_id, name, release_date_year, price, windows, mac, linux, metacritic_score)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [app_id, name, release_date_year, price, windows, mac, linux, metacritic_score]
                    );
                    await node3.query(
                        `INSERT INTO games (app_id, name, release_date_year, price, windows, mac, linux, metacritic_score)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [app_id, name, release_date_year, price, windows, mac, linux, metacritic_score]
                    );
                    console.log('Insert Result:', result);
                }
            }
        } else if (action === 'update') {
            // Update the game data in the corresponding node
            if (release_date_year < 2020) {
                const result = await connection.query(`
                    UPDATE games 
                    SET name = ?, release_date_year = ?, price = ?, windows = ?, mac = ?, linux = ?, metacritic_score = ?
                    WHERE app_id = ?`,
                    [name, release_date_year, price, windows, mac, linux, metacritic_score, app_id]);
                    console.log('Update Result:', result);
                await node2.query(`
                    UPDATE games 
                    SET name = ?, release_date_year = ?, price = ?, windows = ?, mac = ?, linux = ?, metacritic_score = ?
                    WHERE app_id = ?`,
                    [name, release_date_year, price, windows, mac, linux, metacritic_score, app_id]);
            } else {
                const result = await connection.query(`
                    UPDATE games 
                    SET name = ?, release_date_year = ?, price = ?, windows = ?, mac = ?, linux = ?, metacritic_score = ?
                    WHERE app_id = ?`,
                    [name, release_date_year, price, windows, mac, linux, metacritic_score, app_id]);
                    console.log('Update Result:', result);
                await node3.query(`
                    UPDATE games 
                    SET name = ?, release_date_year = ?, price = ?, windows = ?, mac = ?, linux = ?, metacritic_score = ?
                    WHERE app_id = ?`,
                    [name, release_date_year, price, windows, mac, linux, metacritic_score, app_id]);
            }
        } else if (action === 'delete') {
            // Delete the game data from the corresponding node
            if (release_date_year < 2020) {
                await connection.query(`
                    DELETE FROM games WHERE app_id = ?`,
                    [app_id]);
                await node2.query(`
                    DELETE FROM games WHERE app_id = ?`,
                    [app_id]);
            } else {
                await connection.query(`
                    DELETE FROM games WHERE app_id = ?`,
                    [app_id]);
                await node3.query(`
                    DELETE FROM games WHERE app_id = ?`,
                    [app_id]);
            }
        }

        // Update the logs table in the corresponding node
        //await syncLogsTable(action, log, connection, 'query_log');

        await sleep(10000); 
        // Commit the transaction if all operations succeed
        await connection.commit();
        console.log(`Action ${action} for app_id ${app_id} successfully committed.`);
    } catch (error) {
        // If an error occurs, rollback the transaction to maintain data integrity
        if (connection) {
            await connection.rollback();
            console.error(`Transaction for app_id ${app_id} failed. Rolling back.`, error);
        }
    } finally {
        if (connection) {
            // Release the connection back to the pool
            connection.release();
        }
    }
}

async function syncLogsTable(action, log, targetNode, targetTable) {
    const { app_id, name, release_date_year, price, windows, mac, linux, metacritic_score, log_id } = log;

    try {
        // Manually insert log_id to avoid auto-increment mismatch
        await targetNode.query(`
            INSERT INTO ${targetTable} (log_id, action, action_time, app_id, name, release_date_year, price, windows, mac, linux, metacritic_score)
            VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)`,
            [log_id, action, app_id, name, release_date_year, price, windows, mac, linux, metacritic_score]
        );
        return true;  // Sync was successful
    } catch (error) {
        console.error(`Error inserting log_id ${log_id} into ${targetTable}`, error);
        return false;  // Sync failed
    }
}


async function synchronizeLogs() {
    try {
        // Fetch logs from all nodes
        const [logsFromNode1Node2] = await node1.query('SELECT * FROM query_log_node2');
        const [logsFromNode1Node3] = await node1.query('SELECT * FROM query_log_node3');
        const [logsFromNode2] = await node2.query('SELECT * FROM query_log');
        const [logsFromNode3] = await node3.query('SELECT * FROM query_log');

        console.log('Logs from Node 1 (query_log_node2):', logsFromNode1Node2.length);
        console.log('Logs from Node 2 (query_log):', logsFromNode2.length);
        console.log('Logs from Node 1 (query_log_node3):', logsFromNode1Node3.length);
        console.log('Logs from Node 3 (query_log):', logsFromNode3.length);

        // Check if the logs differ in count before syncing
        if (logsFromNode1Node2.length > logsFromNode2.length) {
            console.log('Node 1 (query_log_node2) has more logs than Node 2 (query_log). Synchronizing Node 2...');
            for (const log of logsFromNode1Node2) {
                const [existingLog] = await node2.query('SELECT 1 FROM query_log WHERE log_id = ?', [log.log_id]);
                if (existingLog.length === 0) {
                    const syncSuccess = await syncLogsTable(log.action, log, node2, 'query_log');
                    if (syncSuccess) {
                        await performAction(log.action, log);
                        console.log(`Inserted log_id ${log.log_id} from Node 1 (query_log_node2) to Node 2 (query_log)`);
                    } else {
                        console.error(`Failed to synchronize log_id ${log.log_id} to Node 2`);
                    }
                }
            }
        }

        if (logsFromNode2.length > logsFromNode1Node2.length) {
            console.log('Node 2 (query_log) has more logs than Node 1 (query_log_node2). Synchronizing Node 1...');
            for (const log of logsFromNode2) {
                const [existingLog] = await node1.query('SELECT 1 FROM query_log_node2 WHERE log_id = ?', [log.log_id]);
                if (existingLog.length === 0) {
                    const syncSuccess = await syncLogsTable(log.action, log, node1, 'query_log_node2');
                    if (syncSuccess) {
                        await performAction(log.action, log);
                        console.log(`Inserted log_id ${log.log_id} from Node 2 (query_log) to Node 1 (query_log_node2)`);
                    } else {
                        console.error(`Failed to synchronize log_id ${log.log_id} to Node 1`);
                    }
                }
            }
        }

        // Sync Node 1 -> Node 3 (query_log_node3 -> query_log)
        if (logsFromNode1Node3.length > logsFromNode3.length) {
            console.log('Node 1 (query_log_node3) has more logs than Node 3 (query_log). Synchronizing Node 3...');
            for (const log of logsFromNode1Node3) {
                const [existingLog] = await node3.query('SELECT 1 FROM query_log WHERE log_id = ?', [log.log_id]);
                if (existingLog.length === 0) {
                    const syncSuccess = await syncLogsTable(log.action, log, node3, 'query_log');
                    if (syncSuccess) {
                        await performAction(log.action, log);
                        console.log(`Inserted log_id ${log.log_id} from Node 1 (query_log_node3) to Node 3 (query_log)`);
                    } else {
                        console.error(`Failed to synchronize log_id ${log.log_id} to Node 3`);
                    }
                }
            }
        }

        if (logsFromNode3.length > logsFromNode1Node3.length) {
            console.log('Node 3 (query_log) has more logs than Node 1 (query_log_node3). Synchronizing Node 1...');
            for (const log of logsFromNode3) {
                const [existingLog] = await node1.query('SELECT 1 FROM query_log_node3 WHERE log_id = ?', [log.log_id]);
                if (existingLog.length === 0) {
                    const syncSuccess = await syncLogsTable(log.action, log, node1, 'query_log_node3');
                    if (syncSuccess) {
                        await performAction(log.action, log);
                        console.log(`Inserted log_id ${log.log_id} from Node 3 (query_log) to Node 1 (query_log_node3)`);
                    } else {
                        console.error(`Failed to synchronize log_id ${log.log_id} to Node 1`);
                    }
                }
            }
        }

    } catch (error) {
        console.error('Error during synchronization:', error);
    }
}






module.exports = { synchronizeLogs, performAction, syncLogsTable };

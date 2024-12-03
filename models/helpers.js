const { node1, node2, node3 } = require('../config/databases');

// Simulated node status object
let nodeStatus = {
    node1: true,
    node2: true,
    node3: true,
};

// Retry queues for unavailable nodes
const retryQueues = {
    node1: [],
    node2: [],
    node3: [],
};

async function isNodeAvailable(nodeName,node) {
    try {
        const isAvailable = nodeStatus[nodeName]; // You can use the actual check here
        if (!isAvailable) {
            throw new Error(`${nodeName} is unavailable.`);
        }

        // Example for a MySQL node
        const result = await node.query('SELECT 1'); // A simple query to test the connection
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


// Retry queued actions for a node
async function processRetryQueue(node, nodeName, table) {
    if (await isNodeAvailable(nodeName,node) && retryQueues[nodeName].length > 0) { // Await the availability check
        console.log(`Processing retry queue for ${nodeName}...`);
        const retryQueue = [...retryQueues[nodeName]]; 
        retryQueues[nodeName] = []; 

        for (const log of retryQueue) {
            try {
                const [action, app_id, name, release_date_year, price, windows, mac, linux, metacritic_score] = log;
                // Pass both node and nodeName as arguments to logAction
                await logAction(node, nodeName, table, action, app_id, name, release_date_year, price, windows, mac, linux, metacritic_score);
                console.log(`Retried action successfully for ${nodeName}:`, log);
            } catch (error) {
                console.error(`Failed to retry action for ${nodeName}:`, error.message);
                retryQueues[nodeName].push(log); // Add back to retry queue if it fails again
            }
        }
    }
}

async function logAction(node, nodeName, table, action, app_id, name, release_date_year, price, windows, mac, linux, metacritic_score) {
    const log = [action, app_id, name, release_date_year, price, windows, mac, linux, metacritic_score];

    if (!(await isNodeAvailable(nodeName,node))) { // Await the availability check
        console.error(`Node ${nodeName} is unavailable. Storing log action in retry queue.`);
        console.log(`Action being pushed to retry queue for ${nodeName}:`, log);
        retryQueues[nodeName].push(log); // Push to retry queue
    }
    else{
        try {
            await node.query(`
                INSERT INTO ${table} (action, action_time, app_id, name, release_date_year, price, windows, mac, linux, metacritic_score)
                VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)`,
                log
            );
            console.log(`Log action successfully inserted into ${nodeName}.${table}`);
            retryQueues[nodeName] = retryQueues[nodeName].filter(item => item !== log);
            console.log(`Retry queue for ${nodeName} cleared after successful log insertion.`);
        } catch (error) {
            console.error(`Failed to insert log action into ${nodeName}.${table}:`, error.message);
        }
    }
    
}

// Update node status
function updateNodeStatus(nodeName, isAvailable) {
    nodeStatus[nodeName] = isAvailable;
    console.log(`Node ${nodeName} is now ${isAvailable ? 'available' : 'unavailable'}`);
}

// Replicate data to a node
async function replicateData(node, query, params) {
    await node.query(query, params);
}

module.exports = { logAction, updateNodeStatus, processRetryQueue, replicateData, isNodeAvailable };

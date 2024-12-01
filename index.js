const express = require('express');
const { node1, node2, node3 } = require('./config/databases');

const { insertGame, updateGame, deleteGame } = require('./models/replicator');

const {synchronizeLogs } = require('./models/synchronizer');

// Initialize Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set the view engine to EJS
app.set('view engine', 'ejs');

console.log(updateGame);

console.log(synchronizeLogs);
// Home route that renders the index.ejs page
app.get('/', async (req, res) => {
    try {
        await synchronizeLogs();
        const itemsPerPage = 100;
        const currentPage = parseInt(req.query.page) || 1;
        const offset = (currentPage - 1) * itemsPerPage;

        const query = `
            SELECT *
            FROM games g
            LIMIT ? OFFSET ?
        `;

        const [games] = await node1.query(query, [itemsPerPage, offset]);

        // Get the total number of games for pagination
        const [totalGamesResult] = await node1.query('SELECT COUNT(*) AS total FROM games');
        const totalGames = totalGamesResult[0].total;
        const totalPages = Math.ceil(totalGames / itemsPerPage);

        // Render the view with games, currentPage, and totalPages
        res.render('index', {
            games,
            currentPage,
            totalPages
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Server error');
    }
});

// Route to show the edit form for a game
app.get('/editGame', async (req, res) => {
    try {
        const gameId = req.query.id;
        const [game] = await node1.query('SELECT * FROM games WHERE app_id = ?', [gameId]);
        
        if (!game) {
            return res.status(404).send('Game not found');
        }

        res.render('editGame', { game: game[0] });
    } catch (error) {
        console.error('Error fetching game for editing:', error);
        res.status(500).send('Server error');
    }
});

// Route to handle game update
// app.post('/updateGame', async (req, res) => {
//     const { app_id, name, release_year, price, windows, mac, linux } = req.body;
    
//     try {
//         await node1.query(
//             `UPDATE games SET name = ?, release_date_year = ?, price = ?, windows = ?, mac = ?, linux = ? WHERE app_id = ?`,
//             [name, release_year, price, windows, mac, linux, app_id]
//         );
//         res.redirect('/');
//     } catch (error) {
//         console.error('Error updating game:', error);
//         res.status(500).send('Server error');
//     }
    
// });

// Route to update an existing game
app.post('/updateGame', async (req, res) => {
    try {
        const gameData = req.body;
        await updateGame(gameData);
        await synchronizeLogs();
        res.status(200).send('Game updated successfully');
    } catch (error) {
        res.status(500).send('Error updating game: ' + error.message);
    }
});



// Route for fetching data from Node 1 (JSON response) FOR TESTING PURPOSES
app.get('/node1/data', async (req, res) => {
    try {
        // Fetching rows from Node 1's 'games' table
        const [rows] = await node1.query('SELECT * FROM games');
        0
        // Sending the rows in a JSON response
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching data from Node 1:", error);
        res.status(500).send('Server error');
    }
});

// Listen on the specified port
const PORT = 9000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

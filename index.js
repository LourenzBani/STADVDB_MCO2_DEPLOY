const express = require('express');
const { node1, node2, node3 } = require('./config/databases');

// Initialize Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Home route that renders the index.ejs page
app.get('/', async (req, res) => {
    try {
        const itemsPerPage = 100;
        const currentPage = parseInt(req.query.page) || 1;
        const offset = (currentPage - 1) * itemsPerPage;

        const query = `
            SELECT g.*, 
                GROUP_CONCAT(DISTINCT ge.genre_name) AS genres,
                GROUP_CONCAT(DISTINCT dev.developer_name) AS developers,
                GROUP_CONCAT(DISTINCT pub.publisher_name) AS publishers
            FROM games g
            LEFT JOIN game_genres ge ON g.app_id = ge.app_id
            LEFT JOIN game_developers gd ON g.app_id = gd.app_id
            LEFT JOIN developers dev ON gd.developer_id = dev.developer_id
            LEFT JOIN game_publishers gp ON g.app_id = gp.app_id
            LEFT JOIN publishers pub ON gp.publisher_id = pub.publisher_id
            GROUP BY g.app_id
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
app.post('/updateGame', async (req, res) => {
    const { app_id, name, release_year, price, genres, windows, mac, linux } = req.body;
    
    try {
        await node1.query(
            `UPDATE games SET name = ?, release_date_year = ?, price = ?, genres = ?, windows = ?, mac = ?, linux = ? WHERE app_id = ?`,
            [name, release_year, price, genres, windows, mac, linux, app_id]
        );

        res.redirect('/');
    } catch (error) {
        console.error('Error updating game:', error);
        res.status(500).send('Server error');
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

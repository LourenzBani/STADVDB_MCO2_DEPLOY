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
// Home route that renders the index.ejs page
app.get('/', async (req, res) => {
    try {
        await synchronizeLogs();
        const itemsPerPage = 100;
        const currentPage = parseInt(req.query.page) || 1;
        const offset = (currentPage - 1) * itemsPerPage;

        // Get the year range from query params (if provided)
        const startYear = req.query.startYear || '';
        const endYear = req.query.endYear || '';

        let query = `SELECT * FROM games g WHERE 1=1`;
        const queryParams = [];

        if (startYear) {
            query += ` AND g.release_date_year >= ?`;
            queryParams.push(startYear);
        }

        if (endYear) {
            query += ` AND g.release_date_year <= ?`;
            queryParams.push(endYear);
        }

        query += ` LIMIT ? OFFSET ?`;

        queryParams.push(itemsPerPage, offset);

        const [games] = await node1.query(query, queryParams);

        // Get the total number of games for pagination
        let totalQuery = `SELECT COUNT(*) AS total FROM games g WHERE 1=1`;
        const totalQueryParams = [];

        if (startYear) {
            totalQuery += ` AND g.release_date_year >= ?`;
            totalQueryParams.push(startYear);
        }

        if (endYear) {
            totalQuery += ` AND g.release_date_year <= ?`;
            totalQueryParams.push(endYear);
        }

        const [totalGamesResult] = await node1.query(totalQuery, totalQueryParams);
        const totalGames = totalGamesResult[0].total;
        const totalPages = Math.ceil(totalGames / itemsPerPage);

        res.render('index', {
            games,
            currentPage,
            totalPages,
            startDate: startYear,
            endDate: endYear
        });

    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Server error');
    }
});

app.post('/addGame', async (req, res) => {
    try {
        const {name, release_date_year, price, windows, mac, linux, metacritic_score } = req.body;

        const gameData = {name, release_date_year, price, windows, mac, linux, metacritic_score };
        await insertGame(gameData);

        await synchronizeLogs();

        res.status(200).send({ message: 'Game added successfully' });
    } catch (error) {
        console.error('Error adding game:', error);
        res.status(500).send({ message: 'Error adding game' });
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

app.get('/deleteGame/:id', async (req, res) => {
    try {
        const app_id = req.params.id;
        const [game] = await node1.query('SELECT release_date_year FROM games WHERE app_id = ?', [app_id]);

        if (!game.length) {
            return res.status(404).send({ message: 'Game not found' });
        }

        const release_year = game[0].release_date_year;
        console.log(`Deleting game with app_id: ${app_id} and year ${release_year}`);

        await deleteGame(app_id, release_year);
        await synchronizeLogs();
        res.status(200).send({ message: 'Game successfully deleted' });
    } catch (error) {
        console.error('Error deleting game:', error);
        res.status(500).send({ message: 'Error deleting game' });
    }
});


// Listen on the specified port
const PORT = 9001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

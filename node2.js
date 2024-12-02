const express = require('express');
const { node1, node2, node3 } = require('./config/databases');
const { insertGame, updateGame, deleteGame } = require('./models/replicator');
const { synchronizeLogs } = require('./models/synchronizer');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

async function setIsolationLevel(connection, level) {
    await connection.query(`SET SESSION TRANSACTION ISOLATION LEVEL ${level}`);
}

app.get('/', async (req, res) => {
    try {
        await synchronizeLogs();
        const itemsPerPage = 100;
        const currentPage = parseInt(req.query.page) || 1;
        const offset = (currentPage - 1) * itemsPerPage;

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

        const [games] = await node2.query(query, queryParams);

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

        const [totalGamesResult] = await node2.query(totalQuery, totalQueryParams);
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
        const { name, release_date_year, price, windows, mac, linux, metacritic_score } = req.body;
        const gameData = { name, release_date_year, price, windows, mac, linux, metacritic_score };
        await insertGame(gameData);
        await synchronizeLogs();
        res.status(200).send({ message: 'Game added successfully' });
    } catch (error) {
        console.error('Error adding game:', error);
        res.status(500).send({ message: 'Error adding game' });
    }
});

app.get('/editGame', async (req, res) => {
    const connection = await node2.getConnection();
    try {
        const gameId = req.query.id;
        await setIsolationLevel(connection, 'READ UNCOMMITTED');
        await connection.beginTransaction();
        const [game] = await node2.query('SELECT * FROM games WHERE app_id = ?', [gameId]);
        if (!game) {
            return res.status(404).send('Game not found');
        }
        res.render('editGame', { game: game[0] });
    } catch (error) {
        console.error('Error fetching game for editing:', error);
        res.status(500).send('Server error');
    }
});

app.post('/updateGame', async (req, res) => {
    try {
        const gameData = req.body;
        await updateGame(gameData);
        sleep(10000);
        await synchronizeLogs();
        res.status(200).send('Game updated successfully');
    } catch (error) {
        res.status(500).send('Error updating game: ' + error.message);
    }
});

app.get('/deleteGame/:id', async (req, res) => {
    try {
        const app_id = req.params.id;
        const [game] = await node2.query('SELECT release_date_year FROM games WHERE app_id = ?', [app_id]);
        if (!game.length) {
            return res.status(404).send({ message: 'Game not found' });
        }
        const release_year = game[0].release_date_year;
        await deleteGame(app_id, release_year);
        await synchronizeLogs();
        res.status(200).send({ message: 'Game successfully deleted' });
    } catch (error) {
        console.error('Error deleting game:', error);
        res.status(500).send({ message: 'Error deleting game' });
    }
});

const PORT = 9002;
app.listen(PORT, () => {
    console.log(`Node 2 server running on port ${PORT}`);
});
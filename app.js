import express from "express";
import dotenv from 'dotenv';
import pg from 'pg';
import joi from 'joi';
import dayjs from 'dayjs';

const app = express();
app.use(express.json());
const { Pool } = pg;
dotenv.config();

const connection = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const port = process.env.PORT;

app.get('/categories', async (req, res) => {
    try
    {
        const categories = await connection.query('SELECT * FROM categories')
        res.send(categories.rows)
    }
    catch(error)
    {
        res.status(500).send(error)
    } 
})

app.post('/categories', async (req, res) => {
    try
    {
        const { name } = req.body;
        if(!name)
        {
            return res.sendStatus(400);
        }
        const categoriesWithBodyName = await connection.query('SELECT * FROM categories WHERE name=$1', [name]);
        if (categoriesWithBodyName.rows.length != 0) 
        {
            return res.sendStatus(409);
        }
        await connection.query(`
        INSERT INTO
        categories (name)
        VALUES ($1)`,
        [name]);
        res.sendStatus(201);
    }
    catch(error)
    {
        res.status(500).send(error)
    }  
})

app.get('/games', async (req, res) => {
    try
    {
        const queryName = req.query.name;
        let games
        if (queryName)
        {
            games = await connection.query(`
            SELECT games.*, categories.name as "categoryName" FROM games 
            JOIN categories ON games."categoryId"=categories.id 
            WHERE games.name LIKE $1`, 
            [`${queryName}%`]);
        }
        else
        {
            games = await connection.query(`SELECT games.*, categories.name as "categoryName" FROM games 
            JOIN categories ON games."categoryId"=categories.id`);
        }
        res.send(games.rows)
    }
    catch(error)
    {
        res.status(500).send(error)
    }     
})

app.post('/games', async (req, res) => {
    try
    {
        let { name, image, stockTotal, categoryId, pricePerDay } = req.body;
        let stockTotalInt = parseInt(stockTotal);
        pricePerDay = parseInt(pricePerDay);
        if (!name || stockTotalInt <= 0 || pricePerDay <= 0 || !stockTotalInt || !pricePerDay)
        {
            return res.sendStatus(400);
        }
        const gamesWithBodyName = await connection.query('SELECT * FROM games WHERE name=$1', [name]);
        if (gamesWithBodyName.rows.length != 0) 
        {
            return res.sendStatus(409);
        }
        await connection.query(`
        INSERT INTO
        games (name, image, "stockTotal", "categoryId", "pricePerDay")
        VALUES ($1, $2, $3, $4, $5)`,
        [name, image, stockTotal, categoryId, pricePerDay]);                                   
        return res.sendStatus(201);
    }
    catch(error)
    {
        res.status(500).send(error)
    }  
})



app.listen(port);


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

app.listen(port);


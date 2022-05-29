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

app.get('/customers', async (req, res) => {
    try
    {
        const queryCpf = req.query.cpf;
        let customers
        if (queryCpf)
        {
            customers = await connection.query(`SELECT * FROM customers WHERE cpf LIKE $1`, [`${queryCpf}%`]);
        }
        else
        {
            customers = await connection.query('SELECT * FROM customers');
        }
        res.send(customers.rows)
    }
    catch(error)
    {
        res.status(500).send(error)
    }
})

app.get('/customers/:id', async (req, res) => {
    try
    {
        const id = req.params.id;
        const customers = await connection.query('SELECT * FROM customers WHERE id=$1', [id])
        if ( customers.rows.length === 0 )
        {
            return res.sendStatus(404);
        }
        return res.send(customers.rows)
    }
    catch(error)
    {
        res.status(500).send(error)
    }
})

app.post('/customers', async (req, res) => {
    try
    {
        let { name, phone, cpf, birthday } = req.body;
        const customerSchema = joi.object({
            name: joi.string().required(),
            phone: joi.string().pattern(/^[0-9]{10,11}$/).required(),
            cpf: joi.string().pattern(/^[0-9]{11}$/).required(),
            birthday: joi.date().required()
        });
        const customer = {name, phone, cpf, birthday};
        const validation = customerSchema.validate(customer);
        if (validation.error)
        {
            return res.sendStatus(400)
        }
        const userWithBodyCpf = await connection.query('SELECT * FROM customers WHERE cpf=$1', [cpf]);
        if ( userWithBodyCpf.rows.length != 0)
        {
            return res.sendStatus(409)
        }
        await connection.query(`
        INSERT INTO
        customers (name, phone, cpf, birthday)
        VALUES ($1, $2, $3, $4)`,
        [name, phone, cpf, birthday]);
        return res.sendStatus(201)
    }
    catch(error)
    {
        res.status(500).send(error)
    }
})

app.put('/customers/:id', async (req, res) => {
    try
    {
        const id = req.params.id;
        let { name, phone, cpf, birthday } = req.body;
        const customerSchema = joi.object({
            name: joi.string().required(),
            phone: joi.string().pattern(/^[0-9]{10,11}$/).required(),
            cpf: joi.string().pattern(/^[0-9]{11}$/).required(),
            birthday: joi.date().required()
        });
        const customer = {name, phone, cpf, birthday};
        const validation = customerSchema.validate(customer);
        if (validation.error)
        {
            return res.sendStatus(400)
        }
        const userWithBodyCpf = await connection.query('SELECT * FROM customers WHERE cpf=$1', [cpf]);
        if ( userWithBodyCpf.rows.length != 0)
        {
            return res.sendStatus(409)
        }
        await connection.query(`
        UPDATE
        customers SET name=$1, phone=$2, cpf=$3, birthday=$4
        WHERE id=$5`,
        [name, phone, cpf, birthday, id]);
        return res.sendStatus(200);
    }
    catch(error)
    {
        res.status(500).send(error)
    }
})

app.listen(port);


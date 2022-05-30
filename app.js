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

app.get('/rentals', async (req, res) => {
    try
    {
        let queryCustomer = req.query.customerId;
        let queryGame = req.query.gameId;
        let rentals;
        if ( queryCustomer )
        {
            rentals = await connection.query({
                text:`
                SELECT
                rentals.*,
                customers.id as "customerId",
                customers.name as "customerName",
                games.id as "gameId",
                games.name as "gameName",
                games."categoryId" as "gamesCategoryId",
                categories.name as "gamesCategoryName"
                FROM
                rentals
                JOIN customers ON rentals."customerId"=customers.id
                JOIN games ON rentals."gameId"=games.id
                JOIN categories ON games."categoryId"=categories.id
                WHERE rentals."customerId" = $1
                `,
                rowMode: 'array'
            }, [queryCustomer])
        }
        else if (queryGame)
        {
            rentals = await connection.query({
                text:`
                SELECT
                rentals.*,
                customers.id as "customerId",
                customers.name as "customerName",
                games.id as "gameId",
                games.name as "gameName",
                games."categoryId" as "gamesCategoryId",
                categories.name as "gamesCategoryName"
                FROM
                rentals
                JOIN customers ON rentals."customerId"=customers.id
                JOIN games ON rentals."gameId"=games.id
                JOIN categories ON games."categoryId"=categories.id
                WHERE rentals."gameId" = $1
                `,
                rowMode: 'array'
            }, [queryGame]) 
        }
        else
        {
        rentals = await connection.query({
            text:`
            SELECT
            rentals.*,
            customers.id as "customerId",
            customers.name as "customerName",
            games.id as "gameId",
            games.name as "gameName",
            games."categoryId" as "gamesCategoryId",
            categories.name as "gamesCategoryName"
            FROM
            rentals
            JOIN customers ON rentals."customerId"=customers.id
            JOIN games ON rentals."gameId"=games.id
            JOIN categories ON games."categoryId"=categories.id
            WHERE rentals."customerId" = 1
            `,
            rowMode: 'array'
            })
        }
        res.send(rentals.rows.map(row => {
    
            const [id, customerId, gameId, rentDate, daysRented, returnDate, originalPrice, delayFee, customerName, gameName, gamesCategoryId, gamesCategoryName] = row;
    
            return {
                id, customerId, gameId, rentDate, daysRented, returnDate, originalPrice, delayFee, 
                customer: {id: customerId, name: customerName}, 
                game: {id: gameId, name: gameName, categoryId: gamesCategoryId, categoryName: gamesCategoryName}
            }
        }));
    }
    catch(error)
    {
        res.status(500).send(error)
    }
})

app.post('/rentals', async (req, res) => {
    try
    {
        const { customerId, gameId, daysRented } = req.body;
        const rentDate = dayjs().format('YYYY-MM-DD');
        let games = await connection.query('SELECT * FROM games WHERE id=$1', [gameId]);
        let customers = await connection.query('SELECT * FROM customers WHERE id=$1', [customerId]);
        let activeRentals = await connection.query('SELECT * FROM rentals WHERE "gameId"=$1', [gameId]);
        let stock = games.rows[0].stockTotal;
        if ( customers.rows.length === 0 || games.rows.length === 0 || daysRented <= 0 || activeRentals.rows.length >= stock )
        {
            return res.sendStatus(400);
        }
        let price = games.rows[0].pricePerDay;
        const originalPrice = price * daysRented;
        const returnDate = null;
        const delayFee = null;
        await connection.query(`
        INSERT INTO
        rentals ("customerId", "gameId", "rentDate", "daysRented", "returnDate", "originalPrice", "delayFee")
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [customerId, gameId, rentDate, daysRented, returnDate, originalPrice, delayFee]);
        res.sendStatus(201);
    }
    catch(error)
    {
        res.status(500).send(error)
    }
})

app.post('/rentals/:id/return', async (req, res) => {
    try
    {
        const id = req.params.id;
        const rental = await connection.query('SELECT * FROM rentals WHERE id = $1', [id]);
        if (rental.rows.length === 0)
        {
            return res.sendStatus(404)
        }
        if (rental.rows[0].returnDate != null)
        {
            return res.sendStatus(400)
        }
        const rentalDate = dayjs(rental.rows[0].rentDate).format('YYYY-MM-DD');
        const difference = dayjs().diff(rentalDate, 'day');
        const game = await connection.query('SELECT * FROM games WHERE id = $1', [rental.rows[0].gameId])
        let delayFee = game.rows[0].pricePerDay * difference;
        let returnDate = dayjs().format('YYYY-MM-DD');
        delayFee = delayFee.toString();
        console.log(returnDate);
        console.log(delayFee.toString());
        await connection.query(`
        UPDATE
        rentals SET "returnDate" = $1, "delayFee" = $1
        WHERE id=$2`,
        [returnDate,  id]);
        return res.sendStatus(200);
    }
    catch(error)
    {
        res.status(500).send(error)
    }
})

app.delete('/rentals/:id', async (req, res) => {
    try
    {
        const id = req.params.id;
        const rental = await connection.query('SELECT * FROM rentals WHERE id = $1', [id]);
        if (rental.rows.length === 0)
        {
            return res.sendStatus(404)
        }
        if (rental.rows[0].returnDate != null)
        {
            return res.sendStatus(400)
        }
        await connection.query(`DELETE FROM rentals WHERE id = $1`, [id]);
        return res.sendStatus(200);
    }
    catch(error)
    {
        res.status(500).send(error)
    }
})

app.listen(port);


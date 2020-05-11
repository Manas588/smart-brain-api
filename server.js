const express = require('express');
const cors = require('cors');
const knex = require('knex');
const bycrypt = require("bcrypt-nodejs"); 
const Clarifai = require('clarifai');

const db = knex({
    client: 'pg',
    connection: {
      host : '127.0.0.1',
      user : 'postgres',
      password : 'test',
      database : 'smart_brain'
    }
  });

// db.select('*').from('users')
// .then(data=> console.log(data)).catch(err=>console.log(err));

const app = express();

app.use(express.json());
app.use(cors());


app.get('/', (req, res)=> {
    res.json(database.users);
});
app.post('/signin', (req,res)=> {
    const { name, email, password} = req.body;
    if (!email  || !password) {
        return res.status(400).json('Incorrect Form Submission');
    }
    db.select('email','hash').from('login')
    .where('email', '=', email)
    .then(data => {
        const isValid = bycrypt.compareSync(password, data[0].hash);
        if (isValid) {
            db.select('*').from('users').where('email', '=', email)
            .then(user => res.json(user[0]))
            .catch(err => res.status(400).json('user not found'))

        } else {
            res.json("Invalid Password");
        }
    }).catch(err => res.status(400).json('Invalid credentials'))
    
});
app.post('/register', (req,res)=> {
    const { name, email, password} = req.body;
    if (!email || !name || !password) {
        return res.status(400).json('Incorrect Form Submission');
    }
    const hash = bycrypt.hashSync(password);
    db.transaction(trx=>{
        trx.insert({
            hash: hash,
            email: email
        })
        .into('login')
        .returning('email')
        .then(loginEmail => {
          return trx('users')
            .returning('*')
            .insert({
                    name: name,
                    email: loginEmail[0],
                    joined: new Date()
            })
            .then(user => res.json(user[0]))
            
        })
        .then(trx.commit)
        .catch(trx.rollback)
    }).catch(err =>res.status(400).json('User Already Exists!!'));
    
});

app.get('/profile/:id', (req, res) => {
    const {id} = req.params;
    db.select('*').from('users').where({id})
        .then(user => {
            if(user.length) {
                res.json(user[0])
            } else {
                res.status(400).json('Not found');
            }
        })
        .catch(err => res.status(400).json('Error Finding User!'));
    });

app.put('/image', (req, res) => {
    const {id} = req.body;
    db('users').where('id' ,'=', id).increment('entries', 1)
    .returning('entries')
    .then(entries => {
        res.json(entries[0]);
    })
    .catch(err => res.status(400).json('Error uodating entries'));
    });

app.post('/imageurl', (req, res) => {
    const app = new Clarifai.App({
        apiKey: '73e8326fcef445ff88a7365601479aa5'
       });
    app.models.predict(Clarifai.FACE_DETECT_MODEL, req.body.input)
    .then(data => res.json(data))
    .catch(err => res.status(400).json("unable to work with clarifai"));
})

app.listen('3001');
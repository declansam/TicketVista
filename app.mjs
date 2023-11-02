
import "./config.mjs";
import "./db.mjs";

// relevant libraries
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url';
import session from 'express-session';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// static files
app.use(express.static(path.join(__dirname, 'public')));

// hbs setup
app.set('view engine', 'hbs');

// body parser
app.use(express.urlencoded({ extended: false }));

// express session
const sessionOptions = {
    secret:  'unbreakable secret',
    resave: false,
    saveUninitialized: false
};
app.use(session(sessionOptions));


// routes -> homepage
app.get('/', (req, res) => {

    const title = "Welcome to TicketVista's Homepage!"
    res.render('home', {title});

});


app.listen(process.env.PORT || 3000);


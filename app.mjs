
//- ======================================================================
import "./config.mjs";
import "./db.mjs";

// relevant libraries
import path from 'path';
import { fileURLToPath } from 'url';

import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';



// express setup
const app = express();

// static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

// hbs setup
app.set('view engine', 'hbs');

// body parser
app.use(express.urlencoded({ extended: false }));

// express session
const sessionOptions = {
    secret: process.env.SESSIONSECRET,
    resave: false,
    saveUninitialized: false
};
app.use(session(sessionOptions));


// models
const User = mongoose.model("User");
const Event = mongoose.model("Event");
//- =====================================================================


// helper function to get the name of the user
const getPageName = async (username) => {
    try {
        const pattern = new RegExp(`^${username}$`, 'i');
        const userFound = await User.findOne({ username: pattern });

        if (userFound) {
            const retName = userFound.name;
            return retName.toUpperCase();
        }
    } catch (e) {
        console.log("Error in middleware: ", e);
    }
    return 'guest';
};

// middleware to check if user is logged in
// if the user is logged in, then display the name of the user in the navbar; otherwise, display 'guest'
app.use(async (req, res, next) => {
    
    res.locals.pageName = req.session.username ? await getPageName(req.session.username) : 'Guest';
    if (res.locals.pageName === 'Guest') {
        res.locals.isLoggedIn = false;
    }
    else {
        res.locals.isLoggedIn = true;
    }
    
    next();
});




// route -> homepage
app.get('/', async (req, res) => {

    const title = "Homepage!";
    const username = req.session.username;


    try {

        const pattern = new RegExp(`^${username}$`, 'i');
        const userFound = await User.findOne({username: pattern});

        if (userFound) {
            req.session.pageName = userFound.name; 
        }
    }
    catch(e) {
        console.log("Error in Homepage: ", e);
    }

    res.render('home', {title});

});


// route -> register a new user
app.post('/register', async (req, res) => {

    const pattern = new RegExp(`^${req.body.username}$`, 'i');
    const userFound = await User.findOne({username: pattern});

    if (userFound) {
        res.render('register', {error: 'User already exists'});
    }
    else {

        try {

            const u = new User({

                // TODO: sanitize username
                // TODO: hash password
                name: req.body.name,
                username: req.body.username,
                hash: req.body.password,
                admin: req.body.admin
                
            });

            const savedUser = await u.save();
            console.log(savedUser);

            // session management
            req.session.username = savedUser.username;
        
            res.redirect('/');
        }
        catch(e) {
            res.render('register', {error: "Couldn't register user"});
        }
    }

});


app.get('/register', (req, res) => {
    res.render('register');
});




// route -> login
app.post('/login', async (req, res) => {

    const username = req.body.username;
    const password = req.body.password;

    const pattern = new RegExp(`^${username}$`, 'i');
    const userFound = await User.findOne({username: pattern});

    if (userFound) {

        if (userFound.hash === password) {

            // session management
            req.session.username = userFound.username;

            res.redirect('/');
        }
        else {
            res.render('login', {error: 'Incorrect password'});
        }
    }
    else {
        res.render('login', {error: 'User not found'});
    }

});

app.get('/login', (req, res) => {
    res.render('login');
});



// route -> logout
app.post('/logout', (req, res) => {
    
    // Clear the user's session
    req.session.destroy((err) => {
        
        if (err) {
            console.error("Error destroying session:", err);
        } else {
            res.redirect('/');
        }

    });
});


app.get('/logout', (req, res) => {
    res.render('logout');
});




// route -> ADMIN VIEW
app.get('/admin/events', async (req, res) => {

    const username = req.session.username;
    const pattern = new RegExp(`^${username}$`, 'i');
    const title = "Admin View";

    try {
        
        const userFound = await User.findOne({username: pattern});

        if (userFound) {
            
            // If correct admin
            if (userFound.admin) {

                // Get all events from the database
                let allEvents = await Event.find({});
                let filteredEvents = {};

                // If query parameter(s) is(are) present, add it(them) to the filteredEvents object
                if (req.query.title) {
                    filteredEvents.title = { $regex: new RegExp(req.query.title, 'i') };
                }
                
                if (req.query.price) {
                    filteredEvents.price = req.query.price;
                }

                // Finding relevant events from the database -- based on query values
                allEvents = await Event.find(filteredEvents);

                // render admin.hbs with filtered events (if any)
                res.render('admin', {title, events: allEvents});
            }

            // if not admin
            else {
                const error = "403 Forbidden";
                res.render('admin', {error});
            }
        }

        // if user not found
        else {
            const error = "403 Forbidden";
            res.render('admin', {error});
        }

    }
    catch(err) {
        console.log("Error in Admin View: ", err);
    }

});





// route -> ADMIN: NEW EVENT
app.get('/admin/newEvent', async (req, res) => {

    const username = req.session.username;
    const pattern = new RegExp(`^${username}$`, 'i');
    const title = "Create New Event";

    try {
        
        const userFound = await User.findOne({username: pattern});

        if (userFound) {
            
            // If correct admin
            if (userFound.admin) {
                res.render('newEvent', {});
            }

            // if not admin
            else {
                const error = "403 Forbidden";
                res.render('newEvent', {error});
            }
        }

        // if user not found
        else {
            const error = "403 Forbidden";
            res.render('newEvent', {error});
        }

    }
    catch(err) {
        console.log("Error in Admin Add Event: ", err);
    }

});


app.post('/admin/newEvent', async (req, res) => {

    // Get the data from the form
    const title = req.body.title;
    const date = req.body.date;
    const venue = req.body.venue;
    const price = req.body.price;
    const description = req.body.description;
    const numUsers = 0;

    // Add the event to the database
    try {

        const newEvent = new Event({
                        title: title,
                        date: date,
                        venue: venue,
                        price: price,
                        description: description,
                        numUsers: numUsers
        });
        
        const savedEvent = await newEvent.save();
        console.log(savedEvent);

        // redirect to the homepage
        res.redirect('/admin/events');              
    }
    catch (err) {
        res.status(500).send("Error: " + err);
    }

});



//-----------------------------------------------------------------------------
app.listen(process.env.PORT || 3000);
//-----------------------------------------------------------------------------

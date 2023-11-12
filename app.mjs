
//- ======================================================================
import "./config.mjs";
import "./db.mjs";
import "./passport-config.mjs"

// relevant libraries
import path from 'path';
import { fileURLToPath } from 'url';

import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';

// express setup
const app = express();

// static files, hbs & body parser
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'hbs');
app.use(express.urlencoded({ extended: false }));


// express session
const sessionOptions = {
    secret: process.env.SESSIONSECRET,
    resave: false,
    saveUninitialized: false
};
app.use(session(sessionOptions));

// passport
import passport from 'passport';
import flash from "express-flash";
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());


// models
const User = mongoose.model("User");
const Event = mongoose.model("Event");
//- =====================================================================


// Global variables
let isAdmin = false;

// middleware to check if user is logged in --> BUT using passport instead
app.use((req, res, next) => {

    if (req.isAuthenticated()) {
        req.session.username = req.user.username;
    }
    
    next();
});


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


// middleware to check if user is admin and set the global variable 'isAdmin' accordingly
app.use(async (req, res, next) => {

    // retrieve the username from the session
    res.locals.currUser = req.session.username;
    const pattern = new RegExp(`^${res.locals.currUser}$`, 'i');

    // if the user is logged in, then check if the user is admin
    if (res.locals.currUser) {

        // search for the user in the database and assign the value of 'admin' to the global variable 'isAdmin'
        try {
            const userFound = await User.findOne({username: pattern});
            
            if (userFound) {
                res.locals.isAdmin = userFound.admin;
            }
            else {
                res.locals.isAdmin = false;
            }

            isAdmin = res.locals.isAdmin;

        }
        catch(e) {
            console.log("Error in Admin middleware: ", e);
        }
    }
    else {
        isAdmin = false;
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
            isAdmin = savedUser.admin;

            res.redirect('/');
        }
        catch(e) {
            isAdmin = false;
            res.render('register', {error: "Couldn't register user"});
        }
    }

});


app.get('/register', (req, res) => {
    res.render('register');
});


app.post(
    
    '/login',
    
    passport.authenticate('local', {
        
        successRedirect: '/',
        failureRedirect: '/login',
        failureFlash: true

    }),



);


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
            isAdmin = false;
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

        if (userFound && userFound.admin) {
            
            // Get all events from the database
            let allEvents = await Event.find({});
            const filteredEvents = {};

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

        // if user not found or is not admin
        else {
            const error = "403 Forbidden";
            isAdmin = false;
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

    try {
        
        const userFound = await User.findOne({username: pattern});

        // if user exists and is admin
        if (userFound && userFound.admin) {
            res.render('newEvent', {});
        }

        // if user not found or is not admin
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
    
    try {
        
        // Get the username of the admin
        const addedByUser = req.session.username;
        const userFound = await User.findOne({ username: addedByUser });

        // If admin not found
        if (!userFound) {
            res.status(404).send("Admin not found");
            return;
        }

        // fields retreived from the form
        const fields = ['title', 'date', 'venue', 'price', 'description'];

        // use reduce to create an object with the fields and their values
        const eventData = fields.reduce((data, field) => {

            if (!req.body[field]) {
                res.status(400).send(`Missing ${field} in request body`);
                throw new Error(`Missing ${field} in request body`);
            }

            data[field] = req.body[field];
            return data;

        }, {} );

        // Create a new event object
        const newEvent = new Event({
            ...eventData,
            numUsers: 0,
            addedBy: userFound._id,
        });

        // Save the event to the database
        const savedEvent = await newEvent.save();
        console.log(savedEvent);

        // Update the 'addedEvents' array of the user
        userFound.addedEvents.push(savedEvent._id);
        await userFound.save();

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

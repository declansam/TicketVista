
//- ==================================== SETUP =====================================
import "./config.mjs";
import "./db.mjs";
import "./passport-config.mjs";

// relevant libraries
import path from 'path';
import { fileURLToPath } from 'url';

import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import passport from 'passport';
import flash from "express-flash";
import bcrypt from 'bcryptjs';

// express setup
const app = express();

// MIDDLEWARE SETUP
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


// passport middleware
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());


// import routes
import aRoutes from './routes/admin.mjs';
import uRoutes from './routes/user.mjs';


// models
const User = mongoose.model("User");

//- =================================================================================





// Global variables
let isADMIN = false;




//- ============================== MIDDLEWARE========================================

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

            isADMIN = res.locals.isAdmin;

        }
        catch(e) {
            console.log("Error in Admin middleware: ", e);
        }
    }
    else {
        isADMIN = false;
    }
    
    console.log("isAdmin: ", isADMIN);
    next();
});


// route -> homepage
app.get('/', async (req, res) => {

    const title = "Homepage!";
    const username = req.session.username;
    let isRegularUser = false;


    try {

        const pattern = new RegExp(`^${username}$`, 'i');
        const userFound = await User.findOne({username: pattern});

        if (userFound) {
            req.session.pageName = userFound.name;
            isRegularUser = !userFound.admin;
        }
    }
    catch(e) {
        console.log("Error in Homepage: ", e);
    }

    if (!isRegularUser) {
        res.render('home', {title} );
    }
    else {
        res.render('home', {title, username: username} );
    }

});


// route -> register a new user
app.post('/register', async (req, res) => {

    const pattern = new RegExp(`^${req.body.username}$`, 'i');
    const userFound = await User.findOne({username: pattern});

    // reCAPTCHA verification - make it mandatory to register
    const recaptchaResponse = req.body['g-recaptcha-response'];
    const secretkey = process.env.RECAPTCHASECRETKEYREG;
    const recaptchaVerificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretkey}&response=${recaptchaResponse}`;

    try {

        // Verify reCAPTCHA
        const recaptchaVerificationResult = await fetch(recaptchaVerificationUrl, {
            method: 'POST',
        });

        const recaptchaData = await recaptchaVerificationResult.json();

        // If reCAPTCHA verification failed, return an error
        // render the register page with (1) API KEY -> to rensure reCAPTCHA is displayed
        // (2) formData -> to ensure that the user doesn't have to re-enter the data
        if (!recaptchaData.success) {
            const recaptchaAPIKey = process.env.RECAPTCHASITETKEYREG;
            return res.render('register', { error: 'reCAPTCHA verification failed', recaptchaAPIKey, formData: req.body });
        }

    } catch (error) {
        console.error('Error verifying reCAPTCHA:', error);
        const recaptchaAPIKey = process.env.RECAPTCHASITETKEYREG;
        return res.render('register', { error: 'Error verifying reCAPTCHA', recaptchaAPIKey, formData: req.body});
    }


    // verifying if user already exists
    if (userFound) {
        const recaptchaAPIKey = process.env.RECAPTCHASITETKEYREG;
        res.render('register', {error: 'User already exists', recaptchaAPIKey, formData: req.body});
    }
    else {

        try {

            const u = new User({

                name: (req.body.name),
                username: req.body.username,
                hash: await bcrypt.hash(req.body.password, 10),
                admin: req.body.admin
                
            });

            const savedUser = await u.save();
            console.log(savedUser);

            // session management
            req.session.username = savedUser.username;
            isADMIN = savedUser.admin;

            res.redirect('/');
        }
        catch(e) {
            isADMIN = false;
            const recaptchaAPIKey = process.env.RECAPTCHASITETKEYREG;
            res.render('register', {error: "Couldn't register user", recaptchaAPIKey, formData: req.body});
        }
    }

});


app.get('/register', (req, res) => {
    const recaptchaAPIKey = process.env.RECAPTCHASITETKEYREG;
    res.render('register', { recaptchaAPIKey: recaptchaAPIKey });
});


// route -> login
// using passport.js
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
            isADMIN = false;
            res.redirect('/');
        }

    });
});


app.get('/logout', (req, res) => {
    res.render('logout');
});


// Routes for admin
app.use('/admin', aRoutes);

// Routes for user
app.use('/u', uRoutes);



//-----------------------------------------------------------------------------
app.listen(process.env.PORT || 3000);
//-----------------------------------------------------------------------------

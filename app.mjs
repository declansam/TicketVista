
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
            const retName = userFound.username;
            return retName;
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

// Route -> register
// using passport.j
app.post(
    
    '/register',

    // Middleware to authenticate the user
    (req, res, next) => {
        
        passport.authenticate('register', (err, user, info) => {
            
            if (err || !user) {
                
                // Check if info is defined and has renderData --> retrieve error and formData
                const { error, formData } = (info && info.renderData) || {};
                const recaptchaAPIKey = process.env.RECAPTCHASITETKEYREG;
                
                // Render the 'register' template with error information
                // Pass fromData to the template to repopulate the form
                // Pass recaptchaAPIKey to the template to render the reCAPTCHA widget
                return res.render('register', { error: error || 'Registration failed', recaptchaAPIKey, formData });
            }

            // Continue with successful registration
            req.login(user, (err) => {
                
                // in case of error, pass the error to the next middleware
                if (err) {
                    return next(err);
                }

                // Redirect to homepage after successful registration
                return res.redirect('/');
            });

        })(req, res, next);
    }
);


app.get('/register', (req, res) => {
    const recaptchaAPIKey = process.env.RECAPTCHASITETKEYREG;
    res.render('register', { recaptchaAPIKey: recaptchaAPIKey });
});


// Route -> signup (i.e. doesn't have access to select the admin option)
// using passport.j
app.post(
    
    '/signup',

    // Middleware to authenticate the user
    (req, res, next) => {
        
        passport.authenticate('signup', (err, user, info) => {
            
            if (err || !user) {
                
                // Check if info is defined and has renderData --> retrieve error and formData
                const { error, formData } = (info && info.renderData) || {};
                const recaptchaAPIKey = process.env.RECAPTCHASITETKEYREG;
                
                // Render the 'signup' template with error information
                // Pass fromData to the template to repopulate the form
                // Pass recaptchaAPIKey to the template to render the reCAPTCHA widget
                return res.render('signup', { error: error || 'Registration failed', recaptchaAPIKey, formData });
            }

            // Continue with successful registration
            req.login(user, (err) => {
                
                // in case of error, pass the error to the next middleware
                if (err) {
                    return next(err);
                }

                // Redirect to homepage after successful registration
                return res.redirect('/');
            });

        })(req, res, next);
    }
);


app.get('/signup', (req, res) => {
    const recaptchaAPIKey = process.env.RECAPTCHASITETKEYREG;
    res.render('signup', { recaptchaAPIKey: recaptchaAPIKey });
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


// route -> credits page
app.get('/credits', (req, res) => {
    res.render('credits');
});



// Routes for admin
app.use('/admin', aRoutes);

// Routes for user
app.use('/u', uRoutes);



//-----------------------------------------------------------------------------
app.listen(process.env.PORT || 3000);
//-----------------------------------------------------------------------------

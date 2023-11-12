
import "./db.mjs";

import passport from 'passport';
import LocalStrategy from 'passport-local';
import mongoose from 'mongoose';

const User = mongoose.model("User");


// callback functions and passport configuration
const inputData = {
    usernameField: 'username',
    passwordField: 'password'
};


const verifyCallback = async (username, password, done) => {
    
    try {
        
        const pattern = new RegExp(`^${username}$`, 'i');
        const user = await User.findOne({username: pattern});

        if (!user) {
            return done(null, false, { message: 'Incorrect username.' });
        }

        if (user.hash !== password) {
            return done(null, false, { message: 'Incorrect password.' });
        }

        return done(null, user);

    } 
    catch (err) {

        return done(err);

    }

};

// Passport configuration -> LocalStrategy to authenticate users using username and password
const strategy = new LocalStrategy(inputData, verifyCallback);
passport.use(strategy);


// Passport configuration -> serializeUser used to store user id in session
passport.serializeUser((user, done) => {

    done(null, user.id);

});

// Passport configuration -> deserializeUser used to retrieve user from session
passport.deserializeUser(async (id, done) => {
  
    try {
        const user = await User.findById(id);
        done(null, user);
    } 
    catch (err) {
        done(err);
    }

});

export default passport;
